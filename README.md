# Rutein

Public-transit navigation and travel-assistance web app for Jakarta —
built for people who are lost, overwhelmed, juggling multiple transit modes,
and watching their budget.

React + TypeScript + Supabase (Auth, Postgres, RLS, Realtime, Edge Functions).

## Status: what's real vs. what's scaffolded

**Fully functional, real data, no shortcuts:**
- Auth (sign up/in/out, session persistence, protected routes)
- Full Supabase schema with RLS on every table (see `supabase/migrations`)
- Geocoding / place search — live OpenStreetMap Nominatim, no fake place names
- Interactive map — real Leaflet map, real browser geolocation, real reverse geocoding
- Route generation & comparison — pulls actual nearby stops from the DB, builds
  real multi-leg (walk→transit→walk) journeys, and classifies them into
  cheapest/fastest/moderate via a genuine scoring function
  (`src/services/routeService.ts`) — not three hardcoded cards
- Budget Planner — real calculation logic, persisted to Supabase, editable/deletable
- Saved Places, Preferences, Profile — full CRUD against Supabase with RLS
- Live GPS Modal — **real** `navigator.geolocation.watchPosition`, with proper
  permission-denied / unavailable / unsupported / timeout handling and live
  waypoint-arrival detection. No simulated movement.
- Disruptions — realtime via Supabase Realtime, subscribed live in the UI

**Realer, but still curated (not a live official feed):**
- All transit station/route data (`0006`–`0009` migrations) — MRT Jakarta
  (all 13 real stations), LRT Jakarta (6 real stations), 6 real TransJakarta
  corridors including the full Ragunan–Monas Koridor 6H sequence, and real
  KRL Commuter Line stations from Bogor to Jakarta Kota — with real names
  and best-effort accurate coordinates from public knowledge of these
  systems. Tagged `source = 'curated'` (shown in the UI as "Real stations,
  curated") to distinguish it honestly from a scraped/verified government
  feed.
- Fare amounts in `routeService.ts` are realistic flat-rate/distance-based
  approximations (TransJakarta ~Rp3,500, MRT ~Rp8,000, KRL ~Rp4,000, ojek
  online ~Rp9,000 base + Rp2,500/km), not a live fare API.

**No demo/fabricated data remains.** `0009_remove_demo_data_expand_curated.sql`
deleted every placeholder schedule time and example disruption that
0006 had seeded. As a result:
- The **Schedule** screen shows real station names per route, but no
  departure times until a real live-schedule feed is connected (it says
  "No schedule data for this route yet" rather than showing fake times).
- The **Disruptions** screen shows "No active disruptions" by default,
  rather than fabricated examples.

This was a deliberate trade: showing nothing is more honest than showing
numbers that look real but aren't. See "Wiring in a real live feed" below
for how to fill these back in with actual data.

**Automated official-data fetch — attempted, didn't work from this
environment:**
- `data.go.id` / `satudata.jakarta.go.id` — JS-rendered dashboards with
  click-through downloads, no stable public API URL.
- `jakartasatu.jakarta.go.id` (Jakarta's ArcGIS GIS server, which does have
  real `Halte Transjakarta` / `Jalur Transjakarta` layers) — has bot
  detection blocking automated requests, and its native coordinates are
  UTM zone 48S (EPSG:32748), not lat/lng, so even a manual pull needs
  reprojection. See "Importing official government data" below for the
  manual path.

**Architecture-only, not implemented (by design — you're integrating this yourself):**
- Confused Mode's actual LLM call. The chat UI, message history, suggested
  questions, and context-passing (location/destination/disruptions/preferences)
  are fully wired. `supabase/functions/confused-mode/index.ts` is a working
  Edge Function that returns a clearly-labeled placeholder reply — swap in a
  real LLM call there and nothing on the frontend needs to change.

## Wiring in a real live feed (schedules & disruptions)

Both tables are empty by default now (see above). To populate them for
real:
- **TransJakarta** publishes a public GTFS-realtime-style feed for some
  corridors via their developer contact — no self-serve free API key as
  of this writing; you'd need to request access directly from
  `transjakarta.co.id`.
- **KRL Commuter Line** (KAI Commuter) has an unofficial but widely-used
  API (`KRL Access` app's backend) that developers have reverse-engineered;
  search "KRL Access API" for current community documentation — this is
  not an official/stable API and may break without notice.
- Whichever source you use, insert rows into `transport_schedules` with
  `is_fallback = false` once connected, so the UI badge correctly shows
  live data instead of "no data yet".

## Importing official government data (manual step)

`data.go.id` and `satudata.jakarta.go.id` are JS-rendered dashboards with
click-through downloads — there's no stable public API URL to pull from
automatically. To bring in genuinely official data:

1. Visit https://data.go.id/dataset?q=transjakarta (or search
   `satudata.jakarta.go.id` directly) and open a dataset, e.g.
   **"Data Halte Transjakarta Tahun 2023"** or **"Data Rute Jalur
   Transjakarta Tahun 2023"**.
2. Click **Download** → choose **CSV** or **XLSX**.
3. Save the file, then either:
   - Open it in Excel/Sheets, map the columns to `transport_stops`
     (`stop_name`, `latitude`, `longitude`, `route_id`, `sequence_order`)
     and import via the Supabase Table Editor's CSV import, or
   - Hand the file to an LLM/script to generate a migration that
     `INSERT`s the rows with `source = 'official'`.
4. Either way, set `source = 'official'` on the resulting `transport_routes`
   rows so the UI badge reflects that it's a verified government dataset,
   distinct from the `curated` (real-but-hand-compiled) data already seeded.

## Getting started

```bash
npm install
cp .env.example .env      # fill in your Supabase project URL/anon key
npm run dev
```

### Supabase setup

1. Create a project at supabase.com.
2. Run the migrations in order (`supabase/migrations/0001...0009`) via the
   Supabase SQL editor, or with the CLI:
   ```bash
   supabase link --project-ref your-project-ref
   supabase db push
   ```
3. Copy your project URL and anon key into `.env`.
4. (Optional) Deploy the Confused Mode Edge Function placeholder:
   ```bash
   supabase functions deploy confused-mode
   ```

### Optional: better routing

Without `VITE_ORS_API_KEY`, walking directions fall back to a straight-line
distance/duration estimate (clearly marked internally as `isEstimate: true`).
For real walking polylines, get a free key at openrouteservice.org and add it
to `.env`.

## Project structure

```
src/
  components/     Reusable UI (PlaceSearchInput, RouteOptionCard, LiveGpsModal, ...)
  contexts/       AuthContext
  pages/          One file per screen (Dashboard, MapPage, RouteComparison, ...)
  services/       All business logic — no Supabase calls in components directly:
                    authService, supabaseService, geocodingService, mapService,
                    locationService, transportService, routeService,
                    budgetService, savedPlacesService, preferencesService,
                    disruptionService, confusedModeService
  types/          database.types.ts (schema shapes), domain.types.ts (route/place shapes)
supabase/
  migrations/     0001-0009, run in order
  functions/
    confused-mode/  Edge Function placeholder for future LLM integration
```

## Known simplifications (student-project scope)

- Route generation only tries direct-walk + single-transfer transit journeys
  (walk → one route → walk). Multi-transfer itineraries (e.g. bus → MRT → walk)
  are supported by the data model (`journey_legs` is a fully general ordered
  leg table) but the current `generateRouteOptions()` doesn't search
  multi-hop paths yet — that's the natural next extension.
- `route_cache` table exists in the schema for caching computed journeys but
  isn't read/written from the frontend yet (writes would typically happen
  from an Edge Function using the service role key).
- Fare amounts are flat-rate approximations, not a real fare-matrix API.