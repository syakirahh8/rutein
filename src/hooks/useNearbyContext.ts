import { useEffect, useRef, useState } from 'react';
import { findNearbyStops } from '@/services/transportService';
import { searchNearbyCategory } from '@/services/geocodingService';
import { distanceMeters } from '@/services/locationService';
import {
  INDONESIA_TRANSPORT_DATA,
  TRANSPORT_TYPE_LABELS,
} from '@/data/indonesiaTransportData';
import type { TransportMode } from '@/types/database.types';
import type { GpsPosition, NearbyPlace, NearbyTransport } from '@/types/confusedMode.types';

// Display labels for the TransportMode enum on transport_routes, used
// when rendering stops joined in via findNearbyStops.
const TRANSPORT_MODE_LABELS: Record<TransportMode, string> = {
  walk: 'Walking route',
  bus: 'Bus',
  transjakarta: 'TransJakarta',
  mrt: 'MRT',
  krl: 'KRL Commuter',
  lrt: 'LRT',
  train: 'Intercity Train',
  airport_rail: 'Airport Rail',
  ferry: 'Ferry',
  ojek: 'Ojek',
  other: 'Transit',
};

export type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseNearbyContextResult {
  places: NearbyPlace[];
  transport: NearbyTransport[];
  placesStatus: FetchStatus;
  transportStatus: FetchStatus;
}

const SEARCH_RADIUS_M = 3000;
const MOVEMENT_THRESHOLD_M = 150;
const DEBOUNCE_MS = 800;
const MAX_RESULTS_PER_CATEGORY = 20;

// Only categories Nominatim's free-text search is actually reliable for.
// Transit stops come from Supabase + the curated static dataset instead —
// see the comment in the original file about `bounded=0` matching
// literally-named places anywhere on Earth for generic transit terms.
const SHOP_QUERIES = ['Indomaret', 'Alfamart'];

/**
 * Loads nearby transport (Supabase + curated static dataset, merged and
 * deduplicated) and nearby shops (Nominatim, hard-restricted to radius).
 * Places and transport have fully independent status — a Nominatim
 * failure never clears successfully-found transport, and a Supabase
 * failure never clears successfully-found shops.
 */
export function useNearbyContext(position: GpsPosition | null): UseNearbyContextResult {
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [transport, setTransport] = useState<NearbyTransport[]>([]);
  const [placesStatus, setPlacesStatus] = useState<FetchStatus>('idle');
  const [transportStatus, setTransportStatus] = useState<FetchStatus>('idle');

  const lastSearchedRef = useRef<GpsPosition | null>(null);

  useEffect(() => {
    if (!position) {
      setPlaces([]);
      setTransport([]);
      setPlacesStatus('idle');
      setTransportStatus('idle');
      return;
    }

    // Skip re-searching if we've moved less than ~150m since the last
    // successful search — GPS jitter alone shouldn't trigger a fresh
    // cascade of requests.
    const last = lastSearchedRef.current;

    if (last) {
      const moved = distanceMeters(
        { lat: last.latitude, lng: last.longitude },
        { lat: position.latitude, lng: position.longitude }
      );

      if (moved < MOVEMENT_THRESHOLD_M) {
        return;
      }
    }

    let cancelled = false;

    const debounceTimer = window.setTimeout(() => {
      if (!cancelled) {
        void loadNearbyData();
      }
    }, DEBOUNCE_MS);

    async function loadNearbyData() {
      setPlacesStatus('loading');
      setTransportStatus('loading');

      lastSearchedRef.current = {
        latitude: position!.latitude,
        longitude: position!.longitude,
        accuracy: position!.accuracy,
      };

      const lat = position!.latitude;
      const lon = position!.longitude;

      /* -------------------- TRANSPORT -------------------- */

      const transportResults: NearbyTransport[] = [];
      let supabaseFailed = false;

      // 1. Live Supabase data — real, curated, radius-exact.
      try {
        const stops = await findNearbyStops({ lat, lng: lon }, SEARCH_RADIUS_M);

        for (const stop of stops) {
          const route = stop.transport_routes;
          const modeLabel = route?.mode
            ? TRANSPORT_MODE_LABELS[route.mode] ?? route.mode
            : 'Transit stop';

          transportResults.push({
            name: stop.stop_name,
            type: route?.route_name ? `${modeLabel} — ${route.route_name}` : modeLabel,
            latitude: stop.latitude,
            longitude: stop.longitude,
            distanceMeters: stop.distanceM,
          });
        }
      } catch (error) {
        console.warn('findNearbyStops failed:', error);
        supabaseFailed = true;
      }

      if (cancelled) return;

      // 2. Curated static dataset — no network call, instant.
      for (const entry of INDONESIA_TRANSPORT_DATA) {
        const distance = distanceMeters(
          { lat, lng: lon },
          { lat: entry.latitude, lng: entry.longitude }
        );

        if (distance <= SEARCH_RADIUS_M) {
          transportResults.push({
            name: entry.name,
            type: entry.line
              ? `${TRANSPORT_TYPE_LABELS[entry.type]} — ${entry.line}`
              : TRANSPORT_TYPE_LABELS[entry.type],
            latitude: entry.latitude,
            longitude: entry.longitude,
            distanceMeters: distance,
          });
        }
      }

      if (cancelled) return;

      const uniqueTransport = Array.from(
        new Map(
          transportResults.map((item) => [
            `${item.name}-${item.latitude.toFixed(5)}-${item.longitude.toFixed(5)}`,
            item,
          ])
        ).values()
      )
        .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))
        .slice(0, MAX_RESULTS_PER_CATEGORY);

      setTransport(uniqueTransport);
      // The static dataset can't fail, so only report 'error' if
      // Supabase failed AND we ended up with nothing at all — a
      // Supabase failure alone shouldn't hide static-dataset results.
      setTransportStatus(supabaseFailed && uniqueTransport.length === 0 ? 'error' : 'success');

      /* ---------------------- PLACES ---------------------- */

      const placesResults: NearbyPlace[] = [];
      let anyShopQuerySucceeded = false;
      let anyShopQueryFailed = false;

      for (const query of SHOP_QUERIES) {
        try {
          const results = await searchNearbyCategory(query, lat, lon, SEARCH_RADIUS_M);
          anyShopQuerySucceeded = true;

          for (const result of results) {
            placesResults.push({
              name: result.label,
              category: query,
              latitude: result.lat,
              longitude: result.lng,
              distanceMeters: distanceMeters({ lat, lng: lon }, { lat: result.lat, lng: result.lng }),
              address: result.address ?? null,
            });
          }
        } catch (queryError) {
          console.warn(`Nearby search errored for "${query}":`, queryError);
          anyShopQueryFailed = true;
        }

        if (cancelled) return;
      }

      if (cancelled) return;

      const uniquePlaces = Array.from(
        new Map(
          placesResults.map((place) => [
            `${place.name}-${place.latitude.toFixed(5)}-${place.longitude.toFixed(5)}`,
            place,
          ])
        ).values()
      )
        .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))
        .slice(0, MAX_RESULTS_PER_CATEGORY);

      setPlaces(uniquePlaces);
      setPlacesStatus(anyShopQueryFailed && !anyShopQuerySucceeded ? 'error' : 'success');
    }

    return () => {
      cancelled = true;
      window.clearTimeout(debounceTimer);
    };
  }, [position?.latitude, position?.longitude]);

  return { places, transport, placesStatus, transportStatus };
}