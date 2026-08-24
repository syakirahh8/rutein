import type { GeoPoint } from '@/types/domain.types';
import { distanceMeters } from './locationService';

/**
 * Routing/directions provider abstraction.
 *
 * Default: OpenRouteService (https://openrouteservice.org) — free tier,
 * requires a free API key (VITE_ORS_API_KEY) but no billing. Provides
 * real walking/driving polylines and durations.
 *
 * If no key is configured, walkingDirections() falls back to a straight-line
 * estimate (haversine distance / average walking speed) so the app remains
 * usable during development — this fallback is explicit, never silent.
 */

const ORS_BASE = 'https://api.openrouteservice.org/v2/directions';
const AVERAGE_WALK_SPEED_MPS = 1.35; // ~4.9 km/h

export interface DirectionsResult {
  distanceM: number;
  durationS: number;
  geometry: GeoPoint[]; // decoded polyline as lat/lng pairs
  isEstimate: boolean;  // true when using the straight-line fallback
}

function getOrsKey(): string | undefined {
  return import.meta.env.VITE_ORS_API_KEY as string | undefined;
}

export async function walkingDirections(from: GeoPoint, to: GeoPoint): Promise<DirectionsResult> {
  const apiKey = getOrsKey();

  if (!apiKey) {
    const distanceM = distanceMeters(from, to);
    return {
      distanceM,
      durationS: distanceM / AVERAGE_WALK_SPEED_MPS,
      geometry: [from, to],
      isEstimate: true,
    };
  }

  const res = await fetch(`${ORS_BASE}/foot-walking/geojson`, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      coordinates: [
        [from.lng, from.lat],
        [to.lng, to.lat],
      ],
    }),
  });

  if (!res.ok) {
    // Fail gracefully to the estimate rather than breaking the whole route.
    const distanceM = distanceMeters(from, to);
    return {
      distanceM,
      durationS: distanceM / AVERAGE_WALK_SPEED_MPS,
      geometry: [from, to],
      isEstimate: true,
    };
  }

  const data = await res.json();
  const feature = data.features?.[0];
  const summary = feature?.properties?.summary;
  const coords: [number, number][] = feature?.geometry?.coordinates ?? [];

  return {
    distanceM: summary?.distance ?? distanceMeters(from, to),
    durationS: summary?.duration ?? distanceMeters(from, to) / AVERAGE_WALK_SPEED_MPS,
    geometry: coords.map(([lng, lat]) => ({ lat, lng })),
    isEstimate: false,
  };
}

export function getTileLayerConfig() {
  const provider = (import.meta.env.VITE_MAP_TILE_PROVIDER as string) || 'osm';
  const maptilerKey = import.meta.env.VITE_MAPTILER_API_KEY as string | undefined;

  if (provider === 'maptiler' && maptilerKey) {
    return {
      url: `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${maptilerKey}`,
      attribution: '&copy; MapTiler &copy; OpenStreetMap contributors',
    };
  }

  // Default: free OSM raster tiles, no key required.
  return {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  };
}
