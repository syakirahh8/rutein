import { useEffect, useState } from 'react';
import type { CurrentRoute, Destination, SelectedMapPlace } from '@/types/confusedMode.types';

function readLocalStorage<T>(keys: string[]): T | null {
  if (typeof window === 'undefined') {
    return null;
  }

  for (const key of keys) {
    try {
      const value = window.localStorage.getItem(key);

      if (!value) continue;

      return JSON.parse(value) as T;
    } catch {
      // Ignore malformed local storage.
    }
  }

  return null;
}

export interface RestoredNavigationContext {
  route: CurrentRoute | null;
  destination: Destination | null;
  selectedMapPlace: SelectedMapPlace | null;
}

/**
 * Picks up route/destination/place context the map page may have left
 * in localStorage. This is user-provided navigation context, not
 * something Confused Mode verified itself — it's passed through to the
 * AI context as-is but never used to derive GPS-based facts like
 * district or address.
 */
export function useRestoredNavigationContext(): RestoredNavigationContext {
  const [context, setContext] = useState<RestoredNavigationContext>({
    route: null,
    destination: null,
    selectedMapPlace: null,
  });

  useEffect(() => {
    const route = readLocalStorage<CurrentRoute>([
      'rutein_current_route',
      'currentRoute',
      'activeRoute',
      'route',
    ]);

    const destination = readLocalStorage<Destination>([
      'rutein_destination',
      'destination',
      'selectedDestination',
    ]);

    const selectedMapPlace = readLocalStorage<SelectedMapPlace>([
      'rutein_selected_place',
      'selectedMapPlace',
      'selectedPlace',
    ]);

    setContext({ route, destination, selectedMapPlace });
  }, []);

  return context;
}