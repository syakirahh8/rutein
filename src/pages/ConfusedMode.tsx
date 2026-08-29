import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  sendConfusedModeMessage,
  SUGGESTED_EMERGENCY_QUESTIONS,
  type ConfusedModeMessage,
  type ConfusedModeLocation,
} from '@/services/confusedModeService';
import { getActiveDisruptions } from '@/services/transportService';
import { reverseGeocode } from '@/services/geocodingService';
import type { Disruption } from '@/types/database.types';

/* ============================================================
   TYPES
============================================================ */

interface NearbyPlace {
  name: string;
  category?: string;
  latitude: number;
  longitude: number;
  distance?: number;
  address?: string;
}

interface NearbyTransport {
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  distance?: number;
  address?: string;
}

interface RouteStep {
  instruction: string;
  distance?: number;
}

interface CurrentRoute {
  destinationName?: string;
  distance?: number;
  duration?: number;
  steps?: RouteStep[];
}

/* ============================================================
   HELPERS
============================================================ */

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const earthRadius = 6371000;

  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

function formatDistance(distance?: number): string {
  if (distance === undefined || !Number.isFinite(distance)) {
    return '';
  }

  if (distance < 1000) {
    return `${Math.round(distance)} m`;
  }

  return `${(distance / 1000).toFixed(1)} km`;
}

function readLocalStorage(keys: string[]): unknown | null {
  if (typeof window === 'undefined') {
    return null;
  }

  for (const key of keys) {
    try {
      const value = window.localStorage.getItem(key);

      if (!value) continue;

      return JSON.parse(value);
    } catch {
      // Ignore malformed local storage.
    }
  }

  return null;
}

/* ============================================================
   COMPONENT
============================================================ */

export default function ConfusedMode() {
  const [messages, setMessages] = useState<ConfusedModeMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const [location, setLocation] =
    useState<ConfusedModeLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [disruptions, setDisruptions] = useState<Disruption[]>([]);

  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [nearbyTransport, setNearbyTransport] = useState<NearbyTransport[]>(
    []
  );
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);

  const [currentRoute, setCurrentRoute] = useState<CurrentRoute | null>(
    null
  );
  const [destination, setDestination] = useState<unknown | null>(null);
  const [selectedMapPlace, setSelectedMapPlace] = useState<unknown | null>(
    null
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Tracks the last coordinate we actually ran a Nominatim search from,
  // so GPS jitter (the position wobbling a few meters every tick)
  // doesn't retrigger a fresh cascade of requests on top of one still
  // running and trip Nominatim's rate limit.
  const lastSearchedLocationRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Same idea, but for reverse-geocoding (coords -> readable address).
  // Nominatim's /reverse endpoint has the same 1 req/sec policy as
  // /search, so this needs its own jitter guard rather than piggybacking
  // on the nearby-search one (they run on independent schedules).
  const lastGeocodedLocationRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);

  /* ============================================================
     LOCATION
  ============================================================ */

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      setLocationLoading(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });

        setLocationError(null);
        setLocationLoading(false);
      },
      (error) => {
        console.error('Confused Mode location error:', error);

        let message = 'Unable to detect your location.';

        if (error.code === error.PERMISSION_DENIED) {
          message =
            'Location permission was denied. Enable location access so Rutein can guide you.';
        }

        if (error.code === error.POSITION_UNAVAILABLE) {
          message = 'Your current location is unavailable.';
        }

        if (error.code === error.TIMEOUT) {
          message = 'Location detection timed out. Trying again...';
        }

        setLocationError(message);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  /* ============================================================
     DISRUPTIONS
  ============================================================ */

  useEffect(() => {
    getActiveDisruptions()
      .then(setDisruptions)
      .catch((error) => {
        console.error('Failed to fetch disruptions:', error);
      });
  }, []);

  /* ============================================================
     RESTORE RUTEIN MAP CONTEXT
     If your map page stores route/place information in
     localStorage, Confused Mode will automatically pick it up.
  ============================================================ */

  useEffect(() => {
    const savedRoute = readLocalStorage([
      'rutein_current_route',
      'currentRoute',
      'activeRoute',
      'route',
    ]);

    const savedDestination = readLocalStorage([
      'rutein_destination',
      'destination',
      'selectedDestination',
    ]);

    const savedPlace = readLocalStorage([
      'rutein_selected_place',
      'selectedMapPlace',
      'selectedPlace',
    ]);

    if (savedRoute) {
      setCurrentRoute(savedRoute as CurrentRoute);
    }

    if (savedDestination) {
      setDestination(savedDestination);
    }

    if (savedPlace) {
      setSelectedMapPlace(savedPlace);
    }
  }, []);

  /* ============================================================
     NEARBY PLACE SEARCH
     Uses OpenStreetMap's Nominatim search service. This is NOT a
     replacement for your own map backend — it gives Confused
     Mode actual nearby place data instead of expecting the LLM
     to magically know where an Indomaret is.
  ============================================================ */

  useEffect(() => {
    if (!location) {
      setNearbyPlaces([]);
      setNearbyTransport([]);
      return;
    }

    // Skip re-searching if we've moved less than ~150m since the last
    // successful search — GPS jitter alone shouldn't trigger a fresh
    // 7-request cascade.
    const last = lastSearchedLocationRef.current;

    if (last) {
      const movedDistance = calculateDistance(
        last.latitude,
        last.longitude,
        location.latitude,
        location.longitude
      );

      if (movedDistance < 150) {
        return;
      }
    }

    let cancelled = false;

    // Debounce: wait for the position to settle for a moment before
    // kicking off a search, so a burst of rapid GPS updates only
    // triggers one cascade instead of several.
    const debounceTimer = window.setTimeout(() => {
      if (!cancelled) {
        loadNearbyData();
      }
    }, 800);

    async function loadNearbyData() {
      setNearbyLoading(true);
      setNearbyError(null);

      lastSearchedLocationRef.current = {
        latitude: location.latitude,
        longitude: location.longitude,
      };

      try {
        const lat = location.latitude;
        const lon = location.longitude;

        // Search multiple useful categories separately, since a
        // single generic search would give messy results.
        const queries = [
          'Indomaret',
          'Alfamart',
          'TransJakarta',
          'MRT',
          'LRT',
          'bus stop',
          'train station',
        ];

        // Nominatim's usage policy caps clients at ~1 request/second and
        // forbids concurrent/bulk requests. Firing all categories at once
        // via Promise.all trips their rate limiter (429) and, since
        // Promise.all fails fast, takes down every category with it.
        // Instead, run them one at a time with a short delay between
        // each, and let an individual category fail without killing the
        // rest.
        const wait = (ms: number) =>
          new Promise((resolve) => setTimeout(resolve, ms));

        const results: unknown[] = [];

        for (let i = 0; i < queries.length; i++) {
          const query = queries[i];

          try {
            const params = new URLSearchParams({
              q: query,
              format: 'json',
              limit: '5',
              addressdetails: '1',
              viewbox: `${lon - 0.025},${lat + 0.025},${lon + 0.025},${
                lat - 0.025
              }`,
              bounded: '0',
            });

            const response = await fetch(
              `https://nominatim.openstreetmap.org/search?${params.toString()}`,
              {
                headers: {
                  Accept: 'application/json',
                },
              }
            );

            if (!response.ok) {
              console.warn(
                `Nearby search failed for "${query}": ${response.status}`
              );
              results.push([]);
            } else {
              results.push(await response.json());
            }
          } catch (queryError) {
            console.warn(`Nearby search errored for "${query}":`, queryError);
            results.push([]);
          }

          if (cancelled) return;

          // Stay comfortably under Nominatim's 1 req/sec limit.
          if (i < queries.length - 1) {
            await wait(1100);
          }
        }

        if (cancelled) return;

        const places: NearbyPlace[] = [];
        const transport: NearbyTransport[] = [];

        results.forEach((resultList, index) => {
          if (!Array.isArray(resultList)) {
            return;
          }

          const query = queries[index];

          resultList.forEach((result: any) => {
            const resultLat = Number(result.lat);
            const resultLon = Number(result.lon);

            if (
              !Number.isFinite(resultLat) ||
              !Number.isFinite(resultLon)
            ) {
              return;
            }

            const distance = calculateDistance(
              lat,
              lon,
              resultLat,
              resultLon
            );

            const name = result.display_name?.split(',')[0] ?? query;
            const address = result.display_name ?? undefined;

            const isTransport =
              /transjakarta|mrt|lrt|bus|station|stasiun|terminal/i.test(
                query
              );

            if (isTransport) {
              transport.push({
                name,
                type: query,
                latitude: resultLat,
                longitude: resultLon,
                distance,
                address,
              });
            } else {
              places.push({
                name,
                category: query,
                latitude: resultLat,
                longitude: resultLon,
                distance,
                address,
              });
            }
          });
        });

        // Remove duplicates and sort nearest-first.
        const uniquePlaces = Array.from(
          new Map(
            places.map((place) => [
              `${place.name}-${place.latitude.toFixed(
                5
              )}-${place.longitude.toFixed(5)}`,
              place,
            ])
          ).values()
        )
          .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
          .slice(0, 20);

        const uniqueTransport = Array.from(
          new Map(
            transport.map((item) => [
              `${item.name}-${item.latitude.toFixed(
                5
              )}-${item.longitude.toFixed(5)}`,
              item,
            ])
          ).values()
        )
          .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
          .slice(0, 20);

        setNearbyPlaces(uniquePlaces);
        setNearbyTransport(uniqueTransport);
      } catch (error) {
        console.error('Failed to load nearby Rutein data:', error);

        if (!cancelled) {
          setNearbyError('Nearby map data could not be loaded.');
        }
      } finally {
        if (!cancelled) {
          setNearbyLoading(false);
        }
      }
    }

    return () => {
      cancelled = true;
      window.clearTimeout(debounceTimer);
    };
  }, [location?.latitude, location?.longitude]);

  /* ============================================================
     REVERSE GEOCODING
     Turns the raw GPS coordinate into a readable address (e.g.
     "Blok M, South Jakarta") so Confused Mode can actually answer
     "where am I" instead of only reporting lat/lng. Uses the same
     distance-gate + debounce pattern as the nearby-place search so
     GPS jitter doesn't spam Nominatim's /reverse endpoint.
  ============================================================ */

  useEffect(() => {
    if (!location) {
      return;
    }

    const last = lastGeocodedLocationRef.current;

    if (last) {
      const movedDistance = calculateDistance(
        last.latitude,
        last.longitude,
        location.latitude,
        location.longitude
      );

      if (movedDistance < 150) {
        return;
      }
    }

    let cancelled = false;

    const debounceTimer = window.setTimeout(async () => {
      if (cancelled) return;

      lastGeocodedLocationRef.current = {
        latitude: location.latitude,
        longitude: location.longitude,
      };

      try {
        const result = await reverseGeocode(
          location.latitude,
          location.longitude
        );

        if (cancelled || !result) return;

        setLocation((previousLocation) => {
          if (!previousLocation) return previousLocation;

          return {
            ...previousLocation,
            address: result.address ?? result.label,
          };
        });
      } catch (error) {
        console.warn('Reverse geocoding failed:', error);
      }
    }, 900);

    return () => {
      cancelled = true;
      window.clearTimeout(debounceTimer);
    };
  }, [location?.latitude, location?.longitude]);

  /* ============================================================
     AUTO SCROLL
  ============================================================ */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  /* ============================================================
     NAVIGATION CONTEXT
  ============================================================ */

  const navigationContext = useMemo(
    () => ({
      currentLocation: location ?? undefined,
      destination: destination ?? undefined,
      selectedMapPlace: selectedMapPlace ?? undefined,
      nearbyPlaces,
      nearbyTransport,
      currentRoute: currentRoute ?? undefined,
      availableDisruptions: disruptions,

      // Additional metadata makes the AI's job considerably easier.
      mapProvider: 'OpenStreetMap / Rutein map data',
      locationSource: 'Browser GPS',
      nearbySearchRadiusMeters: 2500,
    }),
    [
      location,
      destination,
      selectedMapPlace,
      nearbyPlaces,
      nearbyTransport,
      currentRoute,
      disruptions,
    ]
  );

  /* ============================================================
     SEND MESSAGE
  ============================================================ */

  async function handleSend(text: string) {
    const trimmedText = text.trim();

    if (!trimmedText || sending) {
      return;
    }

    const userMessage: ConfusedModeMessage = {
      role: 'user',
      content: trimmedText,
    };

    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput('');
    setSending(true);

    try {
      const { reply } = await sendConfusedModeMessage(
        updatedMessages,
        navigationContext
      );

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          role: 'assistant',
          content: reply,
        },
      ]);
    } catch (error) {
      console.error('Failed to send Confused Mode message:', error);

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          role: 'assistant',
          content:
            "I could not connect to Rutein's assistant right now. Please try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  /* ============================================================
     LOCATION STATUS
  ============================================================ */

  function getLocationStatus() {
    if (locationLoading) {
      return '📍 Detecting location...';
    }

    if (location) {
      return '📍 Live location connected';
    }

    return '📍 Location unavailable';
  }

  /* ============================================================
     QUICK ACTIONS
  ============================================================ */

  const quickActions = [
    "I don't know where I am.",
    'TransJakarta near me',
    'Find an Indomaret near me',
    'What transportation should I take?',
    'How do I get home?',
  ];

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div
      className="container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 70px)',
        maxWidth: 900,
      }}
    >
      {/* HEADER */}

      <div style={{ marginBottom: 18 }}>
        <h1 style={{ marginBottom: 4 }}>Confused Mode</h1>

        <p
          style={{
            color: 'var(--color-text-muted)',
            marginTop: 0,
            marginBottom: 12,
          }}
        >
          Your Rutein navigation assistant. Ask where you are, what to
          take, or where to go next.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <span className="badge badge-success">AI connected</span>

          <span className="badge">{getLocationStatus()}</span>

          <span className="badge">
            ⚠ {disruptions.length} active disruption
            {disruptions.length === 1 ? '' : 's'}
          </span>

          {nearbyLoading && (
            <span className="badge">🗺 Loading nearby map data...</span>
          )}

          {!nearbyLoading && nearbyPlaces.length > 0 && (
            <span className="badge">🗺 Map context ready</span>
          )}
        </div>
      </div>

      {/* LOCATION ERROR */}

      {locationError && (
        <div
          className="card"
          style={{
            marginBottom: 12,
            border: '1px solid var(--color-border)',
          }}
        >
          <p style={{ margin: 0, fontSize: 13 }}>{locationError}</p>
        </div>
      )}

      {/* MAP DATA ERROR */}

      {nearbyError && (
        <div className="card" style={{ marginBottom: 12 }}>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: 'var(--color-text-muted)',
            }}
          >
            {nearbyError}
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
            GPS: {location.latitude.toFixed(5)},{' '}
            {location.longitude.toFixed(5)}
            {location.accuracy
              ? ` ±${Math.round(location.accuracy)}m`
              : ''}
            {location.address ? ` — ${location.address}` : ''}
          </span>
        )}

        <span>Nearby places: {nearbyPlaces.length}</span>

        <span>Nearby transport: {nearbyTransport.length}</span>

        {currentRoute && (
          <span>
            Active route: {currentRoute.destinationName ?? 'Yes'}
          </span>
        )}
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
        {/* EMPTY STATE */}

        {messages.length === 0 && (
          <div>
            <div className="card" style={{ marginBottom: 14 }}>
              <p
                style={{
                  marginTop: 0,
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Need a hand?
              </p>

              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: 'var(--color-text-muted)',
                }}
              >
                I can use your current Rutein location, nearby map
                data, transportation information, and active
                disruptions to help you figure out what to do.
              </p>
            </div>

            <p
              style={{
                fontSize: 13,
                color: 'var(--color-text-muted)',
                marginBottom: 10,
              }}
            >
              Try asking:
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 8,
              }}
            >
              {quickActions.map((question) => (
                <button
                  key={question}
                  className="btn btn-outline"
                  style={{ textAlign: 'left', minHeight: 46 }}
                  onClick={() => handleSend(question)}
                  disabled={sending}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* MESSAGES */}

        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className="card"
            style={{
              maxWidth: '85%',
              alignSelf:
                message.role === 'user' ? 'flex-end' : 'flex-start',
              background:
                message.role === 'user'
                  ? 'var(--color-primary-dim)'
                  : 'var(--color-surface)',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
              }}
            >
              {message.content}
            </p>
          </div>
        ))}

        {/* THINKING */}

        {sending && (
          <div
            className="card"
            style={{ maxWidth: 160, padding: '10px 14px' }}
          >
            <span
              style={{ color: 'var(--color-text-muted)', fontSize: 13 }}
            >
              Rutein is thinking...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSend(input);
        }}
        style={{ display: 'flex', gap: 8 }}
      >
        <input
          className="input"
          placeholder={
            location
              ? 'Ask where you are, what to take, or where to go...'
              : 'Type your question...'
          }
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={sending}
          autoComplete="off"
        />

        <button
          className="btn btn-primary"
          type="submit"
          disabled={sending || !input.trim()}
        >
          {sending ? 'Thinking...' : 'Send'}
        </button>
      </form>
    </div>
  );
}