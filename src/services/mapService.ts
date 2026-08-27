import type { GeoPoint } from '@/types/domain.types';
import { distanceMeters } from './locationService';

/**
 * Routing/directions provider abstraction.
 *
 * Provider: OpenRouteService (https://openrouteservice.org), called through
 * a Supabase Edge Function proxy (supabase/functions/ors-proxy) — ORS
 * doesn't send CORS headers for browser-origin requests, and the proxy
 * keeps the ORS API key server-side.
 *
 * Two caches guard against the BFS in buildCheapestLegs hammering the same
 * coordinate pair repeatedly across different search branches:
 *  - success cache: identical (profile, from, to) results are reused,
 *    never refetched.
 *  - failure cache: a coordinate pair that just failed (e.g. ORS 404s
 *    because no road exists near one of the points) is assumed likely to
 *    fail again for a short window, so repeat requests skip the network
 *    entirely and go straight to the estimate — instead of re-attempting
 *    (and re-waiting through the throttle) on every BFS branch that
 *    revisits the same stop. The TTL is short so a genuinely transient
 *    failure (e.g. a rate limit) isn't stuck for the whole session.
 *
 * All requests go through a shared throttled queue (min gap between
 * calls) so a single search never bursts past ORS's rate limit.
 *
 * If a request ultimately fails, the functions fall back to a straight-
 * line estimate so the app remains usable — this fallback is explicit,
 * never silent (see isEstimate on the result).
 */

const ORS_PROXY_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ors-proxy`;
const AVERAGE_WALK_SPEED_MPS = 1.35; // ~4.9 km/h

export interface DirectionsResult {
  distanceM: number;
  durationS: number;
  geometry: GeoPoint[]; // decoded polyline as lat/lng pairs
  isEstimate: boolean;  // true when using the straight-line fallback
}

// --- Success cache ---
const directionsCache = new Map<string, DirectionsResult>();

// --- Failure cache ---
const FAILURE_CACHE_TTL_MS = 60000; // 1 minute
const failureCache = new Map<string, number>(); // key -> timestamp of last failure

function cacheKey(profile: string, from: GeoPoint, to: GeoPoint): string {
  const r = (n: number) => n.toFixed(5); // ~1.1m precision at the equator
  return `${profile}:${r(from.lat)},${r(from.lng)}:${r(to.lat)},${r(to.lng)}`;
}

function recentlyFailed(key: string): boolean {
  const t = failureCache.get(key);
  return t !== undefined && Date.now() - t < FAILURE_CACHE_TTL_MS;
}

// --- Throttled queue ---
const MIN_GAP_MS = 350;
let queueTail: Promise<void> = Promise.resolve();

function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queueTail.then(fn);
  queueTail = run.then(
    () => new Promise((resolve) => setTimeout(resolve, MIN_GAP_MS)),
    () => new Promise((resolve) => setTimeout(resolve, MIN_GAP_MS))
  );
  return run;
}

async function fetchOrsDirections(profile: 'foot-walking' | 'driving-car', from: GeoPoint, to: GeoPoint) {
  const res = await fetch(`${ORS_PROXY_BASE}?profile=${profile}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      coordinates: [
        [from.lng, from.lat],
        [to.lng, to.lat],
      ],
    }),
  });

  if (!res.ok) throw new Error(`ORS proxy returned ${res.status}`);

  const data = await res.json();
  const feature = data.features?.[0];
  const summary = feature?.properties?.summary;
  const coords: [number, number][] = feature?.geometry?.coordinates ?? [];

  return {
    distanceM: summary?.distance as number | undefined,
    durationS: summary?.duration as number | undefined,
    geometry: coords.map(([lng, lat]) => ({ lat, lng })),
  };
}

export async function walkingDirections(from: GeoPoint, to: GeoPoint): Promise<DirectionsResult> {
  const key = cacheKey('foot-walking', from, to);

  const cached = directionsCache.get(key);
  if (cached) return cached;

  if (recentlyFailed(key)) {
    const distanceM = distanceMeters(from, to);
    return {
      distanceM,
      durationS: distanceM / AVERAGE_WALK_SPEED_MPS,
      geometry: [from, to],
      isEstimate: true,
    };
  }

  try {
    const { distanceM, durationS, geometry } = await throttled(() => fetchOrsDirections('foot-walking', from, to));
    const result: DirectionsResult = {
      distanceM: distanceM ?? distanceMeters(from, to),
      durationS: durationS ?? distanceMeters(from, to) / AVERAGE_WALK_SPEED_MPS,
      geometry: geometry.length > 0 ? geometry : [from, to],
      isEstimate: false,
    };
    directionsCache.set(key, result);
    return result;
  } catch {
    failureCache.set(key, Date.now());
    const distanceM = distanceMeters(from, to);
    return {
      distanceM,
      durationS: distanceM / AVERAGE_WALK_SPEED_MPS,
      geometry: [from, to],
      isEstimate: true,
    };
  }
}

const ROAD_CURVATURE_FACTOR = 1.3; // real road distance vs. straight-line, typical urban ratio
const AVERAGE_MOTORBIKE_SPEED_MPS = 8.3; // ~30 km/h average incl. Jakarta traffic + lane-splitting

export async function drivingDirections(from: GeoPoint, to: GeoPoint): Promise<DirectionsResult> {
  const key = cacheKey('driving-car', from, to);

  const cached = directionsCache.get(key);
  if (cached) return cached;

  if (recentlyFailed(key)) {
    const distanceM = distanceMeters(from, to) * ROAD_CURVATURE_FACTOR;
    return {
      distanceM,
      durationS: distanceM / AVERAGE_MOTORBIKE_SPEED_MPS,
      geometry: [from, to],
      isEstimate: true,
    };
  }

  try {
    const { distanceM, durationS, geometry } = await throttled(() => fetchOrsDirections('driving-car', from, to));
    const finalDistanceM = distanceM ?? distanceMeters(from, to) * ROAD_CURVATURE_FACTOR;
    const result: DirectionsResult = {
      distanceM: finalDistanceM,
      durationS: durationS ?? finalDistanceM / AVERAGE_MOTORBIKE_SPEED_MPS,
      geometry: geometry.length > 0 ? geometry : [from, to],
      isEstimate: false,
    };
    directionsCache.set(key, result);
    return result;
  } catch {
    failureCache.set(key, Date.now());
    const distanceM = distanceMeters(from, to) * ROAD_CURVATURE_FACTOR;
    return {
      distanceM,
      durationS: distanceM / AVERAGE_MOTORBIKE_SPEED_MPS,
      geometry: [from, to],
      isEstimate: true,
    };
  }
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