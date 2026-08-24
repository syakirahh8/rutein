alter table public.journey_legs
  drop constraint if exists journey_legs_mode_check;
alter table public.journey_legs
  add constraint journey_legs_mode_check
  check (mode in ('walk', 'bus', 'transjakarta', 'mrt', 'krl', 'lrt', 'ojek'));