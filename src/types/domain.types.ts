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
