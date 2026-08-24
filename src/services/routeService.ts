import type { GeoPoint, PlaceResult, RouteLeg, RouteOption, RouteComparisonResult } from '@/types/domain.types';
import type { TransportMode, TransportRoute, TransportStop } from '@/types/database.types';
import { walkingDirections, drivingDirections } from './mapService';
import { findNearbyStops, getAllRoutes, getStopsForRoute } from './transportService';
import { distanceMeters } from './locationService';
import { supabase } from '@/lib/supabaseClient';

// ------------------------------------------------------------------
// Cost model (flat fares, IDR) — realistic public TransJakarta/MRT/KRL
// approximations. Swap with a real fare-matrix table/API later.
// Ojek (ride-hailing motorbike) is distance-based, not flat — see
// estimateOjekFareIdr() below, matching how Gojek/Grab Bike actually price.
// ------------------------------------------------------------------
const FARE_IDR: Record<TransportMode, number> = {
  walk: 0,
  bus: 4000,
  transjakarta: 3500,
  mrt: 8000,
  krl: 4000,
  lrt: 5000,
  ojek: 0, // computed dynamically per-leg, see estimateOjekFareIdr()
  other: 5000,
};

const MODE_SPEED_MPS: Record<TransportMode, number> = {
  walk: 1.35,
  bus: 6.5,
  transjakarta: 8.5,
  mrt: 11,
  krl: 13,
  lrt: 10,
  ojek: 8.3,
  other: 7,
};

// How far a user is assumed willing to walk to reach a transit stop.
// Widened for longer trips — it's worth a 1.5-2km walk to reach a stop
// that saves many kilometers of walking/riding overall, but not worth it
// for a trip that's only a couple hundred meters to begin with.
const STOP_SEARCH_RADIUS_SHORT_M = 900;  // trips under ~5km
const STOP_SEARCH_RADIUS_LONG_M = 2200;  // trips 5km and above
const LONG_TRIP_THRESHOLD_M = 5000;

// Below this, walking the whole way is genuinely the simplest answer and
// ojek isn't worth booking. Above it, ojek becomes a real alternative.
const OJEK_MIN_DISTANCE_M = 700;

// Gojek/Grab-style motorbike ride-hailing fare model: a flat minimum fare
// covers a base distance, then a per-km rate applies beyond that.
const OJEK_BASE_FARE_IDR = 9000;
const OJEK_BASE_DISTANCE_M = 4000;
const OJEK_PER_KM_IDR = 2500;

function estimateOjekFareIdr(distanceM: number): number {
  if (distanceM <= OJEK_BASE_DISTANCE_M) return OJEK_BASE_FARE_IDR;
  const extraKm = (distanceM - OJEK_BASE_DISTANCE_M) / 1000;
  return Math.round(OJEK_BASE_FARE_IDR + extraKm * OJEK_PER_KM_IDR);
}

function estimateTransitLegDuration(distanceM: number, mode: TransportMode): number {
  return distanceM / (MODE_SPEED_MPS[mode] ?? MODE_SPEED_MPS.other);
}

function makeLegId() {
  return crypto.randomUUID();
}

/**
 * Builds a single walk-only leg between two points using real routing
 * (or the transparent straight-line fallback inside mapService).
 */
async function buildWalkLeg(from: GeoPoint | PlaceResult, to: GeoPoint | PlaceResult): Promise<RouteLeg> {
  const directions = await walkingDirections(from, to);
  return {
    mode: 'walk',
    from,
    to,
    distanceM: directions.distanceM,
    durationS: directions.durationS,
    estimatedCostIdr: 0,
    isTransfer: false,
    instructions: directions.isEstimate
      ? 'Walk to destination (estimated distance — precise walking directions unavailable).'
      : 'Walk to destination.',
  };
}

/**
 * Builds a door-to-door ojek online (ride-hailing motorbike) leg — the
 * default fallback for distances too far to walk comfortably that aren't
 * covered by a single fixed-route transit line. No walking required; the
 * driver picks up right at the origin.
 */
async function buildOjekLeg(from: GeoPoint | PlaceResult, to: GeoPoint | PlaceResult): Promise<RouteLeg> {
  const directions = await drivingDirections(from, to);
  return {
    mode: 'ojek',
    from,
    to,
    distanceM: directions.distanceM,
    durationS: directions.durationS,
    estimatedCostIdr: estimateOjekFareIdr(directions.distanceM),
    isTransfer: false,
    instructions: directions.isEstimate
      ? 'Ojek online (e.g. Gojek/Grab Bike) — door-to-door, estimated fare and time.'
      : 'Ojek online (e.g. Gojek/Grab Bike) — door-to-door.',
  };
}

/**
 * Builds one transit leg riding `route` from the stop nearest `from`
 * to the stop nearest `to`.
 */
function buildTransitLeg(
  route: TransportRoute,
  boardStop: TransportStop,
  alightStop: TransportStop
): RouteLeg {
  const distanceM = distanceMeters(
    { lat: boardStop.latitude, lng: boardStop.longitude },
    { lat: alightStop.latitude, lng: alightStop.longitude }
  );
  return {
    mode: route.mode,
    routeLabel: route.route_name,
    from: { lat: boardStop.latitude, lng: boardStop.longitude, label: boardStop.stop_name, address: boardStop.stop_name },
    to: { lat: alightStop.latitude, lng: alightStop.longitude, label: alightStop.stop_name, address: alightStop.stop_name },
    distanceM,
    durationS: estimateTransitLegDuration(distanceM, route.mode),
    estimatedCostIdr: FARE_IDR[route.mode] ?? FARE_IDR.other,
    isTransfer: false,
    instructions: `Ride ${route.route_name} from ${boardStop.stop_name} to ${alightStop.stop_name}.`,
  };
}

function summarizeOption(legs: RouteLeg[]): Omit<RouteOption, 'id' | 'category' | 'score'> {
  const totalDistanceM = legs.reduce((s, l) => s + l.distanceM, 0);
  const totalDurationS = legs.reduce((s, l) => s + l.durationS, 0);
  const totalCostIdr = legs.reduce((s, l) => s + l.estimatedCostIdr, 0);
  const transfers = legs.filter((l) => l.mode !== 'walk').length > 0 ? legs.filter((l) => l.mode !== 'walk').length - 1 : 0;
  const walkingDistanceM = legs.filter((l) => l.mode === 'walk').reduce((s, l) => s + l.distanceM, 0);
  const modesUsed = Array.from(new Set(legs.map((l) => l.mode)));

  return { legs, totalDistanceM, totalDurationS, totalCostIdr, transfers: Math.max(transfers, 0), walkingDistanceM, modesUsed };
}

/**
 * Generates candidate multi-leg journeys between origin and destination:
 *  1. Direct walk — always included as a baseline. For long trips it will
 *     naturally lose on "fastest"/"moderate" once other options exist, but
 *     it stays technically correct as "cheapest" for anyone willing to walk.
 *  2. Direct ojek online (ride-hailing motorbike) — Indonesia's default
 *     answer for medium/long distances that aren't well served by a single
 *     fixed-route transit line. Door-to-door, no walking required.
 *  3. Walk -> nearest transit stop -> ride route -> walk -> destination,
 *     for every transit route that has a stop near both origin and
 *     destination. The search radius widens for longer trips, since it's
 *     worth walking 1.5-2km to reach transit that saves many km overall.
 *  4. Ojek to the nearest usable transit hub -> ride -> walk, used only
 *     when no single route directly covers both ends but a nearby hub
 *     does — this is the "walk a short amount, then find a bus/train
 *     near there" case, reached via a short ojek hop instead of an
 *     unreasonably long walk to the hub.
 *
 * This reacts to whatever routes/stops actually exist in the
 * transport_routes/transport_stops tables rather than hardcoding cards —
 * but it's still single-hub, single-transfer planning. True multi-hop
 * pathfinding (walk -> bus -> MRT -> walk across three separate routes)
 * is a larger extension noted in the README as a known limitation.
 */
export async function generateRouteOptions(origin: PlaceResult, destination: PlaceResult): Promise<RouteOption[]> {
  const options: RouteOption[] = [];
  const directDistanceM = distanceMeters(origin, destination);

  // Option A: direct walk.
  const directWalk = await buildWalkLeg(origin, destination);
  options.push({ id: makeLegId(), ...summarizeOption([directWalk]) });

  // Option B: direct ojek online — always offered above a short minimum
  // distance, since it's realistically how most medium-distance trips in
  // Jakarta actually get made when transit doesn't line up conveniently.
  if (directDistanceM >= OJEK_MIN_DISTANCE_M) {
    const ojekLeg = await buildOjekLeg(origin, destination);
    options.push({ id: makeLegId(), ...summarizeOption([ojekLeg]) });
  }

  // Option C..N: single-route transit journeys (walk -> ride -> walk).
  const stopSearchRadiusM = directDistanceM >= LONG_TRIP_THRESHOLD_M ? STOP_SEARCH_RADIUS_LONG_M : STOP_SEARCH_RADIUS_SHORT_M;

  const [nearOrigin, nearDest, allRoutes] = await Promise.all([
    findNearbyStops(origin, stopSearchRadiusM),
    findNearbyStops(destination, stopSearchRadiusM),
    getAllRoutes(),
  ]);

  const nearDestRouteIds = new Set(nearDest.map((s) => s.route_id));
  const candidateRouteIds = new Set(
    nearOrigin.map((s) => s.route_id).filter((id): id is string => !!id && nearDestRouteIds.has(id))
  );

  for (const routeId of candidateRouteIds) {
    const route = allRoutes.find((r) => r.id === routeId);
    if (!route) continue;

    const boardStop = nearOrigin.find((s) => s.route_id === routeId);
    const alightStop = nearDest.find((s) => s.route_id === routeId);
    if (!boardStop || !alightStop || boardStop.id === alightStop.id) continue;

    const walkToStop = await buildWalkLeg(origin, {
      lat: boardStop.latitude,
      lng: boardStop.longitude,
      label: boardStop.stop_name,
      address: boardStop.stop_name,
    });
    const transitLeg = buildTransitLeg(route, boardStop, alightStop);
    const walkFromStop = await buildWalkLeg(
      { lat: alightStop.latitude, lng: alightStop.longitude, label: alightStop.stop_name, address: alightStop.stop_name },
      destination
    );

    const legs = [walkToStop, transitLeg, walkFromStop];
    options.push({ id: makeLegId(), ...summarizeOption(legs) });
  }

  // Option: ojek to a nearby transit hub, then ride, then walk — used only
  // when no single route directly covers both ends (candidateRouteIds is
  // empty) but the origin is near *some* stop and the trip is long enough
  // that a hybrid ojek+transit trip beats a long ojek-only ride on cost.
  if (candidateRouteIds.size === 0 && directDistanceM >= LONG_TRIP_THRESHOLD_M) {
    const nearOriginWide = await findNearbyStops(origin, 5000);
    const nearDestWide = nearOriginWide.length > 0 ? await findNearbyStops(destination, 5000) : [];
    const destRouteIdsWide = new Set(nearDestWide.map((s) => s.route_id));
    const hubRouteId = nearOriginWide.map((s) => s.route_id).find((id): id is string => !!id && destRouteIdsWide.has(id));

    if (hubRouteId) {
      const route = allRoutes.find((r) => r.id === hubRouteId);
      const boardStop = nearOriginWide.find((s) => s.route_id === hubRouteId);
      const alightStop = nearDestWide.find((s) => s.route_id === hubRouteId);

      if (route && boardStop && alightStop && boardStop.id !== alightStop.id) {
        const ojekToHub = await buildOjekLeg(origin, {
          lat: boardStop.latitude,
          lng: boardStop.longitude,
          label: boardStop.stop_name,
          address: boardStop.stop_name,
        });
        const transitLeg = buildTransitLeg(route, boardStop, alightStop);
        const walkFromStop = await buildWalkLeg(
          { lat: alightStop.latitude, lng: alightStop.longitude, label: alightStop.stop_name, address: alightStop.stop_name },
          destination
        );

        const legs = [ojekToHub, transitLeg, walkFromStop];
        options.push({ id: makeLegId(), ...summarizeOption(legs) });
      }
    }
  }

  return options;
}

// ------------------------------------------------------------------
// Reusable scoring/classification service — this is what turns a flat
// list of RouteOptions into "Cheapest / Fastest / Moderate" categories.
// ------------------------------------------------------------------

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

/**
 * Computes a balanced "moderate" score for each option (0 = best) using
 * min-max normalized cost, duration, and transfer count. Weights can be
 * tuned or later replaced by user preference weighting.
 */
export function scoreRouteOptions(
  options: RouteOption[],
  weights: { cost: number; duration: number; transfers: number } = { cost: 0.4, duration: 0.4, transfers: 0.2 }
): RouteOption[] {
  if (options.length === 0) return options;

  const costs = options.map((o) => o.totalCostIdr);
  const durations = options.map((o) => o.totalDurationS);
  const transfersArr = options.map((o) => o.transfers);

  const minCost = Math.min(...costs), maxCost = Math.max(...costs);
  const minDur = Math.min(...durations), maxDur = Math.max(...durations);
  const minTr = Math.min(...transfersArr), maxTr = Math.max(...transfersArr);

  return options.map((o) => ({
    ...o,
    score:
      weights.cost * normalize(o.totalCostIdr, minCost, maxCost) +
      weights.duration * normalize(o.totalDurationS, minDur, maxDur) +
      weights.transfers * normalize(o.transfers, minTr, maxTr),
  }));
}

/**
 * Classifies a set of route options into cheapest / fastest / moderate.
 * This is the reusable "route comparison" engine referenced across the
 * Route Comparison screen and the Budget Planner.
 */
export function classifyRouteOptions(rawOptions: RouteOption[]): RouteComparisonResult {
  if (rawOptions.length === 0) {
    return { options: [], cheapest: null, fastest: null, moderate: null };
  }

  const scored = scoreRouteOptions(rawOptions);

  const cheapest = [...scored].sort((a, b) => a.totalCostIdr - b.totalCostIdr)[0];
  const fastest = [...scored].sort((a, b) => a.totalDurationS - b.totalDurationS)[0];
  const moderate = [...scored].sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];

  const options = scored.map((o) => {
    let category: RouteOption['category'];
    if (o.id === cheapest.id) category = 'cheapest';
    else if (o.id === fastest.id) category = 'fastest';
    else if (o.id === moderate.id) category = 'moderate';
    return { ...o, category };
  });

  return {
    options,
    cheapest: options.find((o) => o.id === cheapest.id) ?? null,
    fastest: options.find((o) => o.id === fastest.id) ?? null,
    moderate: options.find((o) => o.id === moderate.id) ?? null,
  };
}

/** High-level entry point used by the Route Comparison screen. */
export async function planAndCompareRoutes(origin: PlaceResult, destination: PlaceResult): Promise<RouteComparisonResult> {
  const rawOptions = await generateRouteOptions(origin, destination);
  return classifyRouteOptions(rawOptions);
}

/** Persists a route search + its selected journey legs to Supabase. */
export async function saveRouteSearch(
  userId: string,
  origin: PlaceResult,
  destination: PlaceResult,
  selectedOption?: RouteOption
) {
  const { data: search, error } = await supabase
    .from('route_searches')
    .insert({
      user_id: userId,
      origin: { lat: origin.lat, lng: origin.lng, label: origin.label },
      destination: { lat: destination.lat, lng: destination.lng, label: destination.label },
    })
    .select()
    .single();

  if (error) throw error;

  if (selectedOption) {
    const legRows = selectedOption.legs.map((leg, idx) => ({
      route_search_id: search.id,
      leg_order: idx,
      mode: leg.mode,
      route_label: leg.routeLabel ?? null,
      from_name: 'label' in leg.from ? leg.from.label : 'Origin',
      from_lat: leg.from.lat,
      from_lng: leg.from.lng,
      to_name: 'label' in leg.to ? leg.to.label : 'Destination',
      to_lat: leg.to.lat,
      to_lng: leg.to.lng,
      distance_m: leg.distanceM,
      duration_s: Math.round(leg.durationS),
      estimated_cost_idr: leg.estimatedCostIdr,
      is_transfer: leg.isTransfer,
    }));

    const { error: legError } = await supabase.from('journey_legs').insert(legRows);
    if (legError) throw legError;
  }

  return search;
}