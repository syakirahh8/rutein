-- ============================================================
-- 0009_remove_demo_data_expand_curated.sql
--
-- Two things:
--
-- 1. DELETES all fabricated/placeholder demo data — fake schedule
--    departure times and fake example disruptions. These were never tied
--    to reality and shouldn't sit in the database implying otherwise.
--    Result: Schedule/Disruptions screens will show "no data yet" until a
--    real feed is connected, which is the honest state, not a fake one.
--
-- 2. Fixes a real bug found while doing this: Koridor 6H (route id ...102)
--    was inserted in 0006 with NO stops at all, so it could never be
--    matched by findNearbyStops() — a route with zero stops is dead
--    weight. Adds its real stop sequence (Ragunan -> Monas corridor).
--
-- Attempted (and failed) to pull literal official data before writing
-- this: data.go.id / satudata.jakarta.go.id are JS-rendered dashboards
-- with no stable API; jakartasatu.jakarta.go.id has a real ArcGIS
-- MapServer with genuine Halte/Jalur Transjakarta layers, but it has bot
-- detection blocking automated requests, and its native coordinates are
-- UTM zone 48S (EPSG:32748), not lat/lng. See README for the manual
-- import path if you want to pull from it by hand.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Remove fabricated demo data
-- ------------------------------------------------------------

delete from public.transport_schedules where is_fallback = true;
delete from public.disruptions where is_fallback = true;

-- ------------------------------------------------------------
-- 2. Real stops for Koridor 6H: Ragunan - Monas (previously had none)
-- Coordinates are best-effort approximations of real station locations
-- along this well-documented corridor, not survey-grade GPS.
-- ------------------------------------------------------------

insert into public.transport_stops (route_id, stop_name, latitude, longitude, sequence_order, is_transfer_point)
values
  ('11111111-1111-1111-1111-111111111102', 'Ragunan', -6.3096, 106.8203, 1, false),
  ('11111111-1111-1111-1111-111111111102', 'Departemen Pertanian', -6.2971, 106.8213, 2, false),
  ('11111111-1111-1111-1111-111111111102', 'Warung Jati', -6.2725, 106.8261, 3, false),
  ('11111111-1111-1111-1111-111111111102', 'Mampang Prapatan', -6.2452, 106.8236, 4, false),
  ('11111111-1111-1111-1111-111111111102', 'Kuningan Timur', -6.2255, 106.8296, 5, false),
  ('11111111-1111-1111-1111-111111111102', 'Karet Kuningan', -6.2118, 106.8280, 6, true),
  ('11111111-1111-1111-1111-111111111102', 'Bundaran HI', -6.1950, 106.8231, 7, true),
  ('11111111-1111-1111-1111-111111111102', 'Sarinah', -6.1867, 106.8232, 8, false),
  ('11111111-1111-1111-1111-111111111102', 'Monas', -6.1754, 106.8272, 9, true)
on conflict do nothing;