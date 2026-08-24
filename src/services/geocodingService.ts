import type { PlaceResult } from '@/types/domain.types';

/**
 * Geocoding provider abstraction.
 *
 * Default: OpenStreetMap Nominatim (https://nominatim.org) — free, no API
 * key required, but rate-limited (~1 req/sec) and requires a descriptive
 * User-Agent/Referer per their usage policy. Good enough for a student
 * project's search-as-you-type UX with light debouncing.
 *
 * To swap providers later (Mapbox, LocationIQ, Google Places), implement
 * the same three functions in a new file and swap the import in
 * consuming components — nothing else needs to change.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

// Bias results toward Jakarta / Jabodetabek since this app's transit data
// currently covers that area most densely. `bounded=0` below means this is
// a soft bias, not a hard restriction — searches for other Indonesian
// cities (Surabaya, Bandung, Yogyakarta, Medan, etc.) still work, they're
// just ranked slightly lower than Jakarta-area matches.
const JAKARTA_VIEWBOX = '106.5,-6.5,107.1,-5.9';

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
}

export async function reverseGeocode(lat: number, lng: number): Promise<PlaceResult | null> {
  const url = new URL(`${NOMINATIM_BASE}/reverse`);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('format', 'jsonv2');

  const res = await fetch(url.toString(), {
    headers: { 'Accept-Language': 'id,en' },
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (!data || data.error) return null;
  return toPlaceResult(data);
}

// Simple debounce helper for search-as-you-type inputs.
export function debounce<Args extends unknown[]>(fn: (...args: Args) => void, delayMs = 400) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}
