-- ============================================================
-- 0003_transit_network.sql
-- Public transit reference data: transport_routes, transport_stops,
-- transport_schedules, route_cache, and structured multi-leg journeys
-- ============================================================

create table if not exists public.transport_routes (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('bus','transjakarta','mrt','krl','lrt','walk','other')),
  route_code text,               -- e.g. "1", "6H", "MRT-01"
  route_name text not null,      -- e.g. "TransJakarta Koridor 1: Blok M - Kota"
  operator text,                 -- e.g. "TransJakarta", "MRT Jakarta", "KAI Commuter"
  color text,                    -- hex color for map/UI
  is_active boolean not null default true,
  source text not null default 'fallback' check (source in ('official','fallback')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_transport_routes_mode on public.transport_routes(mode);

alter table public.transport_routes enable row level security;

-- Transit reference data is public read (not user-private)
create policy "Anyone can read transport routes"
  on public.transport_routes for select
  using (true);

drop trigger if exists trg_routes_updated_at on public.transport_routes;
create trigger trg_routes_updated_at
  before update on public.transport_routes
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------

create table if not exists public.transport_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid references public.transport_routes(id) on delete cascade,
  stop_name text not null,
  latitude double precision not null,
  longitude double precision not null,
  sequence_order integer,        -- position of stop along the route
  is_transfer_point boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_transport_stops_route on public.transport_stops(route_id, sequence_order);
create index if not exists idx_transport_stops_geo on public.transport_stops(latitude, longitude);

alter table public.transport_stops enable row level security;

create policy "Anyone can read transport stops"
  on public.transport_stops for select
  using (true);

-- ------------------------------------------------------------

create table if not exists public.transport_schedules (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.transport_routes(id) on delete cascade,
  stop_id uuid references public.transport_stops(id) on delete cascade,
  scheduled_departure time,
  estimated_departure timestamptz,     -- live estimate, nullable
  status text not null default 'unknown' check (status in ('on_time','delayed','cancelled','unknown')),
  is_fallback boolean not null default true,   -- TRUE = demo/fallback data, FALSE = real live feed
  last_updated timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_schedules_route on public.transport_schedules(route_id);
create index if not exists idx_schedules_stop on public.transport_schedules(stop_id);
create index if not exists idx_schedules_departure on public.transport_schedules(estimated_departure);

alter table public.transport_schedules enable row level security;

create policy "Anyone can read transport schedules"
  on public.transport_schedules for select
  using (true);

-- ------------------------------------------------------------
-- route_cache: cache of computed journeys (origin/destination -> route options)
-- so repeated identical searches don't re-hit external APIs every time.

create table if not exists public.route_cache (
  id uuid primary key default gen_random_uuid(),
  origin_lat double precision not null,
  origin_lng double precision not null,
  destination_lat double precision not null,
  destination_lng double precision not null,
  cache_key text not null unique,   -- deterministic hash of rounded coords + mode prefs
  route_options jsonb not null,     -- array of computed RouteOption objects (see routeService)
  provider text,                    -- which routing engine produced this
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now()
);

create index if not exists idx_route_cache_key on public.route_cache(cache_key);
create index if not exists idx_route_cache_expiry on public.route_cache(expires_at);

alter table public.route_cache enable row level security;

-- Cache is shared infrastructure, not user-private data; readable by any
-- authenticated request, writable only via the service role (Edge Functions).
create policy "Authenticated users can read route cache"
  on public.route_cache for select
  to authenticated
  using (true);

-- ------------------------------------------------------------
-- Structured multi-leg journeys, so a "route" isn't a single text blob.
-- A journey (saved to a budget plan or route_search) has many ordered legs.

create table if not exists public.journey_legs (
  id uuid primary key default gen_random_uuid(),
  route_search_id uuid references public.route_searches(id) on delete cascade,
  leg_order integer not null,
  mode text not null check (mode in ('walk','bus','transjakarta','mrt','krl','lrt')),
  route_id uuid references public.transport_routes(id) on delete set null,
  route_label text,                  -- denormalized display label, e.g. "TransJakarta Koridor 1"
  from_name text not null,
  from_lat double precision not null,
  from_lng double precision not null,
  to_name text not null,
  to_lat double precision not null,
  to_lng double precision not null,
  distance_m double precision,
  duration_s integer,
  estimated_cost_idr numeric(10,2) default 0,
  is_transfer boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_journey_legs_search on public.journey_legs(route_search_id, leg_order);

alter table public.journey_legs enable row level security;

create policy "Users manage own journey legs"
  on public.journey_legs for all
  using (
    exists (
      select 1 from public.route_searches rs
      where rs.id = journey_legs.route_search_id
        and rs.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.route_searches rs
      where rs.id = journey_legs.route_search_id
        and rs.user_id = auth.uid()
    )
  );
