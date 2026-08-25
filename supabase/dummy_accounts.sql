-- ============================================================
-- Dummy accounts for local/dev testing.
-- Run this in the Supabase SQL editor (or after `supabase db reset`).
--
-- Quorum for auto-dispatch is 10 pending requests at one stop
-- (see submit_pickup_request p_quorum default), so 12 students are
-- seeded at hostel_1 to allow triggering a dispatch manually.
--
-- All passwords:
--   Students: student123
--   Drivers:  driver123
--   Admin:    admin123
--
-- Idempotent: re-running re-applies the documented password + role.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Students
--   (number, full_name, hostel_stop_id)
--   hostel_1: YourSpace 2      -> 2024-001 .. 2024-012 (12 = quorum +2)
--   hostel_2: Your Space Lohegaon -> 2024-013 .. 2024-015
--   hostel_3: Tribe Loka       -> 2024-016 .. 2024-018
-- ------------------------------------------------------------
do $$
declare
  v_nums text[] := array[
    '2024-001','2024-002','2024-003','2024-004','2024-005','2024-006',
    '2024-007','2024-008','2024-009','2024-010','2024-011','2024-012',
    '2024-013','2024-014','2024-015','2024-016','2024-017','2024-018'
  ];
  v_names text[] := array[
    'Aarav Sharma','Priya Patel','Rohan Verma','Ananya Iyer','Vikram Singh',
    'Diya Mehta','Arjun Nair','Ishita Rao','Karan Kapoor','Neha Gupta',
    'Aditya Joshi','Sneha Kulkarni','Rahul Desai','Pooja Naik','Sahil Pawar',
    'Tanvi More','Manav Chavan','Riya Shinde'
  ];
  v_hostels text[] := array[
    'hostel_1','hostel_1','hostel_1','hostel_1','hostel_1','hostel_1',
    'hostel_1','hostel_1','hostel_1','hostel_1','hostel_1','hostel_1',
    'hostel_2','hostel_2','hostel_2','hostel_3','hostel_3','hostel_3'
  ];
  v_uid uuid;
  v_email text;
  i int;
begin
  for i in 1..array_length(v_nums, 1) loop
    v_email := v_nums[i] || '@shuttletracker.local';

    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    select
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      v_email,
      crypt('student123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"student"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    where not exists (select 1 from auth.users where email = v_email);

    select id into v_uid from auth.users where email = v_email;

    update auth.users
    set encrypted_password = crypt('student123', gen_salt('bf')),
        raw_user_meta_data = '{"role":"student"}',
        confirmation_token = coalesce(confirmation_token, ''),
        recovery_token = coalesce(recovery_token, ''),
        email_change_token_new = coalesce(email_change_token_new, ''),
        email_change = coalesce(email_change, '')
    where id = v_uid;

    insert into public.students (user_id, student_number, full_name, hostel_stop_id)
    values (v_uid, v_nums[i], v_names[i], v_hostels[i])
    on conflict (user_id) do update
      set student_number = excluded.student_number,
          full_name = excluded.full_name,
          hostel_stop_id = excluded.hostel_stop_id;
  end loop;
end $$;

-- ------------------------------------------------------------
-- Drivers
--   (number, full_name, carrier)
--   DRV-01 -> Jio, DRV-02 -> Airtel
-- ------------------------------------------------------------
do $$
declare
  v_nums text[] := array['DRV-01','DRV-02'];
  v_names text[] := array['Rajesh Kumar','Sunil Jadhav'];
  v_carriers text[] := array['Jio','Airtel'];
  v_uid uuid;
  v_email text;
  i int;
begin
  for i in 1..array_length(v_nums, 1) loop
    -- Login email is lowercased by the app: identifier.trim().toLowerCase()
    v_email := lower(v_nums[i]) || '@shuttletracker.local';

    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    select
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      v_email,
      crypt('driver123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"driver"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    where not exists (select 1 from auth.users where email = v_email);

    select id into v_uid from auth.users where email = v_email;

    update auth.users
    set encrypted_password = crypt('driver123', gen_salt('bf')),
        raw_user_meta_data = '{"role":"driver"}',
        confirmation_token = coalesce(confirmation_token, ''),
        recovery_token = coalesce(recovery_token, ''),
        email_change_token_new = coalesce(email_change_token_new, ''),
        email_change = coalesce(email_change, '')
    where id = v_uid;

    insert into public.drivers (user_id, driver_number, full_name, carrier)
    values (v_uid, v_nums[i], v_names[i], v_carriers[i])
    on conflict (user_id) do update
      set driver_number = excluded.driver_number,
          full_name = excluded.full_name,
          carrier = excluded.carrier;
  end loop;
end $$;

-- ------------------------------------------------------------
-- Admin (identified by email + user_metadata.role = 'admin')
-- ------------------------------------------------------------
do $$
declare v_uid uuid;
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  select
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@shuttletracker.local',
    crypt('admin123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"admin"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  where not exists (select 1 from auth.users where email = 'admin@shuttletracker.local');

  select id into v_uid from auth.users where email = 'admin@shuttletracker.local';

  update auth.users
  set encrypted_password = crypt('admin123', gen_salt('bf')),
      raw_user_meta_data = '{"role":"admin"}',
      confirmation_token = coalesce(confirmation_token, ''),
      recovery_token = coalesce(recovery_token, ''),
      email_change_token_new = coalesce(email_change_token_new, ''),
      email_change = coalesce(email_change, '')
  where id = v_uid;
end $$;
