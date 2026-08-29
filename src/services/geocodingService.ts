import type { PlaceResult } from '@/types/domain.types';

/**
 * Geocoding provider abstraction.
 *
 * Default: OpenStreetMap Nominatim (https://nominatim.org) — free, no API
 * key required, but rate-limited (~1 req/sec) and requires a descriptive
 * User-Agent/Referer per their usage policy. Good enough for a student
 * project's search-as-you-type UX with light debouncing.
 *
 * IMPORTANT: Nominatim's rate limit applies per client IP across the
 * *entire* domain, not per endpoint — a /search call and a /reverse call
 * fired close together both count against the same budget. Every request
 * in this file (and anywhere else that wants to call Nominatim) must go
 * through the shared `throttled()` queue below, or independent callers
 * with their own debounce timers can race each other into a 429 exactly
 * like happened when the nearby-place search and reverse-geocode effects
 * in ConfusedMode fired ~100ms apart from separate timers.
 *
 * To swap providers later (Mapbox, LocationIQ, Google Places), implement
 * the same functions in a new file and swap the import in consuming
 * components — nothing else needs to change.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

// Bias results toward Jakarta / Jabodetabek since this app's transit data
// currently covers that area most densely. `bounded=0` below means this is
// a soft bias, not a hard restriction — searches for other Indonesian
// cities (Surabaya, Bandung, Yogyakarta, Medan, etc.) still work, they're
// just ranked slightly lower than Jakarta-area matches.
const JAKARTA_VIEWBOX = '106.5,-6.5,107.1,-5.9';

// --- Shared throttled queue ---
// Every Nominatim request in the app funnels through here so concurrent
// callers (nearby search, reverse geocode, search-as-you-type) can never
// stack requests closer together than Nominatim's usage policy allows.
const MIN_GAP_MS = 1100; // a little over 1/sec, for safety margin
let queueTail: Promise<void> = Promise.resolve();

function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queueTail.then(fn);
  queueTail = run.then(
    () => new Promise((resolve) => setTimeout(resolve, MIN_GAP_MS)),
    () => new Promise((resolve) => setTimeout(resolve, MIN_GAP_MS))
  );
  return run;
}

function toPlaceResult(item: any): PlaceResult {
  return {
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    label: item.name || item.display_name?.split(',')[0] || item.display_name,
    address: item.display_name,
    placeId: String(item.place_id ?? item.osm_id),
  };
}

export async function searchPlaces(query: string, limit = 6): Promise<PlaceResult[]> {
  if (!query || query.trim().length < 2) return [];

  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('viewbox', JAKARTA_VIEWBOX);
  url.searchParams.set('bounded', '0'); // bias, don't hard-restrict
  url.searchParams.set('countrycodes', 'id'); // keep results within Indonesia

  return throttled(async () => {
    const res = await fetch(url.toString(), {
      headers: {
        // Nominatim's usage policy asks for an identifying header.
        'Accept-Language': 'id,en',
      },
    });

    if (!res.ok) {
      throw new Error(`Geocoding search failed (${res.status})`);
    }

    const data = await res.json();
    return (data as any[]).map(toPlaceResult);
  });
}

/**
 * Category search hard-restricted to a radius around a point (e.g. "find
 * Indomaret near me"). Unlike searchPlaces, `bounded=1` is used so a
 * generic term can't match a literally-named place anywhere on Earth —
 * results are also re-checked against the actual radius afterward, since
 * a rectangular viewbox has corners further away than the radius.
 */
export async function searchNearbyCategory(
  query: string,
  lat: number,
  lng: number,
  radiusM = 3000,
  limit = 5
): Promise<PlaceResult[]> {
  // Rough degrees-per-meter box around the point.
  const degDelta = radiusM / 111_000;

  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set(
    'viewbox',
    `${lng - degDelta},${lat + degDelta},${lng + degDelta},${lat - degDelta}`
  );
  url.searchParams.set('bounded', '1'); // hard restrict to the viewbox

  const results = await throttled(async () => {
    const res = await fetch(url.toString(), {
      headers: { 'Accept-Language': 'id,en' },
    });

    if (!res.ok) {
      throw new Error(`Nearby category search failed (${res.status})`);
    }

    const data = await res.json();
    return (data as any[]).map(toPlaceResult);
  });

  // Second line of defense: drop anything the rectangular viewbox let
  // through that's actually further than radiusM in a straight line.
  const earthRadius = 6371000;
  const toRad = (n: number) => (n * Math.PI) / 180;

  return results.filter((place) => {
    const dLat = toRad(place.lat - lat);
    const dLng = toRad(place.lng - lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat)) * Math.cos(toRad(place.lat)) * Math.sin(dLng / 2) ** 2;
    const distance = 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return distance <= radiusM;
  });
}

export async function reverseGeocode(lat: number, lng: number): Promise<PlaceResult | null> {
  const url = new URL(`${NOMINATIM_BASE}/reverse`);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('format', 'jsonv2');

  return throttled(async () => {
    const res = await fetch(url.toString(), {
      headers: { 'Accept-Language': 'id,en' },
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.error) return null;
    return toPlaceResult(data);
  });
}

// Simple debounce helper for search-as-you-type inputs.
export function debounce<Args extends unknown[]>(fn: (...args: Args) => void, delayMs = 400) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}