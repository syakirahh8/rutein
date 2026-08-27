import React, { useEffect, useRef, useState } from 'react';
import { Viewer } from 'mapillary-js';
import 'mapillary-js/dist/mapillary.css';
import { findNearestImage, type MapillaryLookupResult } from '@/services/mapillaryService';
import type { GeoPoint } from '@/types/domain.types';

interface Props {
  point: GeoPoint;
  locationLabel?: string;
  onClose: () => void;
}

type ModalState = 'loading' | 'ready' | 'not_found' | 'missing_token' | 'error';

export default function StreetViewModal({ point, locationLabel, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [state, setState] = useState<ModalState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    findNearestImage(point).then((result: MapillaryLookupResult) => {
      if (cancelled) return;

      if (result.status === 'missing_token') {
        setState('missing_token');
        return;
      }
      if (result.status === 'not_found') {
        setState('not_found');
        return;
      }
      if (result.status === 'error') {
        setState('error');
        setErrorMessage(result.message);
        return;
      }

      // result.status === 'found'
      const token = import.meta.env.VITE_MAPILLARY_TOKEN as string;
      if (!containerRef.current) return;

      try {
        const viewer = new Viewer({
          accessToken: token,
          container: containerRef.current,
          imageId: result.imageId,
        });
        viewerRef.current = viewer;
        setState('ready');
      } catch (err) {
        setState('error');
        setErrorMessage(err instanceof Error ? err.message : 'Could not load the street-level viewer.');
      }
    });

    return () => {
      cancelled = true;
      viewerRef.current?.remove();
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [point.lat, point.lng]);

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={header}>
          <div>
            <strong style={{ fontSize: 14 }}>{locationLabel ?? 'Street-level view'}</strong>
            {state === 'ready' && (
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Drag to look around · scroll to zoom</div>
            )}
          </div>
          <button onClick={onClose} style={closeBtn}>✕ Close</button>
        </div>

        <div style={viewerArea}>
          {state === 'loading' && (
            <div style={centeredMessage}>Searching for nearby street imagery…</div>
          )}

          {state === 'missing_token' && (
            <div style={centeredMessage}>
              <p style={{ margin: 0 }}>Street imagery isn't configured yet.</p>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                Add a free Mapillary client token to <code>VITE_MAPILLARY_TOKEN</code> in your <code>.env</code> file.
              </p>
            </div>
          )}

          {state === 'not_found' && (
            <div style={centeredMessage}>
              <p style={{ margin: 0 }}>No street imagery available here.</p>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                Try selecting another nearby location.
              </p>
            </div>
          )}

          {state === 'error' && (
            <div style={centeredMessage}>
              <p style={{ margin: 0, color: 'var(--color-danger)' }}>Couldn't load street imagery.</p>
              {errorMessage && <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>{errorMessage}</p>}
            </div>
          )}

          {/* Always rendered (hidden until ready) so mapillary-js has a
              mounted DOM node to attach to before the image is found. */}
          <div ref={containerRef} style={{ ...viewerCanvas, display: state === 'ready' ? 'block' : 'none' }} />
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 200,
  padding: 16,
};

const modal: React.CSSProperties = {
  width: '100%',
  maxWidth: 900,
  height: '80vh',
  maxHeight: 640,
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 16,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

const header: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid var(--color-border)',
  flexShrink: 0,
};

const closeBtn: React.CSSProperties = {
  background: 'var(--color-surface-raised)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  padding: '6px 12px',
  fontSize: 12,
  color: 'var(--color-text)',
};

const viewerArea: React.CSSProperties = {
  flex: 1,
  position: 'relative',
  background: '#000',
};

const viewerCanvas: React.CSSProperties = {
  width: '100%',
  height: '100%',
};

const centeredMessage: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  color: 'var(--color-text)',
  padding: 24,
};