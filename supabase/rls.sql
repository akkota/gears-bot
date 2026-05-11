-- =====================================================
-- RLS SETUP FOR DISCORD BOT TABLES
-- Backend-only access pattern:
-- - anon/authenticated users get no direct access
-- - service_role backend client can access
-- =====================================================


-- =========================
-- ENABLE RLS
-- =========================

alter table guilds enable row level security;
alter table guild_settings enable row level security;
alter table command_permissions enable row level security;
alter table moderation_cases enable row level security;
alter table moderation_case_targets enable row level security;
alter table active_mutes enable row level security;
alter table purge_logs enable row level security;
alter table user_timezones enable row level security;
alter table reminders enable row level security;
alter table suggestions enable row level security;
alter table suggestion_votes enable row level security;
alter table reaction_role_messages enable row level security;
alter table reaction_role_options enable row level security;
alter table bot_audit_logs enable row level security;


-- =========================
-- OPTIONAL: FORCE RLS
-- =========================
-- This forces table owners to obey RLS too.
-- Service role still bypasses RLS because it has BYPASSRLS.
-- Useful as an extra safety measure.

alter table guilds force row level security;
alter table guild_settings force row level security;
alter table command_permissions force row level security;
alter table moderation_cases force row level security;
alter table moderation_case_targets force row level security;
alter table active_mutes force row level security;
alter table purge_logs force row level security;
alter table user_timezones force row level security;
alter table reminders force row level security;
alter table suggestions force row level security;
alter table suggestion_votes force row level security;
alter table reaction_role_messages force row level security;
alter table reaction_role_options force row level security;
alter table bot_audit_logs force row level security;


-- =========================
-- REVOKE DEFAULT PUBLIC ACCESS
-- =========================
-- Extra hardening. This prevents broad public schema/table access.
-- Your service role backend can still access these.

revoke all on table guilds from anon, authenticated;
revoke all on table guild_settings from anon, authenticated;
revoke all on table command_permissions from anon, authenticated;
revoke all on table moderation_cases from anon, authenticated;
revoke all on table moderation_case_targets from anon, authenticated;
revoke all on table active_mutes from anon, authenticated;
revoke all on table purge_logs from anon, authenticated;
revoke all on table user_timezones from anon, authenticated;
revoke all on table reminders from anon, authenticated;
revoke all on table suggestions from anon, authenticated;
revoke all on table suggestion_votes from anon, authenticated;
revoke all on table reaction_role_messages from anon, authenticated;
revoke all on table reaction_role_options from anon, authenticated;
revoke all on table bot_audit_logs from anon, authenticated;


-- =========================
-- INTENTIONALLY NO POLICIES
-- =========================
-- With RLS enabled and no anon/authenticated policies:
-- - anon users cannot select/insert/update/delete
-- - authenticated Supabase users cannot select/insert/update/delete
-- - your Discord bot using SUPABASE_SERVICE_ROLE_KEY can still operate