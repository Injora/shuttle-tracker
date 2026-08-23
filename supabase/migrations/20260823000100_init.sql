-- ============================================================
-- Shuttle Tracker — full schema, PostGIS, RLS, seeds, triggers
-- ============================================================

create extension if not exists postgis;

-- ------------------------------------------------------------
-- Stops (read from DB so admins can edit coordinates/radii)
-- ------------------------------------------------------------
create table if not exists public.stops (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('college', 'hostel')),
  lat double precision not null,
  lng double precision not null,
  geofence_radius_m integer not null default 150,
  order_index integer not null default 0,
  geog geography(point, 4326) generated always as (st_setsrid(st_makepoint(lng, lat), 4326)::geography) stored
);

-- ------------------------------------------------------------
-- Students / drivers (profiles tied to auth.users)
-- ------------------------------------------------------------
create table if not exists public.students (
  user_id uuid primary key references auth.users (id) on delete cascade,
  student_number text not null unique,
  full_name text not null,
  hostel_stop_id text not null references public.stops (id)
);

create table if not exists public.drivers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  driver_number text not null unique,
  full_name text not null,
  carrier text not null default 'Other'
);

-- ------------------------------------------------------------
-- Shuttle sessions and locations
-- ------------------------------------------------------------
create table if not exists public.shuttle_sessions (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers (user_id),
  trip_type text not null check (trip_type in ('hostel_run', 'tribe_run')),
  status text not null default 'active' check (status in ('active', 'ended')),
  signal text not null default 'ok' check (signal in ('ok', 'degraded')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.shuttle_locations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.shuttle_sessions (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  heading double precision,
  speed double precision,
  accuracy double precision,
  recorded_at timestamptz not null default now(),
  geog geography(point, 4326) generated always as (st_setsrid(st_makepoint(lng, lat), 4326)::geography) stored
);

create index if not exists shuttle_locations_session_time_idx
  on public.shuttle_locations (session_id, recorded_at desc);

-- ------------------------------------------------------------
-- Pickup requests (enforce one active per student via partial unique index)
-- ------------------------------------------------------------
create table if not exists public.pickup_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (user_id),
  stop_id text not null references public.stops (id),
  status text not null default 'pending' check (status in ('pending', 'dispatched', 'expired', 'cancelled')),
  created_at timestamptz not null default now(),
  dispatched_at timestamptz,
  expires_at timestamptz
);

create unique index if not exists one_active_request_per_student
  on public.pickup_requests (student_id)
  where status in ('pending', 'dispatched');

create index if not exists pickup_requests_stop_status_idx
  on public.pickup_requests (stop_id, status, created_at);

-- ------------------------------------------------------------
-- Dispatch alerts (queued until a matching session claims them)
-- ------------------------------------------------------------
create table if not exists public.dispatch_alerts (
  id uuid primary key default gen_random_uuid(),
  stop_id text not null references public.stops (id),
  session_id uuid references public.shuttle_sessions (id),
  request_count integer not null default 0,
  triggered_at timestamptz not null default now(),
  claimed_at timestamptz
);

create index if not exists dispatch_alerts_unclaimed_idx
  on public.dispatch_alerts (stop_id, claimed_at)
  where claimed_at is null;

-- ------------------------------------------------------------
-- Deadzones (configurable radius / notes)
-- ------------------------------------------------------------
create table if not exists public.deadzones (
  id text primary key,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  radius_m integer not null default 400,
  notes text
);

-- ------------------------------------------------------------
-- RLS policies
-- ------------------------------------------------------------
alter table public.stops enable row level security;
alter table public.students enable row level security;
alter table public.drivers enable row level security;
alter table public.shuttle_sessions enable row level security;
alter table public.shuttle_locations enable row level security;
alter table public.pickup_requests enable row level security;
alter table public.dispatch_alerts enable row level security;
alter table public.deadzones enable row level security;

-- Stops: readable by all authenticated users, writable only by admins (service role)
drop policy if exists "stops_read" on public.stops;
create policy "stops_read" on public.stops
  for select using (auth.role() = 'authenticated');

-- Students: a student reads their own row
drop policy if exists "students_read_own" on public.students;
create policy "students_read_own" on public.students
  for select using (auth.uid() = user_id);

-- Drivers: a driver reads their own row
drop policy if exists "drivers_read_own" on public.drivers;
create policy "drivers_read_own" on public.drivers
  for select using (auth.uid() = user_id);

-- Shuttle sessions: readable by all authenticated (for live map), driver writes own
drop policy if exists "sessions_read" on public.shuttle_sessions;
create policy "sessions_read" on public.shuttle_sessions
  for select using (auth.role() = 'authenticated');

drop policy if exists "sessions_insert_own" on public.shuttle_sessions;
create policy "sessions_insert_own" on public.shuttle_sessions
  for insert with check (auth.uid() = driver_id);

drop policy if exists "sessions_update_own" on public.shuttle_sessions;
create policy "sessions_update_own" on public.shuttle_sessions
  for update using (auth.uid() = driver_id);

-- Shuttle locations: readable by all authenticated, driver writes own active session
drop policy if exists "locations_read" on public.shuttle_locations;
create policy "locations_read" on public.shuttle_locations
  for select using (auth.role() = 'authenticated');

drop policy if exists "locations_insert_own" on public.shuttle_locations;
create policy "locations_insert_own" on public.shuttle_locations
  for insert with check (
    exists (
      select 1 from public.shuttle_sessions s
      where s.id = session_id and s.driver_id = auth.uid() and s.status = 'active'
    )
  );

-- Pickup requests: students read/write their own
drop policy if exists "requests_read_own" on public.pickup_requests;
create policy "requests_read_own" on public.pickup_requests
  for select using (auth.uid() = student_id);

drop policy if exists "requests_insert_own" on public.pickup_requests;
create policy "requests_insert_own" on public.pickup_requests
  for insert with check (auth.uid() = student_id);

drop policy if exists "requests_update_own" on public.pickup_requests;
create policy "requests_update_own" on public.pickup_requests
  for update using (auth.uid() = student_id);

-- Dispatch alerts: readable by drivers only
drop policy if exists "alerts_read" on public.dispatch_alerts;
create policy "alerts_read" on public.dispatch_alerts
  for select using (
    exists (select 1 from public.drivers d where d.user_id = auth.uid())
  );

-- Deadzones: readable by all authenticated
drop policy if exists "deadzones_read" on public.deadzones;
create policy "deadzones_read" on public.deadzones
  for select using (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- Trigger: automatically expire stale pending requests
-- ------------------------------------------------------------
create or replace function public.expire_stale_requests()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.pickup_requests
  set status = 'expired'
  where status = 'pending'
    and expires_at < now();
  return null;
end;
$$;

drop trigger if exists expire_stale_requests_trigger on public.pickup_requests;
create trigger expire_stale_requests_trigger
  after insert on public.pickup_requests
  execute function public.expire_stale_requests();

-- ------------------------------------------------------------
-- Seeds
-- ------------------------------------------------------------
insert into public.stops (id, name, kind, lat, lng, geofence_radius_m, order_index)
values
  ('college', 'D Y Patil School Of Management', 'college', 18.6204503, 73.9114378, 150, 0),
  ('hostel_1', 'YourSpace 2 Hostel', 'hostel', 18.6141596, 73.9116837, 150, 1),
  ('hostel_2', 'Your Space Students Hostel (Lohegaon)', 'hostel', 18.6119308, 73.9117003, 150, 2),
  ('hostel_3', 'Tribe Loka Hostel & CoLiving', 'hostel', 18.6037817, 73.9153888, 150, 3)
on conflict (id) do update
  set name = excluded.name,
      kind = excluded.kind,
      lat = excluded.lat,
      lng = excluded.lng,
      geofence_radius_m = excluded.geofence_radius_m,
      order_index = excluded.order_index;

insert into public.deadzones (id, name, lat, lng, radius_m, notes)
values
  ('deadzone_1', 'Lohegaon road — Jio dropout zone', 18.617440, 73.910439, 400,
   'Starting guess. Tune after a few real trips through this stretch.')
on conflict (id) do update
  set name = excluded.name,
      lat = excluded.lat,
      lng = excluded.lng,
      radius_m = excluded.radius_m,
      notes = excluded.notes;
