import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { watchPosition, distanceMeters, isGeolocationSupported } from '@/services/locationService';

import type { GeoPoint } from '@/types/domain.types';
import type { GeoServiceError } from '@/services/locationService';

interface Waypoint extends GeoPoint {
  label: string;
}

interface Props {
  waypoints: Waypoint[]; // ordered stops along the route
  onClose: () => void;
}

const WAYPOINT_ARRIVAL_RADIUS_M = 60;

const userIcon = new L.DivIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#3D8BFD;border:3px solid #fff;box-shadow:0 0 0 4px rgba(61,139,253,0.3);"></div>',
  iconSize: [16, 16],
});

const waypointIcon = new L.DivIcon({
  className: '',
  html: '<div style="width:12px;height:12px;border-radius:50%;background:#2DD4BF;border:2px solid #0B1220;"></div>',
  iconSize: [12, 12],
});

function FollowUser({ point }: { point: GeoPoint | null }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.setView([point.lat, point.lng], map.getZoom() < 14 ? 16 : map.getZoom());
  }, [point, map]);
  return null;
}

export default function LiveGpsModal({ waypoints, onClose }: Props) {
  const [status, setStatus] = useState<'requesting' | 'tracking' | 'error'>('requesting');
  const [error, setError] = useState<GeoServiceError | null>(null);
  const [currentPosition, setCurrentPosition] = useState<GeoPoint | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [waypointIndex, setWaypointIndex] = useState(0);
  const stopWatchRef = useRef<(() => void) | null>(null);
  const tileConfig = getTileLayerConfig();

  useEffect(() => {
    if (!isGeolocationSupported()) {
      setStatus('error');
      setError({ type: 'unsupported', message: 'Geolocation is not supported by this browser.' });
      return;
    }

    stopWatchRef.current = watchPosition(
      (point, acc) => {
        setStatus('tracking');
        setError(null);
        setCurrentPosition(point);
        setAccuracy(acc);
      },
      (err) => {
        setStatus('error');
        setError(err);
      }
    );

    return () => {
      stopWatchRef.current?.();
    };
  }, []);

  // Detect arrival at the current target waypoint.
  useEffect(() => {
    if (!currentPosition || waypointIndex >= waypoints.length) return;
    const target = waypoints[waypointIndex];
    const dist = distanceMeters(currentPosition, target);
    if (dist <= WAYPOINT_ARRIVAL_RADIUS_M) {
      setWaypointIndex((i) => Math.min(i + 1, waypoints.length));
    }
  }, [currentPosition, waypointIndex, waypoints]);

  const nextWaypoint = waypoints[waypointIndex];
  const distanceToNext = currentPosition && nextWaypoint ? distanceMeters(currentPosition, nextWaypoint) : null;

  function handleClose() {
    stopWatchRef.current?.();
    onClose();
  }

  return (
    <div style={overlay}>
      <div style={modal} className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Live journey tracking</h3>
          <button onClick={handleClose} style={closeBtn}>✕</button>
        </div>

        {status === 'requesting' && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Requesting location permission…
          </div>
        )}

        {status === 'error' && error && (
          <div style={{ padding: 20 }}>
            <p style={{ color: 'var(--color-danger)', marginBottom: 4 }}>{errorTitle(error.type)}</p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{error.message}</p>
            {error.type === 'permission_denied' && (
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                Enable location access for this site in your browser settings, then reopen this screen.
              </p>
            )}
          </div>
        )}

        {status === 'tracking' && currentPosition && (
          <>
            <div style={{ height: 320, borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
              <MapContainer center={[currentPosition.lat, currentPosition.lng]} zoom={16} style={{ height: '100%', width: '100%' }}>
                <TileLayer url={tileConfig.url} attribution={tileConfig.attribution} />
                <FollowUser point={currentPosition} />
                <Marker position={[currentPosition.lat, currentPosition.lng]} icon={userIcon} />
                {waypoints.map((wp, i) => (
                  <Marker key={i} position={[wp.lat, wp.lng]} icon={waypointIcon} />
                ))}
                {waypoints.length > 1 && (
                  <Polyline positions={waypoints.map((w) => [w.lat, w.lng])} pathOptions={{ color: '#2DD4BF', weight: 3, dashArray: '6 6' }} />
                )}
              </MapContainer>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>Accuracy: {accuracy ? `±${Math.round(accuracy)}m` : '—'}</span>
              {nextWaypoint ? (
                <span>Next: {nextWaypoint.label} — {distanceToNext ? `${Math.round(distanceToNext)}m` : '—'}</span>
              ) : (
                <span style={{ color: 'var(--color-success)' }}>All waypoints reached ✓</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function errorTitle(type: GeoServiceError['type']): string {
  switch (type) {
    case 'permission_denied': return 'Location permission denied';
    case 'position_unavailable': return 'Location unavailable';
    case 'timeout': return 'Location request timed out';
    case 'unsupported': return 'Unsupported browser';
  }
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
  padding: 16,
};

const modal: React.CSSProperties = {
  width: '100%',
  maxWidth: 520,
  maxHeight: '90vh',
  overflowY: 'auto',
};

const closeBtn: React.CSSProperties = {
  background: 'var(--color-surface-raised)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  width: 30,
  height: 30,
  color: 'var(--color-text)',
};

// Legacy raster tile config — kept only for components not yet migrated
// to the OpenFreeMap/MapLibre vector style (see getMapStyle below).
// TODO: remove once LiveGpsModal.tsx is migrated to MapLibre.
export function getTileLayerConfig() {
  return {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  };
}

export function getMapStyle(): string {
  const style = (import.meta.env.VITE_MAP_STYLE as string) || 'positron';
  return `https://tiles.openfreemap.org/styles/${style}`;
}