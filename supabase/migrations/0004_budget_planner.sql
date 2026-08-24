-- ============================================================
-- 0004_budget_planner.sql
-- budget_plans, budget_plan_routes
-- ============================================================

create table if not exists public.budget_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My Budget Plan',
  destination_label text not null,
  destination_lat double precision not null,
  destination_lng double precision not null,
  origin_label text,
  origin_lat double precision,
  origin_lng double precision,
  travel_period text not null check (travel_period in ('daily','weekly','monthly')),
  trips_per_period integer not null default 2,   -- e.g. 2 trips/day = round trip
  preferred_route_type text default 'balanced' check (preferred_route_type in ('cheapest','fastest','balanced')),
  estimated_cost_per_trip numeric(10,2),
  estimated_daily_cost numeric(10,2),
  estimated_weekly_cost numeric(10,2),
  estimated_monthly_cost numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_budget_plans_user on public.budget_plans(user_id, created_at desc);

alter table public.budget_plans enable row level security;

create policy "Users manage own budget plans"
  on public.budget_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists trg_budget_plans_updated_at on public.budget_plans;
create trigger trg_budget_plans_updated_at
  before update on public.budget_plans
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- Snapshot of the specific route option(s) a budget plan is based on,
-- so recalculation history/audit is possible instead of just a single number.

create table if not exists public.budget_plan_routes (
  id uuid primary key default gen_random_uuid(),
  budget_plan_id uuid not null references public.budget_plans(id) on delete cascade,
  route_label text not null,
  route_type text check (route_type in ('cheapest','fastest','balanced')),
  total_cost_idr numeric(10,2) not null,
  total_duration_s integer,
  transfers integer default 0,
  route_snapshot jsonb,     -- full RouteOption payload at time of selection
  created_at timestamptz not null default now()
);

create index if not exists idx_budget_plan_routes_plan on public.budget_plan_routes(budget_plan_id);

alter table public.budget_plan_routes enable row level security;

create policy "Users manage own budget plan routes"
  on public.budget_plan_routes for all
  using (
    exists (
      select 1 from public.budget_plans bp
      where bp.id = budget_plan_routes.budget_plan_id
        and bp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.budget_plans bp
      where bp.id = budget_plan_routes.budget_plan_id
        and bp.user_id = auth.uid()
    )
  );
