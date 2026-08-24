-- ============================================================
-- 0002_places_and_preferences.sql
-- saved_places, user_preferences, recent_destinations, route_searches
-- ============================================================

create table if not exists public.saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'custom' check (category in ('home','school','workplace','custom')),
  address text,
  latitude double precision not null,
  longitude double precision not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_saved_places_user on public.saved_places(user_id);
create index if not exists idx_saved_places_category on public.saved_places(user_id, category);

alter table public.saved_places enable row level security;

create policy "Users manage own saved places"
  on public.saved_places for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists trg_saved_places_updated_at on public.saved_places;
create trigger trg_saved_places_updated_at
  before update on public.saved_places
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_transport text[] default '{}',         -- e.g. {bus, mrt, krl, transjakarta}
  max_walking_distance_m integer default 1000,
  prioritize_cheapest boolean default false,
  prioritize_fastest boolean default false,
  avoid_transfers boolean default false,
  default_home_place_id uuid references public.saved_places(id) on delete set null,
  default_work_place_id uuid references public.saved_places(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

create policy "Users manage own preferences"
  on public.user_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists trg_prefs_updated_at on public.user_preferences;
create trigger trg_prefs_updated_at
  before update on public.user_preferences
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------

create table if not exists public.recent_destinations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  address text,
  latitude double precision not null,
  longitude double precision not null,
  searched_at timestamptz not null default now()
);

create index if not exists idx_recent_dest_user_time on public.recent_destinations(user_id, searched_at desc);

alter table public.recent_destinations enable row level security;

create policy "Users manage own recent destinations"
  on public.recent_destinations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------

create table if not exists public.route_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  origin jsonb not null,        -- { lat, lng, label }
  destination jsonb not null,   -- { lat, lng, label }
  selected_route_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_route_searches_user on public.route_searches(user_id, created_at desc);

alter table public.route_searches enable row level security;

create policy "Users manage own route searches"
  on public.route_searches for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
