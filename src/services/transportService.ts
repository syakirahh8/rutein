import { supabase } from '@/lib/supabaseClient';
import type { TransportRoute, TransportStop, TransportSchedule, Disruption } from '@/types/database.types';
import { handleSupabaseError } from './supabaseService';
import { distanceMeters } from './locationService';
import type { GeoPoint } from '@/types/domain.types';

export async function getAllRoutes(): Promise<TransportRoute[]> {
  const { data, error } = await supabase.from('transport_routes').select('*').eq('is_active', true);
  if (error) handleSupabaseError('getAllRoutes', error);
  return data ?? [];
}

export async function getStopsForRoute(routeId: string): Promise<TransportStop[]> {
  const { data, error } = await supabase
    .from('transport_stops')
    .select('*')
    .eq('route_id', routeId)
    .order('sequence_order', { ascending: true });
  if (error) handleSupabaseError('getStopsForRoute', error);
  return data ?? [];
}

/** Finds transit stops within `radiusM` meters of a point, across all routes. */
export async function findNearbyStops(point: GeoPoint, radiusM = 800): Promise<(TransportStop & { distanceM: number })[]> {
  // Nominal bounding box pre-filter (cheap), then precise haversine filter client-side.
  const degDelta = radiusM / 111_000; // rough meters-per-degree
  const { data, error } = await supabase
    .from('transport_stops')
    .select('*')
    .gte('latitude', point.lat - degDelta)
    .lte('latitude', point.lat + degDelta)
    .gte('longitude', point.lng - degDelta)
    .lte('longitude', point.lng + degDelta);

  if (error) handleSupabaseError('findNearbyStops', error);

  return (data ?? [])
    .map((stop) => ({ ...stop, distanceM: distanceMeters(point, { lat: stop.latitude, lng: stop.longitude }) }))
    .filter((stop) => stop.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM);
}

export async function getSchedulesForRoute(routeId: string): Promise<TransportSchedule[]> {
  const { data, error } = await supabase
    .from('transport_schedules')
    .select('*')
    .eq('route_id', routeId)
    .order('scheduled_departure', { ascending: true });
  if (error) handleSupabaseError('getSchedulesForRoute', error);
  return data ?? [];
}

export async function getActiveDisruptions(): Promise<Disruption[]> {
  const { data, error } = await supabase
    .from('disruptions')
    .select('*')
    .in('status', ['active', 'monitoring'])
    .order('severity', { ascending: false })
    .order('starts_at', { ascending: false });
  if (error) handleSupabaseError('getActiveDisruptions', error);
  return data ?? [];
}

/** Subscribes to realtime disruption changes. Returns an unsubscribe function. */
export function subscribeToDisruptions(onChange: (disruption: Disruption) => void): () => void {
  const channel = supabase
    .channel('disruptions-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'disruptions' },
      (payload) => onChange(payload.new as Disruption)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/** Subscribes to realtime schedule updates for a given route. */
export function subscribeToScheduleUpdates(routeId: string, onChange: (schedule: TransportSchedule) => void): () => void {
  const channel = supabase
    .channel(`schedules-${routeId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'transport_schedules', filter: `route_id=eq.${routeId}` },
      (payload) => onChange(payload.new as TransportSchedule)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
