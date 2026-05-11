-- Enable UUID generation
create extension if not exists "pgcrypto";

-- =========================
-- ENUMS
-- =========================

do $$ begin
  create type moderation_action as enum (
    'warn',
    'mute',
    'unmute',
    'kick',
    'ban',
    'unban',
    'massban',
    'purge'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type suggestion_status as enum (
    'pending',
    'approved',
    'rejected',
    'implemented'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type reaction_role_mode as enum (
    'button',
    'select_menu'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type permission_level as enum (
    'everyone',
    'mod',
    'srmod',
    'admin',
    'discord_admin'
  );
exception
  when duplicate_object then null;
end $$;


-- =========================
-- GUILDS
-- =========================

create table if not exists guilds (
  guild_id text primary key,
  name text,
  icon_url text,
  owner_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =========================
-- GUILD SETTINGS
-- =========================
-- Stores main server config:
-- mod role, sr mod role, admin role, log channel, timezone, etc.

create table if not exists guild_settings (
  guild_id text primary key references guilds(guild_id) on delete cascade,

  mod_role_id text,
  srmod_role_id text,
  admin_role_id text,

  log_channel_id text,
  mute_role_id text,

  default_timezone text default 'UTC',

  suggestions_channel_id text,
  suggestions_review_channel_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_guild_settings_mod_role
  on guild_settings(mod_role_id);

create index if not exists idx_guild_settings_srmod_role
  on guild_settings(srmod_role_id);

create index if not exists idx_guild_settings_admin_role
  on guild_settings(admin_role_id);


-- =========================
-- COMMAND PERMISSION OVERRIDES
-- =========================
-- Optional but useful.
-- You can hardcode permissions in code first,
-- but this allows per-server customization later.

create table if not exists command_permissions (
  id uuid primary key default gen_random_uuid(),

  guild_id text not null references guilds(guild_id) on delete cascade,
  command_name text not null,
  required_level permission_level not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(guild_id, command_name)
);

create index if not exists idx_command_permissions_guild
  on command_permissions(guild_id);


-- =========================
-- MODERATION CASES
-- =========================
-- One row per moderation action.
-- For massban/purge, target_user_id can be null and details go in metadata.

create table if not exists moderation_cases (
  id uuid primary key default gen_random_uuid(),

  guild_id text not null references guilds(guild_id) on delete cascade,

  action moderation_action not null,

  target_user_id text,
  moderator_user_id text not null,

  reason text,
  duration_seconds integer,
  expires_at timestamptz,

  channel_id text,
  message_id text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists idx_moderation_cases_guild
  on moderation_cases(guild_id);

create index if not exists idx_moderation_cases_target
  on moderation_cases(target_user_id);

create index if not exists idx_moderation_cases_moderator
  on moderation_cases(moderator_user_id);

create index if not exists idx_moderation_cases_action
  on moderation_cases(action);

create index if not exists idx_moderation_cases_expires_at
  on moderation_cases(expires_at);


-- =========================
-- MODERATION CASE TARGETS
-- =========================
-- Useful for /massban.
-- Example:
-- one moderation_cases row with action = 'massban'
-- many target rows here.

create table if not exists moderation_case_targets (
  id uuid primary key default gen_random_uuid(),

  case_id uuid not null references moderation_cases(id) on delete cascade,
  target_user_id text not null,

  success boolean not null default false,
  error_message text,

  created_at timestamptz not null default now()
);

create index if not exists idx_moderation_case_targets_case
  on moderation_case_targets(case_id);

create index if not exists idx_moderation_case_targets_user
  on moderation_case_targets(target_user_id);


-- =========================
-- ACTIVE MUTES
-- =========================
-- Tracks temporary mutes so your worker can unmute later.

create table if not exists active_mutes (
  id uuid primary key default gen_random_uuid(),

  guild_id text not null references guilds(guild_id) on delete cascade,
  user_id text not null,
  case_id uuid references moderation_cases(id) on delete set null,

  muted_by_user_id text not null,
  reason text,

  expires_at timestamptz,
  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(guild_id, user_id)
);

create index if not exists idx_active_mutes_guild
  on active_mutes(guild_id);

create index if not exists idx_active_mutes_expires_at
  on active_mutes(expires_at);

create index if not exists idx_active_mutes_active
  on active_mutes(active);


-- =========================
-- PURGE LOGS
-- =========================
-- /purge usually does not need every deleted message stored,
-- but summary logs are useful.

create table if not exists purge_logs (
  id uuid primary key default gen_random_uuid(),

  guild_id text not null references guilds(guild_id) on delete cascade,
  channel_id text not null,
  moderator_user_id text not null,

  amount_requested integer not null,
  amount_deleted integer not null,

  filter_user_id text,
  reason text,

  case_id uuid references moderation_cases(id) on delete set null,

  created_at timestamptz not null default now()
);

create index if not exists idx_purge_logs_guild
  on purge_logs(guild_id);

create index if not exists idx_purge_logs_channel
  on purge_logs(channel_id);


-- =========================
-- USER TIMEZONES
-- =========================
-- Supports /timezone.
-- Guild default timezone is in guild_settings.
-- User-specific timezone goes here.

create table if not exists user_timezones (
  id uuid primary key default gen_random_uuid(),

  guild_id text not null references guilds(guild_id) on delete cascade,
  user_id text not null,
  timezone text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(guild_id, user_id)
);

create index if not exists idx_user_timezones_guild
  on user_timezones(guild_id);

create index if not exists idx_user_timezones_user
  on user_timezones(user_id);


-- =========================
-- REMINDERS
-- =========================
-- Supports /remind.
-- Your bot worker checks pending reminders and sends them.

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),

  guild_id text references guilds(guild_id) on delete cascade,

  user_id text not null,
  channel_id text not null,

  reminder_text text not null,
  remind_at timestamptz not null,

  completed boolean not null default false,
  completed_at timestamptz,

  created_at timestamptz not null default now()
);

create index if not exists idx_reminders_due
  on reminders(remind_at)
  where completed = false;

create index if not exists idx_reminders_user
  on reminders(user_id);

create index if not exists idx_reminders_guild
  on reminders(guild_id);


-- =========================
-- SUGGESTIONS
-- =========================
-- Supports /suggest.
-- Can later support upvotes/downvotes with reactions or buttons.

create table if not exists suggestions (
  id uuid primary key default gen_random_uuid(),

  guild_id text not null references guilds(guild_id) on delete cascade,

  author_user_id text not null,

  suggestion_text text not null,
  status suggestion_status not null default 'pending',

  suggestion_channel_id text,
  suggestion_message_id text,

  review_channel_id text,
  review_message_id text,

  reviewed_by_user_id text,
  review_reason text,
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_suggestions_guild
  on suggestions(guild_id);

create index if not exists idx_suggestions_author
  on suggestions(author_user_id);

create index if not exists idx_suggestions_status
  on suggestions(status);


-- =========================
-- SUGGESTION VOTES
-- =========================
-- Optional for now, but useful if you want buttons later.

create table if not exists suggestion_votes (
  id uuid primary key default gen_random_uuid(),

  suggestion_id uuid not null references suggestions(id) on delete cascade,
  user_id text not null,

  vote integer not null check (vote in (-1, 1)),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(suggestion_id, user_id)
);

create index if not exists idx_suggestion_votes_suggestion
  on suggestion_votes(suggestion_id);


-- =========================
-- REACTION ROLE MESSAGES
-- =========================
-- Supports /reaction-role setup.

create table if not exists reaction_role_messages (
  id uuid primary key default gen_random_uuid(),

  guild_id text not null references guilds(guild_id) on delete cascade,

  channel_id text not null,
  message_id text not null,

  title text,
  description text,

  mode reaction_role_mode not null default 'button',

  created_by_user_id text not null,

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(guild_id, message_id)
);

create index if not exists idx_reaction_role_messages_guild
  on reaction_role_messages(guild_id);

create index if not exists idx_reaction_role_messages_message
  on reaction_role_messages(message_id);


-- =========================
-- REACTION ROLE OPTIONS
-- =========================
-- Each option maps one emoji/button/select option to one Discord role.

create table if not exists reaction_role_options (
  id uuid primary key default gen_random_uuid(),

  reaction_role_message_id uuid not null references reaction_role_messages(id) on delete cascade,

  role_id text not null,

  label text not null,
  description text,

  emoji text,

  sort_order integer not null default 0,

  created_at timestamptz not null default now(),

  unique(reaction_role_message_id, role_id)
);

create index if not exists idx_reaction_role_options_message
  on reaction_role_options(reaction_role_message_id);

create index if not exists idx_reaction_role_options_role
  on reaction_role_options(role_id);


-- =========================
-- CUSTOM EVENT/AUDIT LOG
-- =========================
-- General internal logs.
-- Useful for debugging bot behavior.

create table if not exists bot_audit_logs (
  id uuid primary key default gen_random_uuid(),

  guild_id text references guilds(guild_id) on delete cascade,

  actor_user_id text,
  event_type text not null,

  command_name text,
  channel_id text,
  target_user_id text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists idx_bot_audit_logs_guild
  on bot_audit_logs(guild_id);

create index if not exists idx_bot_audit_logs_event
  on bot_audit_logs(event_type);

create index if not exists idx_bot_audit_logs_created_at
  on bot_audit_logs(created_at);