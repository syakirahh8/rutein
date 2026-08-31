-- ============================================================
-- 0003_onboarding_profile.sql
-- Adds onboarding fields (profile type) to user_preferences
-- and constrains preferred_transport to known transport types.
-- ============================================================

alter table public.user_preferences
  add column if not exists profile_type text
    check (profile_type in ('school', 'travel', 'work')),
  add column if not exists onboarding_completed_at timestamptz;

-- Keep preferred_transport aligned with the curated transport types
-- used across the app (see src/data/indonesiaTransportData.ts).
alter table public.user_preferences
  drop constraint if exists user_preferences_preferred_transport_check;

alter table public.user_preferences
  add constraint user_preferences_preferred_transport_check
  check (
    preferred_transport <@ array[
      'transjakarta','bus','krl','mrt','lrt',
      'train','airport_rail','ferry','terminal'
    ]::text[]
  );

-- Ensure every newly created auth user gets an empty preferences row
-- so the onboarding flow can upsert straight into it (no "row not
-- found" race between signUp() resolving and the onboarding screen
-- mounting).
create or replace function public.handle_new_user_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_create_user_preferences on auth.users;
create trigger trg_create_user_preferences
  after insert on auth.users
  for each row execute procedure public.handle_new_user_preferences();