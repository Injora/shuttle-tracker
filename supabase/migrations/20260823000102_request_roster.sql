-- ============================================================
-- Request roster: read-only list of active pickup requests
-- (pending + dispatched) with student name, stop, and status.
--
-- Exposed as a security-definer RPC so all authenticated roles
-- can see the roster WITHOUT widening RLS on the sensitive
-- `students` / `pickup_requests` tables directly.
-- ============================================================

create or replace function public.get_request_roster()
returns table (
  request_id uuid,
  stop_id text,
  stop_name text,
  status text,
  student_number text,
  full_name text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    pr.id,
    pr.stop_id,
    coalesce(s.name, pr.stop_id),
    pr.status,
    st.student_number,
    st.full_name,
    pr.created_at
  from public.pickup_requests pr
  join public.students st on st.user_id = pr.student_id
  left join public.stops s on s.id = pr.stop_id
  where pr.status in ('pending', 'dispatched')
  order by pr.created_at asc;
$$;

-- Only authenticated app users may call it. The function itself is
-- the single allow-listed read path; no direct table grants needed.
revoke all on function public.get_request_roster() from public;
grant execute on function public.get_request_roster() to authenticated;
