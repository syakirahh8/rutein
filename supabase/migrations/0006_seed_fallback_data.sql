-- ============================================================
-- 0006_seed_fallback_data.sql
-- Clearly-labeled FALLBACK/DEMO data so the app is usable before a
-- real TransJakarta/MRT/KRL live feed is wired in.
-- Every row here has source = 'fallback' / is_fallback = true.
-- ============================================================

-- A handful of real TransJakarta corridors (route metadata is public
-- knowledge; stop-level real-time positions are NOT available for free,
-- so schedules below are marked as fallback estimates, not live data).

insert into public.transport_routes (id, mode, route_code, route_name, operator, color, source)
values
  ('11111111-1111-1111-1111-111111111101', 'transjakarta', '1', 'Koridor 1: Blok M - Kota', 'TransJakarta', '#E4032E', 'fallback'),
  ('11111111-1111-1111-1111-111111111102', 'transjakarta', '6H', 'Koridor 6H: Ragunan - Monas', 'TransJakarta', '#E4032E', 'fallback'),
  ('11111111-1111-1111-1111-111111111103', 'mrt', 'MRT-01', 'MRT Jakarta: Lebak Bulus - Bundaran HI', 'MRT Jakarta', '#0072BC', 'fallback'),
  ('11111111-1111-1111-1111-111111111104', 'krl', 'KRL-BOGOR', 'KRL Commuter Line: Bogor - Jakarta Kota', 'KAI Commuter', '#EF5B25', 'fallback')
on conflict (id) do nothing;

insert into public.transport_stops (route_id, stop_name, latitude, longitude, sequence_order, is_transfer_point)
values
  ('11111111-1111-1111-1111-111111111101', 'Blok M', -6.2440, 106.7993, 1, true),
  ('11111111-1111-1111-1111-111111111101', 'Sisingamangaraja', -6.2385, 106.8007, 2, false),
  ('11111111-1111-1111-1111-111111111101', 'Bundaran HI', -6.1950, 106.8231, 3, true),
  ('11111111-1111-1111-1111-111111111101', 'Kota', -6.1370, 106.8133, 4, true),

  ('11111111-1111-1111-1111-111111111103', 'Lebak Bulus', -6.2894, 106.7749, 1, true),
  ('11111111-1111-1111-1111-111111111103', 'Fatmawati', -6.2921, 106.7975, 2, false),
  ('11111111-1111-1111-1111-111111111103', 'Blok M', -6.2440, 106.7993, 3, true),
  ('11111111-1111-1111-1111-111111111103', 'Bundaran HI', -6.1950, 106.8231, 4, true),

  ('11111111-1111-1111-1111-111111111104', 'Bogor', -6.5950, 106.7890, 1, true),
  ('11111111-1111-1111-1111-111111111104', 'Depok', -6.4010, 106.8180, 2, false),
  ('11111111-1111-1111-1111-111111111104', 'Manggarai', -6.2100, 106.8500, 3, true),
  ('11111111-1111-1111-1111-111111111104', 'Jakarta Kota', -6.1370, 106.8133, 4, true)
on conflict do nothing;

-- Fallback schedule estimates (clearly marked is_fallback = true).
insert into public.transport_schedules (route_id, stop_id, scheduled_departure, status, is_fallback)
select r.id, s.id, t.dep::time, 'unknown', true
from public.transport_routes r
join public.transport_stops s on s.route_id = r.id
cross join (values ('06:00'), ('06:15'), ('06:30'), ('06:45')) as t(dep)
where r.source = 'fallback'
on conflict do nothing;

-- Fallback disruption examples.
insert into public.disruptions
  (title, description, disruption_type, severity, affected_route_labels, affected_locations, status, is_fallback, source)
values
  (
    'Koridor 1 delayed near Bundaran HI',
    'Fallback/demo data: traffic congestion is causing longer wait times on this corridor.',
    'delay', 'moderate', array['Koridor 1: Blok M - Kota'], array['Bundaran HI'], 'active', true, 'fallback-seed'
  ),
  (
    'KRL Bogor Line - scheduled maintenance',
    'Fallback/demo data: reduced frequency expected during off-peak maintenance window.',
    'service_interruption', 'low', array['KRL Commuter Line: Bogor - Jakarta Kota'], array['Manggarai'], 'monitoring', true, 'fallback-seed'
  )
on conflict do nothing;
