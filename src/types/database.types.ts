// Hand-written types mirroring the Supabase schema in /supabase/migrations.
// Regenerate with `supabase gen types typescript` once the project is linked
// for a fully generated, always-in-sync version.

export type TransportMode = 'walk' | 'bus' | 'transjakarta' | 'mrt' | 'krl' | 'lrt' | 'other';
export type PlaceCategory = 'home' | 'school' | 'workplace' | 'custom';
export type RouteType = 'cheapest' | 'fastest' | 'balanced';
export type TravelPeriod = 'daily' | 'weekly' | 'monthly';
export type DisruptionType =
  | 'delay'
  | 'route_closure'
  | 'traffic'
  | 'station_closure'
  | 'service_interruption'
  | 'other';
export type DisruptionSeverity = 'low' | 'moderate' | 'high' | 'critical';
export type DisruptionStatus = 'active' | 'monitoring' | 'resolved';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  home_location: { lat: number; lng: number; address: string } | null;
  work_location: { lat: number; lng: number; address: string } | null;
  created_at: string;
  updated_at: string;
}

export interface SavedPlace {
  id: string;
  user_id: string;
  name: string;
  category: PlaceCategory;
  address: string | null;
  latitude: number;
  longitude: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  user_id: string;
  preferred_transport: TransportMode[];
  max_walking_distance_m: number;
  prioritize_cheapest: boolean;
  prioritize_fastest: boolean;
  avoid_transfers: boolean;
  default_home_place_id: string | null;
  default_work_place_id: string | null;
  updated_at: string;
}

export interface RecentDestination {
  id: string;
  user_id: string;
  label: string;
  address: string | null;
  latitude: number;
  longitude: number;
  searched_at: string;
}

export interface RouteSearch {
  id: string;
  user_id: string | null;
  origin: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string };
  selected_route_id: string | null;
  created_at: string;
}

export interface TransportRoute {
  id: string;
  mode: TransportMode;
  route_code: string | null;
  route_name: string;
  operator: string | null;
  color: string | null;
  is_active: boolean;
  source: 'official' | 'fallback';
  created_at: string;
  updated_at: string;
}

export interface TransportStop {
  id: string;
  route_id: string | null;
  stop_name: string;
  latitude: number;
  longitude: number;
  sequence_order: number | null;
  is_transfer_point: boolean;
  created_at: string;
}

export interface TransportSchedule {
  id: string;
  route_id: string;
  stop_id: string | null;
  scheduled_departure: string | null;
  estimated_departure: string | null;
  status: 'on_time' | 'delayed' | 'cancelled' | 'unknown';
  is_fallback: boolean;
  last_updated: string;
  created_at: string;
}

export interface Disruption {
  id: string;
  title: string;
  description: string | null;
  disruption_type: DisruptionType;
  severity: DisruptionSeverity;
  affected_route_ids: string[];
  affected_route_labels: string[];
  affected_locations: string[];
  status: DisruptionStatus;
  is_fallback: boolean;
  source: string | null;
  starts_at: string;
  last_updated: string;
  resolved_at: string | null;
  created_at: string;
}

export interface BudgetPlan {
  id: string;
  user_id: string;
  name: string;
  destination_label: string;
  destination_lat: number;
  destination_lng: number;
  origin_label: string | null;
  origin_lat: number | null;
  origin_lng: number | null;
  travel_period: TravelPeriod;
  trips_per_period: number;
  preferred_route_type: RouteType;
  estimated_cost_per_trip: number | null;
  estimated_daily_cost: number | null;
  estimated_weekly_cost: number | null;
  estimated_monthly_cost: number | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetPlanRoute {
  id: string;
  budget_plan_id: string;
  route_label: string;
  route_type: RouteType | null;
  total_cost_idr: number;
  total_duration_s: number | null;
  transfers: number;
  route_snapshot: unknown;
  created_at: string;
}

export interface JourneyLeg {
  id: string;
  route_search_id: string | null;
  leg_order: number;
  mode: TransportMode;
  route_id: string | null;
  route_label: string | null;
  from_name: string;
  from_lat: number;
  from_lng: number;
  to_name: string;
  to_lat: number;
  to_lng: number;
  distance_m: number | null;
  duration_s: number | null;
  estimated_cost_idr: number;
  is_transfer: boolean;
  created_at: string;
}

// Minimal Database generic so supabase-js typing works without
// running the full codegen step.
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      saved_places: { Row: SavedPlace; Insert: Partial<SavedPlace>; Update: Partial<SavedPlace> };
      user_preferences: { Row: UserPreferences; Insert: Partial<UserPreferences>; Update: Partial<UserPreferences> };
      recent_destinations: { Row: RecentDestination; Insert: Partial<RecentDestination>; Update: Partial<RecentDestination> };
      route_searches: { Row: RouteSearch; Insert: Partial<RouteSearch>; Update: Partial<RouteSearch> };
      transport_routes: { Row: TransportRoute; Insert: Partial<TransportRoute>; Update: Partial<TransportRoute> };
      transport_stops: { Row: TransportStop; Insert: Partial<TransportStop>; Update: Partial<TransportStop> };
      transport_schedules: { Row: TransportSchedule; Insert: Partial<TransportSchedule>; Update: Partial<TransportSchedule> };
      disruptions: { Row: Disruption; Insert: Partial<Disruption>; Update: Partial<Disruption> };
      budget_plans: { Row: BudgetPlan; Insert: Partial<BudgetPlan>; Update: Partial<BudgetPlan> };
      budget_plan_routes: { Row: BudgetPlanRoute; Insert: Partial<BudgetPlanRoute>; Update: Partial<BudgetPlanRoute> };
      journey_legs: { Row: JourneyLeg; Insert: Partial<JourneyLeg>; Update: Partial<JourneyLeg> };
    };
  };
}
