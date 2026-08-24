import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import PlaceSearchInput from '@/components/PlaceSearchInput';
import { getTileLayerConfig } from '@/services/mapService';
import { getCurrentPosition, isGeolocationSupported } from '@/services/locationService';
import { findNearbyStops } from '@/services/transportService';
import { reverseGeocode } from '@/services/geocodingService';
import type { PlaceResult, GeoPoint } from '@/types/domain.types';
import type { TransportStop } from '@/types/database.types';
import { useNavigate } from 'react-router-dom';

// Leaflet's default marker icons reference image files that don't resolve
// under bundlers by default — replace with inline-safe CDN icons.
const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const stopIcon = new L.DivIcon({
  className: '',
  html: '<div style="width:12px;height:12px;border-radius:50%;background:#2DD4BF;border:2px solid #0B1220;"></div>',
  iconSize: [12, 12],
});

const JAKARTA_CENTER: GeoPoint = { lat: -6.2088, lng: 106.8456 };

function RecenterOnPoint({ point }: { point: GeoPoint | null }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.setView([point.lat, point.lng], 15);
  }, [point, map]);
  return null;
}

function ClickToSelect({ onSelect }: { onSelect: (p: GeoPoint) => void }) {
  useMapEvents({
    click(e) {
      onSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function MapPage() {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [nearbyStops, setNearbyStops] = useState<TransportStop[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loadingStops, setLoadingStops] = useState(false);
  const tileConfig = getTileLayerConfig();

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

  async function handleMapClick(point: GeoPoint) {
    const place = await reverseGeocode(point.lat, point.lng);
    setSelectedPlace(place ?? { ...point, label: 'Selected location', address: `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` });
  }

  const center = selectedPlace ?? userLocation ?? JAKARTA_CENTER;

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

      <div style={{ height: 480, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
        <MapContainer center={[center.lat, center.lng]} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer url={tileConfig.url} attribution={tileConfig.attribution} />
          <RecenterOnPoint point={selectedPlace ?? userLocation} />
          <ClickToSelect onSelect={handleMapClick} />

          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={defaultIcon}>
              <Popup>You are here</Popup>
            </Marker>
          )}

          {selectedPlace && (
            <Marker position={[selectedPlace.lat, selectedPlace.lng]} icon={defaultIcon}>
              <Popup>{selectedPlace.label}</Popup>
            </Marker>
          )}

          {nearbyStops.map((stop) => (
            <Marker key={stop.id} position={[stop.latitude, stop.longitude]} icon={stopIcon}>
              <Popup>{stop.stop_name}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

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
