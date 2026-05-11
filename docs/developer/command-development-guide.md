# Command Development Guide

## Rules

- Implement slash commands only.
- Keep command files thin.
- Put business logic in service modules.
- Do not place raw Supabase queries in command files.
- Route all permission checks through shared helpers.

## Current Bootstrap Command

Implemented commands currently:

- `/ping`
- `/set-admin-role`
- `/set-srmod-role`
- `/set-mod-role`
- `/set-log-channel`
- `/unset-admin-role`
- `/unset-srmod-role`
- `/unset-mod-role`
- `/kick`
- `/mute`
- `/purge`
- `/userinfo`
- `/serverinfo`
- `/roleinfo`

`/ping` exists to verify:

- Bot login
- Interaction handling
- Guild command registration flow

Implementation locations:

- Runtime entry: `src/index.ts`
- Interaction dispatch: `src/discord/interactionHandler.ts`
- Command registry: `src/discord/commandRegistry.ts`
- Admin service: `src/modules/admin/services/guildSettingsService.ts`
- Guild registration: `scripts/register-guild-commands.ts`

Staff role setup behavior:

- `/set-*-role` accepts an optional role.
- If omitted, service reuses or creates exact-name defaults (`Admin`, `SrMod`, `Mod`).
- Unset commands clear stored IDs; deletion only happens with `delete_role=true`.

Info command behavior:

- `/userinfo`, `/serverinfo`, and `/roleinfo` read live Discord state only.
- These commands do not touch database tables and do not store usage rows.

Purge command behavior:

- `/purge` requires bot-level `mod` and native Discord `ManageMessages` for both user and bot.
- Stores one moderation case and one purge summary row.
- Does not store individual deleted messages.
- Handles partial deletes when old messages are skipped by Discord bulk delete rules.

Mute command behavior:

- `/mute` requires bot-level `srmod` and native Discord `MuteMembers` for both user and bot.
- Uses shared actor-vs-target and bot-vs-target hierarchy checks.
- Applies Discord voice mute to members in voice channels, then persists `moderation_cases` + `active_mutes`.
- Sends a log embed to configured log channel when available.

Kick command behavior:

- `/kick` requires bot-level `srmod` and native Discord `KickMembers` for both user and bot.
- Uses shared actor-vs-target and bot-vs-target hierarchy checks.
- Kicks the member, then persists a `moderation_cases` row with `action='kick'`.
- Sends a log embed to configured log channel when available.

## Pattern For Future Commands

1. Define slash command schema.
2. Register command (guild first during development).
3. Handle interaction in command routing layer.
4. Validate permissions.
5. Call service method.
6. Service calls repository methods in `src/db/`.
7. Add tests.
8. Update developer and user docs.
