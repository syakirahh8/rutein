import {
  INDONESIA_TRANSPORT_DATA,
  TRANSPORT_TYPE_LABELS,
  type IndonesiaTransportLocation,
  type IndonesiaTransportType,
} from './indonesiaTransportData';

/**
 * Precise-as-possible mock daily schedules, generated from the curated
 * station/line dataset in indonesiaTransportData.ts.
 *
 * PROVENANCE: no live GTFS/AVL feed is wired up (see the provenance note
 * in indonesiaTransportData.ts for why), so exact departure times can't be
 * pulled from a real source. Instead, each transport mode is modeled with
 * realistic *published* operating hours and headway (gap between
 * departures) ranges, generated deterministically for "today" — this is a
 * faithful approximation of how these systems actually run, not literal
 * live data. Fixed-interval modes (TransJakarta, MRT, LRT, KRL, city BRT,
 * ferry, airport rail) use headway generation with shorter gaps during
 * peak hours (06:00-09:00, 16:00-19:00). Intercity trains run far fewer
 * services per day, so they use a fixed departure list instead of headway.
 * Terminal/other entries are hubs, not a single line, so no departure
 * times are generated for them.
 */

// ------------------------------------------------------------------
// Routes: every line grouped into an ordered sequence of stops, the same
// grouping logic used by the Supabase seed script (type::line as the key,
// array order == geographic sequence, since the source data lists each
// line's stations in real order already).
// ------------------------------------------------------------------

export interface RouteInfo {
  key: string; // `${type}::${line}`
  type: IndonesiaTransportType;
  line: string;
  stops: IndonesiaTransportLocation[]; // ordered
  originLabel: string;
  destinationLabel: string;
  /** false for single-stop groupings (e.g. one-off ferry/airport-rail hubs) — no meaningful direction to schedule. */
  hasDirections: boolean;
}

function buildRoutes(): RouteInfo[] {
  const groups = new Map<string, IndonesiaTransportLocation[]>();
  for (const loc of INDONESIA_TRANSPORT_DATA) {
    if (!loc.line) continue;
    const key = `${loc.type}::${loc.line}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(loc);
  }

  return Array.from(groups.entries()).map(([key, stops]) => {
    const [type, line] = key.split('::') as [IndonesiaTransportType, string];
    return {
      key,
      type,
      line,
      stops,
      originLabel: stops[0].name,
      destinationLabel: stops[stops.length - 1].name,
      hasDirections: stops.length > 1,
    };
  });
}

export const TRANSPORT_ROUTES: RouteInfo[] = buildRoutes();

const routeByStationId = new Map<string, RouteInfo>();
for (const route of TRANSPORT_ROUTES) {
  for (const stop of route.stops) {
    routeByStationId.set(stop.id, route);
  }
}

export function getRouteForStation(stationId: string): RouteInfo | null {
  return routeByStationId.get(stationId) ?? null;
}

// ------------------------------------------------------------------
// Per-mode operating pattern
// ------------------------------------------------------------------

type ModeSchedulePattern =
  | { kind: 'headway'; startHour: number; endHour: number; peakHeadwayMin: number; offpeakHeadwayMin: number }
  | { kind: 'fixed'; times: string[] }
  | { kind: 'none' };

// Peak windows, in minutes-since-midnight: 06:00-09:00 and 16:00-19:00.
const PEAK_WINDOWS: [number, number][] = [
  [6 * 60, 9 * 60],
  [16 * 60, 19 * 60],
];

function isPeak(minuteOfDay: number): boolean {
  return PEAK_WINDOWS.some(([start, end]) => minuteOfDay >= start && minuteOfDay < end);
}

const MODE_PATTERN: Record<IndonesiaTransportType, ModeSchedulePattern> = {
  transjakarta: { kind: 'headway', startHour: 5, endHour: 22, peakHeadwayMin: 8, offpeakHeadwayMin: 15 },
  mrt: { kind: 'headway', startHour: 5, endHour: 23, peakHeadwayMin: 5, offpeakHeadwayMin: 10 },
  lrt: { kind: 'headway', startHour: 5, endHour: 23, peakHeadwayMin: 8, offpeakHeadwayMin: 12 },
  krl: { kind: 'headway', startHour: 4, endHour: 23, peakHeadwayMin: 6, offpeakHeadwayMin: 15 },
  bus: { kind: 'headway', startHour: 5, endHour: 22, peakHeadwayMin: 10, offpeakHeadwayMin: 20 },
  airport_rail: { kind: 'headway', startHour: 4, endHour: 22, peakHeadwayMin: 30, offpeakHeadwayMin: 30 },
  ferry: { kind: 'headway', startHour: 0, endHour: 23, peakHeadwayMin: 45, offpeakHeadwayMin: 60 },
  train: { kind: 'fixed', times: ['06:00', '09:30', '13:00', '17:00', '21:00'] },
  terminal: { kind: 'none' },
  other: { kind: 'none' },
};

/** Real fare estimates by mode — flat/tiered fares as currently published, not distance-computed. */
export const FARE_ESTIMATE: Record<IndonesiaTransportType, string> = {
  transjakarta: 'Rp3.500 (flat)',
  mrt: 'Rp3.000 + Rp1.000/station (max ~Rp14.000)',
  lrt: 'Rp5.000 (flat, LRT Jakarta) / up to ~Rp20.000 (LRT Jabodebek)',
  krl: 'Rp3.000 (first 25km) + Rp1.000/10km after',
  bus: 'Rp3.600–Rp5.000 (flat, varies by city BRT)',
  airport_rail: 'Rp30.000–Rp70.000',
  train: 'Varies by destination and class',
  ferry: '~Rp15.000–Rp22.700 (regular pedestrian)',
  terminal: 'Varies by operator',
  other: 'Not applicable',
};

function formatTime(minuteOfDay: number): string {
  const h = Math.floor(minuteOfDay / 60) % 24;
  const m = minuteOfDay % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateHeadwayTimes(startHour: number, endHour: number, peakHeadwayMin: number, offpeakHeadwayMin: number): string[] {
  const times: string[] = [];
  let minute = startHour * 60;
  const endMinute = endHour * 60;
  while (minute <= endMinute) {
    times.push(formatTime(minute));
    const step = isPeak(minute) ? peakHeadwayMin : offpeakHeadwayMin;
    minute += step;
  }
  return times;
}

// ------------------------------------------------------------------
// Schedule entries
// ------------------------------------------------------------------

export type DepartureStatus = 'on_time' | 'delayed' | 'cancelled';
export type Direction = 'outbound' | 'inbound';

export interface ScheduleEntry {
  id: string;
  stationId: string;
  routeKey: string;
  type: IndonesiaTransportType;
  line: string;
  direction: Direction;
  directionLabel: string;
  time: string; // HH:mm, today
  status: DepartureStatus;
  headwayMin: number | null; // null for fixed-departure modes (intercity trains)
}

function randomStatus(): DepartureStatus {
  const r = Math.random();
  if (r > 0.96) return 'cancelled';
  if (r > 0.88) return 'delayed';
  return 'on_time';
}

/** Full day's scheduled departures (both directions) for a single station. Empty for terminal/other or single-stop routes. */
export function getFullDaySchedule(stationId: string): ScheduleEntry[] {
  const station = INDONESIA_TRANSPORT_DATA.find((s) => s.id === stationId);
  const route = getRouteForStation(stationId);
  if (!station || !route || !route.hasDirections) return [];

  const pattern = MODE_PATTERN[station.type];
  if (pattern.kind === 'none') return [];

  const directions: { direction: Direction; label: string }[] = [
    { direction: 'outbound', label: `Toward ${route.destinationLabel}` },
    { direction: 'inbound', label: `Toward ${route.originLabel}` },
  ];

  const entries: ScheduleEntry[] = [];
  let seq = 0;

  for (const { direction, label } of directions) {
    const times =
      pattern.kind === 'headway'
        ? generateHeadwayTimes(pattern.startHour, pattern.endHour, pattern.peakHeadwayMin, pattern.offpeakHeadwayMin)
        : pattern.times;

    for (const time of times) {
      seq += 1;
      entries.push({
        id: `${stationId}-${direction}-${seq}`,
        stationId,
        routeKey: route.key,
        type: station.type,
        line: route.line,
        direction,
        directionLabel: label,
        time,
        status: randomStatus(),
        headwayMin: pattern.kind === 'headway' ? (isPeak(timeToMinutes(time)) ? pattern.peakHeadwayMin : pattern.offpeakHeadwayMin) : null,
      });
    }
  }

  return entries;
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export interface UpcomingDeparture extends ScheduleEntry {
  minutesAway: number;
  humanText: string;
}

/** Next `limit` departures (across both directions) from the current time of day, merged and sorted. */
export function getUpcomingDepartures(stationId: string, from: Date = new Date(), limit = 6): UpcomingDeparture[] {
  const nowMinutes = from.getHours() * 60 + from.getMinutes();
  const today = getFullDaySchedule(stationId);

  return today
    .map((entry) => ({ entry, minutesAway: timeToMinutes(entry.time) - nowMinutes }))
    .filter(({ minutesAway }) => minutesAway >= 0)
    .sort((a, b) => a.minutesAway - b.minutesAway)
    .slice(0, limit)
    .map(({ entry, minutesAway }) => ({
      ...entry,
      minutesAway,
      humanText:
        entry.status === 'cancelled'
          ? 'Service cancelled'
          : minutesAway <= 1
          ? 'Arriving now'
          : minutesAway <= 5
          ? `Coming in ${minutesAway} minutes`
          : minutesAway <= 15
          ? `Arriving in ${minutesAway} minutes`
          : `Wait around ${minutesAway} minutes`,
    }));
}

/** Groups a full day's schedule by direction, then by hour — for compact rendering instead of one row per departure. */
export function groupScheduleByDirectionAndHour(entries: ScheduleEntry[]): Record<Direction, Record<string, ScheduleEntry[]>> {
  const result: Record<Direction, Record<string, ScheduleEntry[]>> = { outbound: {}, inbound: {} };
  for (const entry of entries) {
    const hour = entry.time.slice(0, 2);
    if (!result[entry.direction][hour]) result[entry.direction][hour] = [];
    result[entry.direction][hour].push(entry);
  }
  return result;
}

export { TRANSPORT_TYPE_LABELS };