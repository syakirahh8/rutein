import { searchPlaces } from '@/services/geocodingService';
import { planAndCompareRoutes } from '@/services/routeService';
import type { GpsPosition } from '@/types/confusedMode.types';
import type {
  AIContextNavigationResult,
  NavigationResolutionStatus,
} from '@/types/confusedMode.types';

// NOTE: PlaceResult's exact type (src/types/domain.types.ts) wasn't
// available when this was written. Its shape is inferred from
// geocodingService.ts's toPlaceResult(): { lat, lng, label, address,
// placeId }, all required. If `address` is actually optional/nullable
// there, the `address: originAddress ?? ''` fallback below still works
// either way — but worth a quick confirm against the real type.
interface PlaceResultLike {
  lat: number;
  lng: number;
  label: string;
  address: string;
  placeId: string;
}

export interface ResolveNavigationResult {
  status: NavigationResolutionStatus;
  navigationResult: AIContextNavigationResult | null;
}

/**
 * Resolves a natural-language destination into a real, calculated route
 * comparison. This is the piece that was entirely missing before: it
 * turns "Pasar Rebo" into actual geocoded coordinates (via the existing
 * Nominatim-backed geocodingService, same throttled queue as everything
 * else) and then a real Efficient/Cheapest/Hurry comparison (via the
 * existing routeService — no routing logic duplicated here).
 *
 * Every number in the returned result came from mapService (real or
 * clearly-flagged-estimate walking/driving directions) or routeService's
 * fare/speed model. Nothing here is invented, and nothing here is passed
 * through the AI to compute — that's the whole point.
 */
export async function resolveNavigationForQuery(
  destinationQuery: string,
  origin: GpsPosition | null,
  originAddress: string | null
): Promise<ResolveNavigationResult> {
  if (!origin) {
    return { status: 'no_origin', navigationResult: null };
  }

  let candidates: PlaceResultLike[];

  try {
    candidates = (await searchPlaces(destinationQuery, 5)) as PlaceResultLike[];
  } catch (error) {
    console.warn('Destination geocoding failed:', error);
    return { status: 'error', navigationResult: null };
  }

  if (candidates.length === 0) {
    return { status: 'not_found', navigationResult: null };
  }

  // Take the top-ranked match. searchPlaces is Jakarta-biased and returns
  // Nominatim's own relevance ordering, so this is a reasonable default —
  // but it means genuine ambiguity (e.g. two similarly-named places) isn't
  // surfaced to the user for disambiguation yet. See conversation notes
  // for this as a known follow-up rather than something fixed here.
  const destination = candidates[0];

  const originPlace: PlaceResultLike = {
    lat: origin.latitude,
    lng: origin.longitude,
    label: 'Current location',
    address: originAddress ?? '',
    placeId: 'current-location',
  };

  try {
    const comparison = await planAndCompareRoutes(
      originPlace as unknown as Parameters<typeof planAndCompareRoutes>[0],
      destination as unknown as Parameters<typeof planAndCompareRoutes>[1]
    );

    if (comparison.options.length === 0) {
      return { status: 'not_found', navigationResult: null };
    }

    const navigationResult: AIContextNavigationResult = {
      destinationQuery,
      resolvedDestination: {
        name: destination.label,
        address: destination.address,
        latitude: destination.lat,
        longitude: destination.lng,
      },
      options: comparison.options.map((option) => ({
        category: option.category,
        label: option.label,
        description: option.description,
        totalDistanceMeters: Math.round(option.totalDistanceM),
        totalDurationSeconds: Math.round(option.totalDurationS),
        totalCostIdr: option.totalCostIdr,
        transfers: option.transfers,
        arrivalTime: option.arrivalTime,
        legs: option.legs.map((leg) => ({
          mode: leg.mode,
          routeLabel: leg.routeLabel ?? null,
          fromLabel: 'label' in leg.from ? (leg.from.label as string | undefined) ?? null : null,
          toLabel: 'label' in leg.to ? (leg.to.label as string | undefined) ?? null : null,
          distanceMeters: Math.round(leg.distanceM),
          durationSeconds: Math.round(leg.durationS),
          estimatedCostIdr: leg.estimatedCostIdr,
          instructions: leg.instructions,
        })),
      })),
    };

    return { status: 'resolved', navigationResult };
  } catch (error) {
    console.warn('Route planning failed:', error);
    return { status: 'error', navigationResult: null };
  }
}