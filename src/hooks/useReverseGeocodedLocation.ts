import { useEffect, useRef, useState } from 'react';
import { reverseGeocode } from '@/services/geocodingService';
import { distanceMeters } from '@/services/locationService';
import type { GpsPosition } from '@/types/confusedMode.types';

const MOVEMENT_THRESHOLD_M = 150;
const DEBOUNCE_MS = 900;

export interface UseReverseGeocodedLocationResult {
  address: string | null;
  addressVerified: boolean;
  loading: boolean;
}

/**
 * Resolves a GPS position into a human-readable address. Debounced and
 * gated by a movement threshold so GPS jitter doesn't spam Nominatim's
 * rate-limited /reverse endpoint (shared throttle lives in
 * geocodingService.ts, same as before).
 *
 * `addressVerified` is the single source of truth the rest of the app
 * uses to decide whether the AI may treat this location as a named
 * place. It is only ever true once a real reverse-geocode result has
 * come back — never inferred from having coordinates.
 */
export function useReverseGeocodedLocation(
  position: GpsPosition | null
): UseReverseGeocodedLocationResult {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lastGeocodedRef = useRef<GpsPosition | null>(null);

  useEffect(() => {
    if (!position) {
      return;
    }

    const last = lastGeocodedRef.current;

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
    setLoading(true);

    const debounceTimer = window.setTimeout(async () => {
      if (cancelled) return;

      lastGeocodedRef.current = {
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
      };

      try {
        const result = await reverseGeocode(position.latitude, position.longitude);

        if (cancelled) return;

        if (result) {
          setAddress(result.address ?? result.label);
        }
      } catch (error) {
        console.warn('Reverse geocoding failed:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(debounceTimer);
      setLoading(false);
    };
  }, [position?.latitude, position?.longitude]);

  return { address, addressVerified: address !== null, loading };
}