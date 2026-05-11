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
