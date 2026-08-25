-- ============================================================
-- Fix-up: repair auth.users rows created by dummy_accounts.sql
-- (and seed.sql) that are missing empty-string values for the
-- four token columns Supabase Auth requires to be non-NULL.
--
-- Run this once in the SQL editor after the earlier seed.
-- ============================================================

update auth.users
set confirmation_token = coalesce(confirmation_token, ''),
    recovery_token     = coalesce(recovery_token, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change       = coalesce(email_change, '')
where confirmation_token is null
   or recovery_token is null
   or email_change_token_new is null
   or email_change is null;
