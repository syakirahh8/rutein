// Run once with: npx tsx scripts/seedTransportData.ts
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (service role, not anon —
// this bypasses RLS to write reference data, never ship this key client-side).
//
// @supabase/supabase-js constructs a RealtimeClient internally, which
// requires a native WebSocket global — present in Node 22+ but not
// Node 20. This script never uses realtime, but the constructor still
// runs, so polyfill it rather than requiring a Node upgrade.
// Requires: npm install -D ws @types/ws

import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { INDONESIA_TRANSPORT_DATA, type IndonesiaTransportLocation } from '../src/data/indonesiaTransportData';

if (!globalThis.WebSocket) {
  // @ts-expect-error - ws's types don't perfectly match the DOM WebSocket type, fine for this purpose
  globalThis.WebSocket = ws;
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ROUTABLE_TYPES = new Set(['transjakarta', 'bus', 'krl', 'mrt', 'lrt', 'train', 'airport_rail', 'ferry']);

function groupByLine(data: IndonesiaTransportLocation[]) {
  const groups = new Map<string, IndonesiaTransportLocation[]>();
  for (const loc of data) {
    if (!ROUTABLE_TYPES.has(loc.type)) continue;
    if (!loc.line) continue;
    const key = `${loc.type}::${loc.line}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(loc);
  }
  return groups;
}

async function seed() {
  await supabase.from('transport_stops').delete().neq('id', '');
  await supabase.from('transport_routes').delete().neq('id', '');

  const groups = groupByLine(INDONESIA_TRANSPORT_DATA);
  console.log(`Found ${groups.size} routes to seed from ${INDONESIA_TRANSPORT_DATA.length} curated locations.`);

  const nameOccurrences = new Map<string, number>();
  for (const loc of INDONESIA_TRANSPORT_DATA) {
    if (!ROUTABLE_TYPES.has(loc.type)) continue;
    nameOccurrences.set(loc.name, (nameOccurrences.get(loc.name) ?? 0) + 1);
  }

  let routesCreated = 0;
  let stopsCreated = 0;

  for (const [key, stops] of groups) {
    const [mode, lineName] = key.split('::');

    const { data: route, error: routeError } = await supabase
      .from('transport_routes')
      .insert({ route_name: lineName, mode, is_active: true })
      .select()
      .single();

    if (routeError || !route) {
      console.error(`Failed to create route "${lineName}":`, routeError);
      continue;
    }
    routesCreated++;

    const stopRows = stops.map((stop, index) => ({
      route_id: route.id,
      stop_name: stop.name,
      latitude: stop.latitude,
      longitude: stop.longitude,
      sequence_order: index,
      is_transfer_point: (nameOccurrences.get(stop.name) ?? 0) > 1,
    }));

    const { error: stopsError } = await supabase.from('transport_stops').insert(stopRows);
    if (stopsError) {
      console.error(`Failed to insert stops for "${lineName}":`, stopsError);
      continue;
    }
    stopsCreated += stopRows.length;
  }

  console.log(`Done. Created ${routesCreated} routes, ${stopsCreated} stops.`);
}

seed().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});