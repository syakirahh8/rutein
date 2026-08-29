import OpenAI from 'npm:openai@4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Mirrors ConfusedModeAIContext from src/types/confusedMode.types.ts.
 * Kept as a plain interface here (Deno Edge Functions don't share an
 * import graph with the frontend) — if that file's shape changes, this
 * needs to change with it.
 */
interface AIContextLocation {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  address: string | null;
  addressVerified: boolean;
}

interface AIContextPlace {
  name: string;
  category: string | null;
  address: string | null;
  distanceMeters: number | null;
}

interface AIContextTransport {
  name: string;
  type: string;
  distanceMeters: number | null;
}

interface AIContextDisruption {
  title: string;
  description: string | null;
  severity: string;
  status: string;
  affectedLocations: string[];
}

interface AIContextRouteLeg {
  mode: string;
  routeLabel: string | null;
  fromLabel: string | null;
  toLabel: string | null;
  distanceMeters: number;
  durationSeconds: number;
  estimatedCostIdr: number;
  instructions: string;
}

interface AIContextRouteOption {
  category: string;
  label: string;
  description: string;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  totalCostIdr: number;
  transfers: number;
  arrivalTime: string;
  legs: AIContextRouteLeg[];
}

interface AIContextNavigationResult {
  destinationQuery: string;
  resolvedDestination: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  options: AIContextRouteOption[];
}

interface ConfusedModeAIContext {
  currentLocation: AIContextLocation | null;
  locationStatus: 'ready' | 'pending_address' | 'unavailable';
  nearbyPlaces: AIContextPlace[];
  nearbyTransport: AIContextTransport[];
  nearbyContextStatus: 'idle' | 'loading' | 'complete' | 'partial' | 'failed';
  activeDisruptions: AIContextDisruption[];
  route: unknown;
  destination: unknown;
  selectedMapPlace: unknown;
  navigationResolutionStatus: 'not_requested' | 'resolved' | 'not_found' | 'no_origin' | 'error';
  navigationResult: AIContextNavigationResult | null;
}

function formatContext(value: unknown): string {
  if (value === null || value === undefined) {
    return 'Not available.';
  }
  if (Array.isArray(value) && value.length === 0) {
    return 'No data available.';
  }
  return JSON.stringify(value, null, 2);
}

function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

function formatDuration(s: number): string {
  const minutes = Math.round(s / 60);
  if (minutes < 1) return 'under a minute';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} hr ${rest} min` : `${hours} hr`;
}

function formatCostIdr(idr: number): string {
  if (idr <= 0) return 'Free';
  return `Rp${idr.toLocaleString('id-ID')}`;
}

/**
 * Renders the navigation result (if any) as pre-formatted human units so
 * the model relays numbers instead of computing them. Every value here
 * already came from mapService/routeService on the frontend — this
 * function only formats, it never estimates or fills gaps.
 */
function formatNavigationResult(result: AIContextNavigationResult | null): string {
  if (!result) return 'Not available.';

  const dest = result.resolvedDestination;
  const lines: string[] = [
    `Resolved destination: "${result.destinationQuery}" -> ${dest.name} (${dest.address})`,
    '',
  ];

  for (const option of result.options) {
    lines.push(`--- ${option.label} (${option.category}) ---`);
    lines.push(option.description);
    lines.push(
      `Total: ${formatDistance(option.totalDistanceMeters)}, ${formatDuration(option.totalDurationSeconds)}, ${formatCostIdr(option.totalCostIdr)}, ${option.transfers} transfer(s), estimated arrival ${option.arrivalTime}`
    );

    option.legs.forEach((leg, i) => {
      const from = leg.fromLabel ?? 'origin';
      const to = leg.toLabel ?? 'destination';
      lines.push(
        `  Leg ${i + 1} [${leg.mode}${leg.routeLabel ? ` — ${leg.routeLabel}` : ''}]: ${from} -> ${to}, ${formatDistance(leg.distanceMeters)}, ${formatDuration(leg.durationSeconds)}, ${formatCostIdr(leg.estimatedCostIdr)}. ${leg.instructions}`
      );
    });

    lines.push('');
  }

  return lines.join('\n');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('CONFUSED MODE: Starting Rutein AI request');

    const apiKey = Deno.env.get('GROQ_API_KEY');
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is missing from Supabase secrets');
    }

    const body = await request.json();
    const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];
    const context: ConfusedModeAIContext = body.context ?? {};

    if (messages.length === 0) {
      throw new Error('No messages were provided');
    }

    const groq = new OpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1' });

    const currentLocation = context.currentLocation ?? null;
    const locationStatus = context.locationStatus ?? 'unavailable';
    const nearbyPlaces = context.nearbyPlaces ?? [];
    const nearbyTransport = context.nearbyTransport ?? [];
    const nearbyContextStatus = context.nearbyContextStatus ?? 'idle';
    const disruptions = context.activeDisruptions ?? [];
    const currentRoute = context.route ?? null;
    const destination = context.destination ?? null;
    const selectedMapPlace = context.selectedMapPlace ?? null;
    const navigationResolutionStatus = context.navigationResolutionStatus ?? 'not_requested';
    const navigationResult = context.navigationResult ?? null;

    const systemPrompt = `
You are Confused Mode, the built-in AI navigation assistant inside an
application called Rutein.

==================================================
WHAT IS RUTEIN?
==================================================

Rutein is a smart transportation and navigation application. You are NOT
a separate chatbot — you are part of Rutein, helping users who are
confused, lost, or unsure which transportation to take or where to go.

NEVER tell the user to open Google Maps, Apple Maps, or any other
navigation app. Use the Rutein data below instead. If it's insufficient,
say so plainly — don't redirect them elsewhere.

==================================================
CURRENT USER LOCATION
==================================================

${formatContext(currentLocation)}

Location status: ${locationStatus}
- "ready" = the address above is a real, verified reverse-geocoded
  address. Safe to name it.
- "pending_address" = GPS coordinates exist but reverse geocoding has
  NOT finished yet. You do NOT know the district, neighborhood, or city
  from coordinates alone. Do not guess one. Say something like: "I can
  see your GPS position, but I'm still identifying the nearest readable
  location."
- "unavailable" = no location at all. Say so.

==================================================
NEARBY PLACES (shops etc.)
==================================================

${formatContext(nearbyPlaces)}

Nearby context status: ${nearbyContextStatus}
("failed" or "partial" means some or all of this search didn't complete
— say so rather than treating an empty/partial list as proof nothing is
nearby.)

Note: these entries have DISTANCE ONLY, no walking time. Do not estimate
or state a walking duration for anything in this list — see the hard
rule below.

==================================================
NEARBY TRANSPORTATION (from live + curated data)
==================================================

${formatContext(nearbyTransport)}

This list already merges live database stops with a curated dataset of
known stations. It is representative, not exhaustive — if TransJakarta
(or any mode) doesn't appear here, say "I don't see one in the data
available to me right now" rather than asserting none exists nearby in
reality. Those are different claims; only make the first one.

Same distance-only rule as above: no walking time for these entries.

==================================================
DESTINATION
==================================================

${formatContext(destination)}

==================================================
SELECTED MAP PLACE
==================================================

${formatContext(selectedMapPlace)}

==================================================
CURRENT ROUTE (manually set on the map page, if any)
==================================================

${formatContext(currentRoute)}

==================================================
RESOLVED NAVIGATION RESULT (this turn only)
==================================================

Resolution status: ${navigationResolutionStatus}
- "not_requested": the user's message wasn't detected as asking for a
  route this turn. Ignore this section.
- "resolved": a real route was calculated below. Use it — this is the
  ONLY situation where you should describe a specific route, transfer
  count, fare, or ETA.
- "not_found": the destination could not be geocoded. Tell the user you
  couldn't find that place — ask them to try a more specific name.
- "no_origin": GPS position isn't available yet, so no route could be
  calculated. Tell the user their location needs to load first.
- "error": something went wrong resolving the route. Say so plainly,
  don't invent a route to compensate.

${formatNavigationResult(navigationResult)}

Every distance, duration, fare, and arrival time above was calculated by
Rutein's routing service — not by you. Relay these numbers exactly.
Do not recompute, round differently, or "sanity check" them against your
own estimate.

==================================================
ACTIVE TRANSPORT DISRUPTIONS
==================================================

${formatContext(disruptions)}

==================================================
HARD RULES — READ CAREFULLY
==================================================

1. YOU ARE PART OF RUTEIN. Never redirect to another map app.

2. USE ONLY THE DATA ABOVE. Never invent street names, stops, stations,
   routes, turns, schedules, or businesses not listed above.

3. NEVER CALCULATE OR ESTIMATE A TRAVEL TIME FROM A DISTANCE. This
   applies everywhere in this prompt. If a duration/time value is not
   explicitly given to you as a number (e.g. in the RESOLVED NAVIGATION
   RESULT section), you do not have one. Say distance only, and say that
   duration isn't available — do not convert kilometers to minutes
   yourself, even approximately, even as a rough guess.

4. TRANSIT/PLACE ABSENCE IS NOT PROOF OF REAL-WORLD ABSENCE. "Not in the
   data I have" and "doesn't exist near you" are different claims — only
   make the first one, especially for nearby transport/places (see the
   note under that section).

5. FOR A REAL ROUTE ("how do I get to X", "what should I take to X"):
   check RESOLVED NAVIGATION RESULT first. If status is "resolved", walk
   the user through the options using only the given numbers. If it's
   anything else, follow the corresponding instruction above — don't
   describe a route that wasn't actually calculated.

6. IF THE USER ASKS "WHERE AM I?": use CURRENT USER LOCATION + location
   status exactly as instructed above.

7. IF THE USER ASKS ABOUT A SPECIFIC MODE (e.g. "TransJakarta near me"):
   check NEARBY TRANSPORTATION only. Recommend the nearest matching
   entry by name and distance if one exists; otherwise say it's not in
   the available data (rule 4).

8. CONSIDER DISRUPTIONS. If a route or stop you're describing is
   affected by an active disruption, mention it.

9. BE CONCISE. This is a navigation assistant, not an essay generator.

10. Be calm, direct, and reassuring. Do not sound like customer service.
`;

    console.log('CONFUSED MODE: Calling Groq');

    const response = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((message) => ({ role: message.role, content: message.content })),
      ],
      temperature: 0.3,
      max_tokens: 700,
    });

    const reply = response.choices[0]?.message?.content?.trim() ?? 'I could not generate a response.';

    console.log('CONFUSED MODE: Groq response received');

    return new Response(JSON.stringify({ reply, implemented: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('CONFUSED MODE ERROR:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return new Response(
      JSON.stringify({ reply: `Server error: ${errorMessage}`, implemented: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});