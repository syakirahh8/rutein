import { useEffect, useMemo, useRef, useState } from 'react';
import { getActiveDisruptions } from '@/services/transportService';
import type { Disruption } from '@/types/database.types';
import type { ConfusedModeLocation } from '@/types/confusedMode.types';

import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { useReverseGeocodedLocation } from '@/hooks/useReverseGeocodedLocation';
import { useNearbyContext } from '@/hooks/useNearbyContext';
import { useRestoredNavigationContext } from '@/hooks/useRestoredNavigationContext';
import { useConfusedModeChat } from '@/hooks/useConfusedModeChat';
import { buildConfusedModeAIContext } from '@/lib/buildConfusedModeAIContext';
import { detectNavigationIntent } from '@/lib/detectNavigationIntent';
import { resolveNavigationForQuery } from '@/lib/resolveNavigationForQuery';
import { AssistantMessageContent } from '@/components/AssistantMessageContent';

const QUICK_ACTIONS = [
  "I don't know where I am.",
  'TransJakarta near me',
  'Find an Indomaret near me',
  'What transportation should I take?',
  'How do I get home?',
];

export default function ConfusedMode() {
  const { position, loading: locationLoading, error: locationError } = useCurrentLocation();
  const { address, addressVerified, loading: addressLoading } = useReverseGeocodedLocation(position);
  const {
    places: nearbyPlaces,
    transport: nearbyTransport,
    placesStatus,
    transportStatus,
  } = useNearbyContext(position);
  const { route: currentRoute, destination, selectedMapPlace } = useRestoredNavigationContext();
  const { messages, sending, sendMessage } = useConfusedModeChat();

  const [disruptions, setDisruptions] = useState<Disruption[]>([]);
  const [input, setInput] = useState('');
  // True only while resolveNavigationForQuery() is running — distinct from
  // `sending`, which covers the actual Edge Function round trip that
  // starts afterward.
  const [resolvingRoute, setResolvingRoute] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getActiveDisruptions()
      .then(setDisruptions)
      .catch((error) => {
        console.error('Failed to fetch disruptions:', error);
      });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending, resolvingRoute]);

  const location: ConfusedModeLocation | null = useMemo(() => {
    if (!position) return null;

    return {
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      address,
      addressVerified,
    };
  }, [position, address, addressVerified]);

  // Baseline context — everything except this-turn's navigation
  // resolution, which is computed fresh per message in handleSend below
  // since it depends on the message text itself.
  const baseAIContext = useMemo(
    () =>
      buildConfusedModeAIContext({
        location,
        addressLoading,
        nearbyPlaces,
        nearbyTransport,
        placesStatus,
        transportStatus,
        disruptions,
        route: currentRoute,
        destination,
        selectedMapPlace,
      }),
    [
      location,
      addressLoading,
      nearbyPlaces,
      nearbyTransport,
      placesStatus,
      transportStatus,
      disruptions,
      currentRoute,
      destination,
      selectedMapPlace,
    ]
  );

  const nearbyBlocking =
    (placesStatus === 'loading' || transportStatus === 'loading') &&
    nearbyPlaces.length === 0 &&
    nearbyTransport.length === 0;

  function getLocationStatus() {
    if (locationLoading) return '📍 Detecting location...';
    if (location) return '📍 Live location connected';
    return '📍 Location unavailable';
  }

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending || resolvingRoute) return;

    setInput('');

    const intent = detectNavigationIntent(trimmed);
    let finalContext = baseAIContext;

    if (intent.isRouteRequest && intent.destinationQuery) {
      setResolvingRoute(true);

      try {
        const { status, navigationResult } = await resolveNavigationForQuery(
          intent.destinationQuery,
          position,
          location?.address ?? null
        );

        finalContext = {
          ...baseAIContext,
          navigationResolutionStatus: status,
          navigationResult,
        };
      } finally {
        setResolvingRoute(false);
      }
    }

    void sendMessage(trimmed, finalContext);
  }

  const inputDisabled = sending || resolvingRoute;

  return (
    <div
      className="container"
      style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 70px)', maxWidth: 900 }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ marginBottom: 4 }}>Confused Mode</h1>

        <p style={{ color: 'var(--color-text-muted)', marginTop: 0, marginBottom: 12 }}>
          Your Rutein navigation assistant. Ask where you are, what to take, or where to go next.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <span className="badge badge-success">AI connected</span>
          <span className="badge">{getLocationStatus()}</span>
          <span className="badge">
            ⚠ {disruptions.length} active disruption{disruptions.length === 1 ? '' : 's'}
          </span>

          {nearbyBlocking && <span className="badge">🗺 Loading nearby map data...</span>}
          {!nearbyBlocking && (nearbyPlaces.length > 0 || nearbyTransport.length > 0) && (
            <span className="badge">🗺 Map context ready</span>
          )}
        </div>
      </div>

      {/* LOCATION ERROR */}
      {locationError && (
        <div className="card" style={{ marginBottom: 12, border: '1px solid var(--color-border)' }}>
          <p style={{ margin: 0, fontSize: 13 }}>{locationError}</p>
        </div>
      )}

      {/* NEARBY DATA ERRORS */}
      {placesStatus === 'error' && (
        <div className="card" style={{ marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Couldn't load nearby shops right now. Transit data is unaffected.
          </p>
        </div>
      )}

      {transportStatus === 'error' && (
        <div className="card" style={{ marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Couldn't load nearby transit right now. Nearby shops are unaffected.
          </p>
        </div>
      )}

      {/* CONTEXT STATUS */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 14,
          fontSize: 11,
          color: 'var(--color-text-muted)',
          marginBottom: 14,
        }}
      >
        {location && (
          <span>
            GPS: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            {location.accuracy ? ` ±${Math.round(location.accuracy)}m` : ''}
            {location.address ? ` — ${location.address}` : ''}
          </span>
        )}

        <span>Nearby places: {nearbyPlaces.length}</span>
        <span>Nearby transport: {nearbyTransport.length}</span>

        {currentRoute && <span>Active route: {currentRoute.destinationName ?? 'Yes'}</span>}
      </div>

      {/* CHAT */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginBottom: 16,
          paddingRight: 4,
        }}
      >
        {messages.length === 0 && (
          <div>
            <div className="card" style={{ marginBottom: 14 }}>
              <p style={{ marginTop: 0, marginBottom: 6, fontWeight: 600 }}>Need a hand?</p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
                I can use your current Rutein location, nearby map data, transportation
                information, and active disruptions to help you figure out what to do — including
                looking up an actual route if you tell me where you're headed.
              </p>
            </div>

            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 10 }}>
              {nearbyBlocking ? 'Try asking (loading nearby map data, one moment)...' : 'Try asking:'}
            </p>

            <div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}
            >
              {QUICK_ACTIONS.map((question) => (
                <button
                  key={question}
                  className="btn btn-outline"
                  style={{ textAlign: 'left', minHeight: 46 }}
                  onClick={() => handleSend(question)}
                  disabled={inputDisabled || nearbyBlocking}
                  title={nearbyBlocking ? 'Waiting for nearby map data to finish loading' : undefined}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className="card"
            style={{
              maxWidth: '85%',
              alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
              background: message.role === 'user' ? 'var(--color-primary-dim)' : 'var(--color-surface)',
            }}
          >
            {message.role === 'assistant' ? (
              <AssistantMessageContent content={message.content} />
            ) : (
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                {message.content}
              </p>
            )}
          </div>
        ))}

        {resolvingRoute && (
          <div className="card" style={{ maxWidth: 220, padding: '10px 14px' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
              Finding your route...
            </span>
          </div>
        )}

        {sending && !resolvingRoute && (
          <div className="card" style={{ maxWidth: 160, padding: '10px 14px' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Rutein is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSend(input);
        }}
        style={{ display: 'flex', gap: 8 }}
      >
        <input
          className="input"
          placeholder={
            location ? 'Ask where you are, what to take, or where to go...' : 'Type your question...'
          }
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={inputDisabled}
          autoComplete="off"
        />

        <button
          className="btn btn-primary"
          type="submit"
          disabled={inputDisabled || !input.trim() || nearbyBlocking}
        >
          {resolvingRoute ? 'Routing...' : sending ? 'Thinking...' : 'Send'}
        </button>
      </form>
    </div>
  );
}