import { useEffect, useState } from 'react';
import type { GpsPosition } from '@/types/confusedMode.types';

export interface UseCurrentLocationResult {
  position: GpsPosition | null;
  loading: boolean;
  error: string | null;
}

/**
 * Watches the browser's GPS position. This hook owns geolocation
 * lifecycle only — no geocoding, no nearby search, no address. That's
 * deliberate: GPS coordinates alone are not a verified human-readable
 * location, and this hook's return type reflects that (no `address`
 * field exists here at all).
 */
export function useCurrentLocation(): UseCurrentLocationResult {
  const [position, setPosition] = useState<GpsPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      setLoading(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (geoPosition) => {
        setPosition({
          latitude: geoPosition.coords.latitude,
          longitude: geoPosition.coords.longitude,
          accuracy: geoPosition.coords.accuracy,
        });

        setError(null);
        setLoading(false);
      },
      (geoError) => {
        console.error('Confused Mode location error:', geoError);

        let message = 'Unable to detect your location.';

        if (geoError.code === geoError.PERMISSION_DENIED) {
          message =
            'Location permission was denied. Enable location access so Rutein can guide you.';
        }

        if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          message = 'Your current location is unavailable.';
        }

        if (geoError.code === geoError.TIMEOUT) {
          message = 'Location detection timed out. Trying again...';
        }

        setError(message);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return { position, loading, error };
}
