import type { GeoPoint } from '@/types/domain.types';

/**
 * Mapillary Graph API v4 client — used only to locate the nearest available
 * street-level image ID near a clicked point. Actual image rendering is
 * handled by mapillary-js's Viewer component (see StreetViewModal.tsx),
 * this file only does the "find an image near here" lookup.
 *
 * Requires a free Mapillary account + client token:
 * https://www.mapillary.com/dashboard/developers -> create an app ->
 * copy the "Client Token" (starts with MLY|...) into VITE_MAPILLARY_TOKEN.
 */

const GRAPH_API_BASE = 'https://graph.mapillary.com/images';

// Progressively widen the search box if nothing is found close by —
// Mapillary coverage is real-world crowdsourced and very uneven, so a
// single small radius would report "no imagery" in places that do have
// coverage a couple hundred meters away.
const SEARCH_RADII_M = [100, 300, 800, 2000];

export type MapillaryLookupResult =
  | { status: 'found'; imageId: string }
  | { status: 'not_found' }
  | { status: 'missing_token' }
  | { status: 'error'; message: string };

function getMapillaryToken(): string | undefined {
  return import.meta.env.VITE_MAPILLARY_TOKEN as string | undefined;
}

/** Converts a radius in meters to a rough lat/lng degree delta bounding box. */
function bboxAround(point: GeoPoint, radiusM: number): string {
  const latDelta = radiusM / 111_000;
  const lngDelta = radiusM / (111_000 * Math.cos((point.lat * Math.PI) / 180));
  const minLng = point.lng - lngDelta;
  const minLat = point.lat - latDelta;
  const maxLng = point.lng + lngDelta;
  const maxLat = point.lat + latDelta;
  return `${minLng},${minLat},${maxLng},${maxLat}`;
}

/**
 * Finds the closest available Mapillary image near a point, widening the
 * search radius progressively until something is found or all radii are
 * exhausted. Returns a discriminated result rather than throwing, so the
 * UI can distinguish "no token configured" from "no imagery here" from
 * "network/API error" and show the right message for each.
 */
export async function findNearestImage(point: GeoPoint): Promise<MapillaryLookupResult> {
  const token = getMapillaryToken();
  if (!token) {
    return { status: 'missing_token' };
  }

  for (const radiusM of SEARCH_RADII_M) {
    try {
      const url = new URL(GRAPH_API_BASE);
      url.searchParams.set('access_token', token);
      url.searchParams.set('fields', 'id,computed_geometry');
      url.searchParams.set('bbox', bboxAround(point, radiusM));
      url.searchParams.set('limit', '1');

      const res = await fetch(url.toString());

      if (!res.ok) {
        // Invalid/expired token surfaces as 401/400 from the Graph API.
        if (res.status === 401 || res.status === 400) {
          return { status: 'error', message: 'Mapillary rejected the request — check that VITE_MAPILLARY_TOKEN is a valid client token.' };
        }
        continue; // try a wider radius on transient errors
      }

      const data = await res.json();
      const first = data?.data?.[0];
      if (first?.id) {
        return { status: 'found', imageId: first.id };
      }
    } catch {
      // Network failure on this radius attempt — try the next, wider one.
      continue;
    }
  }

  return { status: 'not_found' };
}
