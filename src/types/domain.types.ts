import type { TransportMode } from './database.types';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface PlaceResult extends GeoPoint {
  label: string;
  address: string;
  placeId?: string;
}

export interface RouteLeg {
  mode: TransportMode;
  routeLabel?: string;       // e.g. "TransJakarta Koridor 1"
  from: PlaceResult | GeoPoint;
  to: PlaceResult | GeoPoint;
  distanceM: number;
  durationS: number;
  estimatedCostIdr: number;
  isTransfer: boolean;
  instructions?: string;
  /** Ordered lat/lng points describing this leg's actual path (routed/snapped
   * polyline for walk/ojek/road-based transit, straight line for fixed-rail
   * legs where real track geometry isn't available). Always at least [from, to]. */
  geometry?: GeoPoint[];
  /** True when `geometry` is a straight-line approximation, not a routed path. */
  geometryIsEstimate?: boolean;
}

export interface RouteOption {
  id: string;                                  // client-generated uuid for this computed option
  legs: RouteLeg[];
  totalDistanceM: number;
  totalDurationS: number;
  totalCostIdr: number;
  transfers: number;
  walkingDistanceM: number;
  modesUsed: TransportMode[];
  category?: 'cheapest' | 'fastest' | 'moderate';
  score?: number;                               // lower = better, for 'moderate' ranking
}

export interface RouteComparisonResult {
  options: RouteOption[];
  cheapest: RouteOption | null;
  fastest: RouteOption | null;
  moderate: RouteOption | null;
}