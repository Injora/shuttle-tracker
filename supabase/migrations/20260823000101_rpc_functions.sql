-- ============================================================
-- Server-side RPC functions for atomic business-rule enforcement
-- Edge Functions call these so rules run inside a single DB
-- transaction (geofence, duplicate-request, quorum, tribe gating).
-- ============================================================

-- ------------------------------------------------------------
-- submit_pickup_request
--  - validates the caller is inside the requested stop's geofence
--  - rejects if caller already has a pending/dispatched request
--  - inserts the request
--  - if that stop now has >= quorum, atomically dispatches first N
--    by created_at and enqueues a dispatch alert
-- Returns json: { ok, error?, request_id?, dispatched? }
-- ------------------------------------------------------------
create or replace function public.submit_pickup_request(
  p_student_id uuid,
  p_stop_id text,
  p_lat double precision,
  p_lng double precision,
  p_quorum integer default 10,
  p_expiry_min integer default 90
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stop public.stops%rowtype;
  v_distance double precision;
  v_existing integer;
  v_request_id uuid;
  v_dispatched_count integer := 0;
begin
  -- Rule 1: geofence check (never trust client flag alone)
  select * into v_stop from public.stops where id = p_stop_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Unknown stop.');
  end if;

  select st_distance(
    st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
    v_stop.geog
  ) into v_distance;

  if v_distance > v_stop.geofence_radius_m then
    return jsonb_build_object(
      'ok', false,
      'error', 'You must be at a registered stop to request a pickup.',
      'distance_m', round(v_distance::numeric, 1)
    );
  end if;

  -- Rule 2: one active request per student
  select count(*) into v_existing
  from public.pickup_requests
  where student_id = p_student_id
    and status in ('pending', 'dispatched');

  if v_existing > 0 then
    return jsonb_build_object('ok', false, 'error', 'You already have an active pickup request.');
  end if;

  insert into public.pickup_requests (student_id, stop_id, expires_at)
  values (p_student_id, p_stop_id, now() + make_interval(mins => p_expiry_min))
  returning id into v_request_id;

  -- Rule 3: quorum-triggered dispatch (first N pending by timestamp)
  select count(*) into v_existing
  from public.pickup_requests
  where stop_id = p_stop_id and status = 'pending';

  if v_existing >= p_quorum then
    with batch as (
      select id
      from public.pickup_requests
      where stop_id = p_stop_id and status = 'pending'
      order by created_at asc
      limit p_quorum
    )
    update public.pickup_requests pr
    set status = 'dispatched', dispatched_at = now()
    from batch
    where pr.id = batch.id;

    get diagnostics v_dispatched_count = row_count;

    insert into public.dispatch_alerts (stop_id, request_count)
    values (p_stop_id, v_dispatched_count);
  end if;

  return jsonb_build_object(
    'ok', true,
    'request_id', v_request_id,
    'dispatched', v_dispatched_count > 0,
    'dispatched_count', v_dispatched_count
  );
end;
$$;

-- ------------------------------------------------------------
-- activate_shuttle_session
--  - ensures driver has no other active session
--  - creates a session of the given trip_type
--  - claims any unclaimed dispatch alerts whose stop matches trip_type
-- Returns json: { ok, error?, session_id, claimed_alert_ids }
-- ------------------------------------------------------------
create or replace function public.activate_shuttle_session(
  p_driver_id uuid,
  p_trip_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_claimed uuid[];
  v_stops text[];
begin
  if p_trip_type not in ('hostel_run', 'tribe_run') then
    return jsonb_build_object('ok', false, 'error', 'Invalid trip type.');
  end if;

  if exists (
    select 1 from public.shuttle_sessions
    where driver_id = p_driver_id and status = 'active'
  ) then
    return jsonb_build_object('ok', false, 'error', 'You already have an active shuttle session.');
  end if;

  insert into public.shuttle_sessions (driver_id, trip_type)
  values (p_driver_id, p_trip_type)
  returning id into v_session_id;

  -- Stops covered by this trip type
  if p_trip_type = 'tribe_run' then
    v_stops := array['college', 'hostel_3'];
  else
    v_stops := array['college', 'hostel_1', 'hostel_2'];
  end if;

  -- Rule 4: claim queued alerts only for matching stops
  with claimed as (
    update public.dispatch_alerts
    set claimed_at = now(), session_id = v_session_id
    where stop_id = any(v_stops) and claimed_at is null
    returning id
  )
  select array_agg(id) into v_claimed from claimed;

  return jsonb_build_object(
    'ok', true,
    'session_id', v_session_id,
    'claimed_alert_ids', coalesce(to_jsonb(v_claimed), '[]'::jsonb)
  );
end;
$$;

-- ------------------------------------------------------------
-- end_shuttle_session
-- ------------------------------------------------------------
create or replace function public.end_shuttle_session(
  p_session_id uuid,
  p_driver_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.shuttle_sessions
  set status = 'ended', ended_at = now()
  where id = p_session_id and driver_id = p_driver_id and status = 'active';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'No active session found.');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- ------------------------------------------------------------
-- mark_degraded_sessions
--  - called periodically (cron) to mark active sessions degraded
--    when no location ping for the threshold AND last point near a deadzone
-- Returns number of sessions marked
-- ------------------------------------------------------------
create or replace function public.mark_degraded_sessions(
  p_timeout_seconds integer default 20,
  p_deadzone_radius_m integer default 400
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  update public.shuttle_sessions s
  set signal = 'degraded'
  where s.status = 'active'
    and s.signal = 'ok'
    and exists (
      select 1
      from public.shuttle_locations l
      join public.deadzones d on d.id = 'deadzone_1'
      where l.session_id = s.id
        and l.recorded_at = (
          select max(l2.recorded_at)
          from public.shuttle_locations l2
          where l2.session_id = s.id
        )
        and l.recorded_at < now() - make_interval(secs => p_timeout_seconds)
        and st_dwithin(l.geog, st_setsrid(st_makepoint(d.lng, d.lat), 4326)::geography, p_deadzone_radius_m)
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
