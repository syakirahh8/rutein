import type {
  ConfusedModeLocation,
  NearbyPlace,
  NearbyTransport,
  CurrentRoute,
  Destination,
  SelectedMapPlace,
  ConfusedModeAIContext,
  AIContextDisruption,
  LocationStatus,
  NearbyContextStatus,
  NavigationResolutionStatus,
  AIContextNavigationResult,
} from '@/types/confusedMode.types';
import type { Disruption } from '@/types/database.types';
import type { FetchStatus } from '@/hooks/useNearbyContext';

const MAX_NEARBY_PLACES = 8;
const MAX_NEARBY_TRANSPORT = 8;

export interface BuildAIContextInput {
  location: ConfusedModeLocation | null;
  addressLoading: boolean;
  nearbyPlaces: NearbyPlace[];
  nearbyTransport: NearbyTransport[];
  placesStatus: FetchStatus;
  transportStatus: FetchStatus;
  disruptions: Disruption[];
  route: CurrentRoute | null;
  destination: Destination | null;
  selectedMapPlace: SelectedMapPlace | null;
  /** New: defaults to 'not_requested' / null when this turn wasn't a navigation query. */
  navigationResolutionStatus?: NavigationResolutionStatus;
  navigationResult?: AIContextNavigationResult | null;
}

/**
 * Produces the single, strictly-typed object handed to
 * sendConfusedModeMessage. Still a pure function — the navigation result
 * (if any) is computed separately by resolveNavigationForQuery() and just
 * passed through here unmodified, same as every other field.
 */
export function buildConfusedModeAIContext(input: BuildAIContextInput): ConfusedModeAIContext {
  const {
    location,
    addressLoading,
    nearbyPlaces,
    nearbyTransport,
    placesStatus,
    transportStatus,
    disruptions,
    route,
    destination,
    selectedMapPlace,
    navigationResolutionStatus = 'not_requested',
    navigationResult = null,
  } = input;

  const currentLocation = location
    ? {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracyMeters: location.accuracy,
        address: location.address,
        addressVerified: location.addressVerified,
      }
    : null;

  const locationStatus: LocationStatus = !location
    ? 'unavailable'
    : location.addressVerified
      ? 'ready'
      : addressLoading
        ? 'pending_address'
        : 'unavailable';

  return {
    currentLocation,
    locationStatus,
    nearbyPlaces: nearbyPlaces.slice(0, MAX_NEARBY_PLACES).map((place) => ({
      name: place.name,
      category: place.category,
      address: place.address,
      distanceMeters: place.distanceMeters,
    })),
    nearbyTransport: nearbyTransport.slice(0, MAX_NEARBY_TRANSPORT).map((stop) => ({
      name: stop.name,
      type: stop.type,
      distanceMeters: stop.distanceMeters,
    })),
    nearbyContextStatus: combineFetchStatus(placesStatus, transportStatus),
    activeDisruptions: disruptions.map(toAIContextDisruption),
    route,
    destination,
    selectedMapPlace,
    navigationResolutionStatus,
    navigationResult,
  };
}

function combineFetchStatus(
  placesStatus: FetchStatus,
  transportStatus: FetchStatus
): NearbyContextStatus {
  if (placesStatus === 'loading' || transportStatus === 'loading') return 'loading';
  if (placesStatus === 'idle' && transportStatus === 'idle') return 'idle';

  const succeeded = [placesStatus, transportStatus].filter((status) => status === 'success').length;
  const failed = [placesStatus, transportStatus].filter((status) => status === 'error').length;

  if (failed === 2) return 'failed';
  if (failed === 1 && succeeded >= 1) return 'partial';
  return 'complete';
}

function toAIContextDisruption(disruption: Disruption): AIContextDisruption {
  return {
    title: disruption.title,
    description: disruption.description,
    severity: disruption.severity,
    status: disruption.status,
    affectedLocations: disruption.affected_locations,
  };
}