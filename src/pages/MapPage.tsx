import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
setWorkerUrl(workerUrl);

import Map, { Marker, Popup, Source, Layer, NavigationControl, type MapRef, type MapLayerMouseEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import PlaceSearchInput from '@/components/PlaceSearchInput';
import { getMapStyle, walkingDirections, drivingDirections, type DirectionsResult } from '@/services/mapService';
import { getCurrentPosition, isGeolocationSupported, distanceMeters } from '@/services/locationService';
import { findNearbyStops } from '@/services/transportService';
import { reverseGeocode } from '@/services/geocodingService';
import type { PlaceResult, GeoPoint } from '@/types/domain.types';
import type { TransportStop } from '@/types/database.types';
import { useNavigate } from 'react-router-dom';

const JAKARTA_CENTER: GeoPoint = { lat: -6.2088, lng: 106.8456 };
type TravelMode = 'walk' | 'ojek';
type BaseLayer = 'street' | 'satellite';

// Esri World Imagery — free, no API key, no account required. Raw XYZ
// raster tiles, so this needs a full MapLibre style object (not just a
// style URL like getMapStyle() returns for the OpenFreeMap vector style).
const SATELLITE_STYLE = {
  version: 8 as const,
  sources: {
    'esri-satellite': {
      type: 'raster' as const,
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    },
  },
  layers: [{ id: 'esri-satellite-layer', type: 'raster' as const, source: 'esri-satellite' }],
};

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return '<1 min';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}

function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

// Finds the point exactly halfway along a route's total length (by distance
// walked along the line), not just the middle index of the coordinate array
// — routes have uneven point spacing, so index-midpoint would drift toward
// wherever ORS happened to place more vertices.
function getRouteMidpoint(geometry: GeoPoint[]): GeoPoint | null {
  if (geometry.length === 0) return null;
  if (geometry.length === 1) return geometry[0];

  const segmentLengths: number[] = [];
  let total = 0;
  for (let i = 0; i < geometry.length - 1; i++) {
    const d = distanceMeters(geometry[i], geometry[i + 1]);
    segmentLengths.push(d);
    total += d;
  }
  if (total === 0) return geometry[0];

  const half = total / 2;
  let walked = 0;
  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i];
    if (walked + segLen >= half) {
      const t = segLen === 0 ? 0 : (half - walked) / segLen;
      const a = geometry[i];
      const b = geometry[i + 1];
      return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
    }
    walked += segLen;
  }
  return geometry[geometry.length - 1];
}

export default function MapPage() {
  const navigate = useNavigate();
  const mapRef = useRef<MapRef>(null);
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [nearbyStops, setNearbyStops] = useState<TransportStop[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loadingStops, setLoadingStops] = useState(false);
  const [travelMode, setTravelMode] = useState<TravelMode>('walk');
  const [baseLayer, setBaseLayer] = useState<BaseLayer>('street');
  const [directions, setDirections] = useState<DirectionsResult | null>(null);
  const [loadingDirections, setLoadingDirections] = useState(false);
  const [directionsError, setDirectionsError] = useState<string | null>(null);
  const [popupTarget, setPopupTarget] = useState<'user' | 'place' | null>(null);

  const [viewState, setViewState] = useState({
    latitude: JAKARTA_CENTER.lat,
    longitude: JAKARTA_CENTER.lng,
    zoom: 14,
  });

  useEffect(() => {
    if (!isGeolocationSupported()) {
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }
    getCurrentPosition()
      .then((point) => setUserLocation(point))
      .catch((err) => setLocationError(err.message ?? 'Could not get your location.'));
  }, []);

  useEffect(() => {
    const center = selectedPlace ?? userLocation;
    if (!center) return;
    setLoadingStops(true);
    findNearbyStops(center, 1200)
      .then(setNearbyStops)
      .catch(() => setNearbyStops([]))
      .finally(() => setLoadingStops(false));
  }, [selectedPlace, userLocation]);

  useEffect(() => {
    const point = selectedPlace ?? userLocation;
    if (!point || !mapRef.current) return;
    mapRef.current.flyTo({ center: [point.lng, point.lat], zoom: 15, duration: 800 });
  }, [selectedPlace, userLocation]);

  useEffect(() => {
    if (!userLocation || !selectedPlace) {
      setDirections(null);
      return;
    }
    let cancelled = false;
    setLoadingDirections(true);
    setDirectionsError(null);

    const fetchDirections = travelMode === 'walk' ? walkingDirections : drivingDirections;

    fetchDirections(userLocation, selectedPlace)
      .then((result) => {
        if (!cancelled) setDirections(result);
      })
      .catch(() => {
        if (!cancelled) setDirectionsError('Could not calculate a route for this destination.');
      })
      .finally(() => {
        if (!cancelled) setLoadingDirections(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userLocation, selectedPlace, travelMode]);

  const handleMapClick = useCallback(async (e: MapLayerMouseEvent) => {
    const { lat, lng } = e.lngLat;
    const place = await reverseGeocode(lat, lng);
    setSelectedPlace(place ?? { lat, lng, label: 'Selected location', address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
  }, []);

  const routeGeoJson = directions
    ? {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString' as const,
          coordinates: directions.geometry.map((p) => [p.lng, p.lat]),
        },
      }
    : null;

  const routeMidpoint = useMemo(
    () => (directions ? getRouteMidpoint(directions.geometry) : null),
    [directions]
  );

  const routeColor = travelMode === 'walk' ? '#38BDF8' : '#F97316';

  return (
    <div className="container" style={{ paddingBottom: 24 }}>
      <h1>Map</h1>
      <div className="card" style={{ marginBottom: 16 }}>
        <PlaceSearchInput placeholder="Search a place or address…" onSelect={setSelectedPlace} />
      </div>

      {locationError && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--color-amber)' }}>
          <span className="badge badge-fallback">Location unavailable</span>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>{locationError}</p>
        </div>
      )}

      <div style={{ position: 'relative', height: 480, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
        <button
          className="btn btn-secondary"
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 1,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          }}
          onClick={() => setBaseLayer((prev) => (prev === 'street' ? 'satellite' : 'street'))}
        >
          {baseLayer === 'street' ? '🛰️ Satellite' : '🗺️ Streets'}
        </button>

        <Map
          ref={mapRef}
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          onClick={handleMapClick}
          mapStyle={baseLayer === 'satellite' ? SATELLITE_STYLE : getMapStyle()}
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="top-right" showCompass={false} />

          {routeGeoJson && (
            <Source id="route" type="geojson" data={routeGeoJson}>
              <Layer
                id="route-line"
                type="line"
                layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                paint={{
                  'line-color': routeColor,
                  'line-width': 5,
                  'line-opacity': 0.85,
                  'line-dasharray': directions?.isEstimate ? [2, 2] : [1, 0],
                }}
              />
            </Source>
          )}

          {/* Duration label pinned to the route's geographic midpoint —
              a Marker (not a screen-fixed overlay) so it tracks the line
              correctly as the map pans/zooms. */}
          {routeMidpoint && directions && (
            <Marker latitude={routeMidpoint.lat} longitude={routeMidpoint.lng} anchor="center">
              <div
                style={{
                  background: routeColor,
                  color: '#0B1220',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 6,
                  border: '2px solid #0B1220',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
                  pointerEvents: 'none',
                }}
              >
                {formatDuration(directions.durationS)}
              </div>
            </Marker>
          )}

          {userLocation && (
            <Marker
              latitude={userLocation.lat}
              longitude={userLocation.lng}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopupTarget('user');
              }}
            >
              {/* Reuses MapLibre's built-in "you are here" dot styling
                  (pulsing animation + white ring), already loaded via
                  maplibre-gl.css — no custom icon asset needed. */}
              <div className="maplibregl-user-location-dot" />
            </Marker>
          )}
          {userLocation && popupTarget === 'user' && (
            <Popup latitude={userLocation.lat} longitude={userLocation.lng} onClose={() => setPopupTarget(null)} closeButton={false}>
              You are here
            </Popup>
          )}

          {selectedPlace && (
            <Marker
              latitude={selectedPlace.lat}
              longitude={selectedPlace.lng}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopupTarget('place');
              }}
            >
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#F97316', border: '2px solid #0B1220' }} />
            </Marker>
          )}
          {selectedPlace && popupTarget === 'place' && (
            <Popup latitude={selectedPlace.lat} longitude={selectedPlace.lng} onClose={() => setPopupTarget(null)} closeButton={false}>
              {selectedPlace.label}
            </Popup>
          )}

          {nearbyStops.map((stop) => (
            <Marker key={stop.id} latitude={stop.latitude} longitude={stop.longitude}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#2DD4BF', border: '2px solid #0B1220' }} title={stop.stop_name} />
            </Marker>
          ))}
        </Map>
      </div>

      {userLocation && selectedPlace && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Route to {selectedPlace.label}</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={travelMode === 'walk' ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ padding: '4px 10px', fontSize: 12 }}
                onClick={() => setTravelMode('walk')}
              >
                Walk
              </button>
              <button
                className={travelMode === 'ojek' ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ padding: '4px 10px', fontSize: 12 }}
                onClick={() => setTravelMode('ojek')}
              >
                Ojek
              </button>
            </div>
          </div>

          {loadingDirections && (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 8 }}>Calculating route…</p>
          )}
          {directionsError && (
            <p style={{ fontSize: 13, color: 'var(--color-amber)', marginTop: 8 }}>{directionsError}</p>
          )}
          {!loadingDirections && directions && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{formatDuration(directions.durationS)}</span>
              <span style={{ color: 'var(--color-text-muted)' }}>{formatDistance(directions.distanceM)}</span>
              {directions.isEstimate && <span className="badge badge-fallback">Estimated (no live routing key)</span>}
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>Nearby transit stops</h3>
          {loadingStops && <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Searching…</span>}
        </div>
        {!loadingStops && nearbyStops.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            No stops found within 1.2km. Click anywhere on the map to check a different spot.
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
          {nearbyStops.map((stop) => (
            <div key={stop.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>{stop.stop_name}</span>
              <span style={{ color: 'var(--color-text-muted)' }}>{stop.is_transfer_point ? 'Transfer point' : 'Stop'}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedPlace && (
        <button className="btn btn-primary" style={{ marginTop: 16, width: '100%' }} onClick={() => navigate('/routes', { state: { destination: selectedPlace } })}>
          Plan a route to {selectedPlace.label}
        </button>
      )}
    </div>
  );
}