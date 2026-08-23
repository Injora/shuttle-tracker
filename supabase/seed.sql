-- Optional seed for local development: creates a default admin account.
-- Run after `supabase db reset`. In production, create your admin manually
-- via the Supabase dashboard (Authentication -> Users -> Add user, then set
-- user_metadata.role = 'admin').

-- NOTE: The password below is for local dev only. Replace before any real use.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@shuttletracker.local',
  crypt('admin-password-change-me', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"admin"}',
  now(),
  now()
where not exists (
  select 1 from auth.users where email = 'admin@shuttletracker.local'
);
