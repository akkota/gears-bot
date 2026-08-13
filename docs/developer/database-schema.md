# Database Schema

Schema files live in:

- `supabase/schema.sql`
- `supabase/rls.sql`

They are applied manually in Supabase.

## Access Pattern

- Backend-only access with Supabase service role key.
- RLS enabled and hardened for all bot tables.
- Bot code connects using `src/db/supabase.ts`.

## Key Tables For MVP

- `guilds`
- `guild_settings`
- `command_permissions`
- `moderation_cases`
- `active_mutes`
- `purge_logs`
- `user_timezones`
- `reminders`
- `suggestions`
- `reaction_role_messages`
- `reaction_role_options`
- `esw_projects`
- `social_posts_seen`
- `email_messages_seen`
- `calendar_event_sync`
- `user_xp`
- `level_roles`

## Repository Rule

All database access must go through repository modules under `src/db/`.
Command handlers should call services, and services should call repositories.

## Implemented Settings Writes

`src/db/guildSettingsRepo.ts` currently handles:

- Upserting `guilds` row metadata (`guild_id`, `name`, `icon_url`, `owner_id`)
- Ensuring `guild_settings` row exists for a guild
- Updating:
  - `admin_role_id`
  - `srmod_role_id`
  - `mod_role_id`
  - `log_channel_id`
  - `default_timezone`
  - `social_announce_channel_id`
  - `email_announce_channel_id`
  - `google_calendar_id`
  - `calendar_announce_channel_id`

## Implemented Moderation Writes

`/purge` currently writes:

- `moderation_cases` with `action='purge'`
- `purge_logs` summary rows

It does not persist each individual deleted message.

`/mute` currently writes:

- `moderation_cases` with `action='mute'`
- `active_mutes` upsert rows for active mute state (voice mutes persist with `expires_at = null`)

`/kick` currently writes:

- `moderation_cases` with `action='kick'`

`/ban` currently writes:

- `moderation_cases` with `action='ban'`

`/massban` currently writes:

- `moderation_cases` with `action='massban'`
- `moderation_case_targets` rows for per-target success/failure outcomes

`/remind` currently writes:

- `reminders` rows with `completed=false` until the reminder worker delivers and marks completion

`/timezone` currently writes:

- `user_timezones` upsert rows (`guild_id`, `user_id`, `timezone`)
- `guild_settings.default_timezone` for guild default timezone updates

`/reaction-role` currently writes:

- `reaction_role_messages` panel rows (`guild_id`, `channel_id`, `message_id`, mode `button`)
- `reaction_role_options` role mapping rows for each button option

`/project search` currently writes:

- `esw_projects` cache rows upserted from Plan.io (`planio_id`, identifier, name, chapter, status, summary, url)

Email/social/calendar workers currently write:

- `email_messages_seen` by `Message-ID`
- `social_posts_seen` by platform + external id
- `calendar_event_sync` mapping Google event ids to Discord scheduled event ids

`/rank`, `/givexp`, `/setxp`, and chat XP currently write:

- `user_xp` rows (`guild_id`, `user_id`, `xp`, `last_message_xp_at`)

`/level-role` currently writes:

- `level_roles` rows (`guild_id`, `name`, `required_level`, `discord_role_id`)
