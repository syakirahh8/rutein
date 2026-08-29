/**
 * Shared types for Confused Mode. These are the single source of truth
 * for what counts as a "verified fact" the AI is allowed to use — see
 * ConfusedModeAIContext at the bottom, which is deliberately the only
 * shape ever sent to the AI.
 */

export interface GpsPosition {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export interface ConfusedModeLocation extends GpsPosition {
  address: string | null;
  addressVerified: boolean;
}

export interface NearbyPlace {
  name: string;
  category: string | null;
  latitude: number;
  longitude: number;
  distanceMeters: number | null;
  address: string | null;
}

export interface NearbyTransport {
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  distanceMeters: number | null;
}

export interface RouteStep {
  instruction: string;
  distanceMeters?: number;
}

export interface CurrentRoute {
  destinationName?: string;
  distanceMeters?: number;
  durationSeconds?: number;
  steps?: RouteStep[];
}

export interface Destination {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface SelectedMapPlace {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
}

/* ============================================================
   AI-ready context — the ONLY shape sent to sendConfusedModeMessage.
============================================================ */

export interface AIContextLocation {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  address: string | null;
  addressVerified: boolean;
}

export interface AIContextPlace {
  name: string;
  category: string | null;
  address: string | null;
  distanceMeters: number | null;
}

export interface AIContextTransport {
  name: string;
  type: string;
  distanceMeters: number | null;
}

export interface AIContextDisruption {
  title: string;
  description: string | null;
  severity: string;
  status: string;
  affectedLocations: string[];
}

export type LocationStatus = 'ready' | 'pending_address' | 'unavailable';
export type NearbyContextStatus = 'idle' | 'loading' | 'complete' | 'partial' | 'failed';

/* ============================================================
   Navigation resolution — populated only when the user's message was
   detected as a route request AND resolveNavigationForQuery() actually
   ran a real geocode + route calculation. Every number here comes from
   mapService (real/estimated walking & driving directions) or
   routeService's fare/speed model — never from the AI.
============================================================ */

export type NavigationResolutionStatus =
  | 'not_requested' // message wasn't a navigation request
  | 'resolved'      // destination geocoded and at least one route found
  | 'not_found'     // geocoding returned zero candidates
  | 'no_origin'     // GPS position not available yet
  | 'error';        // geocoding or routing threw

export interface AIContextRouteLeg {
  mode: string;
  routeLabel: string | null;
  fromLabel: string | null;
  toLabel: string | null;
  distanceMeters: number;
  durationSeconds: number;
  estimatedCostIdr: number;
  /** Precomputed human instruction, e.g. "Ride Koridor 1 from Blok M to Kota." Not for the AI to reword into new facts, only to relay. */
  instructions: string;
}

export interface AIContextRouteOption {
  category: string; // 'efficient' | 'cheapest' | 'hurry'
  label: string;
  description: string;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  totalCostIdr: number;
  transfers: number;
  arrivalTime: string;
  legs: AIContextRouteLeg[];
}

export interface AIContextNavigationResult {
  destinationQuery: string;
  resolvedDestination: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  options: AIContextRouteOption[];
}

export interface ConfusedModeAIContext {
  currentLocation: AIContextLocation | null;
  locationStatus: LocationStatus;
  nearbyPlaces: AIContextPlace[];
  nearbyTransport: AIContextTransport[];
  nearbyContextStatus: NearbyContextStatus;
  activeDisruptions: AIContextDisruption[];
  route: CurrentRoute | null;
  destination: Destination | null;
  selectedMapPlace: SelectedMapPlace | null;
  /** New: result of resolving a natural-language destination this turn, if any. */
  navigationResolutionStatus: NavigationResolutionStatus;
  navigationResult: AIContextNavigationResult | null;
}