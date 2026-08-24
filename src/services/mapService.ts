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

/**
 * Road-following directions, used to estimate ojek online (ride-hailing
 * motorbike) legs. Reuses ORS's 'driving-car' profile as the closest
 * available approximation of road-network distance/time for a motorbike —
 * ORS has no dedicated motorbike profile. Real motorbikes often move faster
 * than car-traffic estimates (lane-splitting), which the fallback speed
 * constant below already accounts for.
 *
 * Falls back to a straight-line-distance x road-curvature-factor estimate
 * when no ORS key is configured, exactly like walkingDirections().
 */
const ROAD_CURVATURE_FACTOR = 1.3; // real road distance vs. straight-line, typical urban ratio
const AVERAGE_MOTORBIKE_SPEED_MPS = 8.3; // ~30 km/h average incl. Jakarta traffic + lane-splitting

export async function drivingDirections(from: GeoPoint, to: GeoPoint): Promise<DirectionsResult> {
  const apiKey = getOrsKey();

  if (!apiKey) {
    const distanceM = distanceMeters(from, to) * ROAD_CURVATURE_FACTOR;
    return {
      distanceM,
      durationS: distanceM / AVERAGE_MOTORBIKE_SPEED_MPS,
      geometry: [from, to],
      isEstimate: true,
    };
  }

  const res = await fetch(`${ORS_BASE}/driving-car/geojson`, {
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
    const distanceM = distanceMeters(from, to) * ROAD_CURVATURE_FACTOR;
    return {
      distanceM,
      durationS: distanceM / AVERAGE_MOTORBIKE_SPEED_MPS,
      geometry: [from, to],
      isEstimate: true,
    };
  }

  const data = await res.json();
  const feature = data.features?.[0];
  const summary = feature?.properties?.summary;
  const coords: [number, number][] = feature?.geometry?.coordinates ?? [];
  const distanceM = summary?.distance ?? distanceMeters(from, to) * ROAD_CURVATURE_FACTOR;

  return {
    distanceM,
    durationS: distanceM / AVERAGE_MOTORBIKE_SPEED_MPS,
    geometry: coords.map(([lng, lat]) => ({ lat, lng })),
    isEstimate: false,
  };
}
/**
 * Basemap style — OpenFreeMap (https://openfreemap.org), served as vector
 * tiles for MapLibre GL. Free, no API key, no request limits, funded by
 * donations rather than rate-limited like tile.openstreetmap.org. Comes in
 * three styles: 'positron' (clean/minimal — default here), 'liberty'
 * (classic OSM look), 'bright' (high contrast).
 */
export function getMapStyle(): string {
  const style = (import.meta.env.VITE_MAP_STYLE as string) || 'positron';
  return `https://tiles.openfreemap.org/styles/${style}`;
}
