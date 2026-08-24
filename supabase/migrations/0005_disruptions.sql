-- ============================================================
-- 0005_disruptions.sql
-- Live/fallback disruption alerts
-- ============================================================

create table if not exists public.disruptions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  disruption_type text not null check (disruption_type in
    ('delay','route_closure','traffic','station_closure','service_interruption','other')),
  severity text not null default 'moderate' check (severity in ('low','moderate','high','critical')),
  affected_route_ids uuid[] default '{}',
  affected_route_labels text[] default '{}',   -- denormalized for display when route_id is unknown
  affected_locations text[] default '{}',
  status text not null default 'active' check (status in ('active','monitoring','resolved')),
  is_fallback boolean not null default true,   -- TRUE = demo/fallback, FALSE = real live source
  source text,                                  -- e.g. "TransJakarta API", "fallback-seed"
  starts_at timestamptz not null default now(),
  last_updated timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_disruptions_status on public.disruptions(status);
create index if not exists idx_disruptions_severity on public.disruptions(severity);
create index if not exists idx_disruptions_starts_at on public.disruptions(starts_at desc);

alter table public.disruptions enable row level security;

-- Disruptions are public safety info: readable by anyone (even anonymous)
create policy "Anyone can read disruptions"
  on public.disruptions for select
  using (true);

drop trigger if exists trg_disruptions_last_updated on public.disruptions;
create or replace function public.touch_disruption_last_updated()
returns trigger
language plpgsql
as $$
begin
  new.last_updated = now();
  return new;
end;
$$;

create trigger trg_disruptions_last_updated
  before update on public.disruptions
  for each row execute procedure public.touch_disruption_last_updated();

-- Enable realtime for live disruption pushes
alter publication supabase_realtime add table public.disruptions;
alter publication supabase_realtime add table public.transport_schedules;
