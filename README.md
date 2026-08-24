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

**Intentionally fallback/demo data (clearly labeled in the UI with a "Demo data" badge):**
- Transit routes/stops/schedules seeded in `0006_seed_fallback_data.sql` —
  real TransJakarta/MRT/KRL corridor names and approximate real stop
  coordinates, but schedule times are placeholders (`is_fallback = true`),
  because no free real-time Jakarta transit API exists for a student project.
- Two example disruption records, same `is_fallback` flag.
- Fare amounts in `routeService.ts` are realistic flat-rate approximations
  (TransJakarta ~Rp3,500, MRT ~Rp8,000, KRL ~Rp4,000), not a live fare API.

**Architecture-only, not implemented (by design — you're integrating this yourself):**
- Confused Mode's actual LLM call. The chat UI, message history, suggested
  questions, and context-passing (location/destination/disruptions/preferences)
  are fully wired. `supabase/functions/confused-mode/index.ts` is a working
  Edge Function that returns a clearly-labeled placeholder reply — swap in a
  real LLM call there and nothing on the frontend needs to change.

## Getting started

```bash
npm install
cp .env.example .env      # fill in your Supabase project URL/anon key
npm run dev
```

### Supabase setup

1. Create a project at supabase.com.
2. Run the migrations in order (`supabase/migrations/0001...0006`) via the
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
  migrations/     0001-0006, run in order
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
