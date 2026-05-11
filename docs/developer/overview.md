# Developer Overview

## Current Scope

This repository contains a modular Discord bot built with:

- TypeScript
- Node.js
- discord.js v14
- Supabase Postgres via `@supabase/supabase-js`
- Vitest

Current implemented bootstrap features:

- Environment validation in `src/env.ts`
- Supabase backend client in `src/db/supabase.ts`
- Permission ranking/resolution helpers in `src/shared/permissions.ts`
- Guild context + Discord permission checks in `src/shared/discordChecks.ts`
- Guild settings repository in `src/db/guildSettingsRepo.ts`
- Admin setup service in `src/modules/admin/services/guildSettingsService.ts`
- Slash command routing via registry and interaction handler
- Implemented slash commands:
  - `/ping`
  - `/set-admin-role`
  - `/set-srmod-role`
  - `/set-mod-role`
  - `/set-log-channel`
  - `/unset-admin-role`
  - `/unset-srmod-role`
  - `/unset-mod-role`
  - `/userinfo`
  - `/serverinfo`
  - `/roleinfo`

## Architecture Rules

- Slash commands only.
- No prefix commands.
- No ORM.
- No raw Supabase calls directly in command files.
- Database access belongs in `src/db/`.
- Permission checks belong in `src/shared/permissions.ts`.
- Discord permission/hierarchy checks belong in `src/shared/discordChecks.ts`.
- Command files stay thin; service files own business logic.

## MVP Command Roadmap

Primary MVP commands (as defined in `AGENTS.md`):

- `/set-mod-role`
- `/set-srmod-role`
- `/set-admin-role`
- `/set-log-channel`
- `/warn`
- `/mute`
- `/kick`
- `/ban`
- `/massban`
- `/purge`
- `/userinfo`
- `/serverinfo`
- `/roleinfo`
- `/remind`
- `/timestamp`
- `/timezone`
- `/calculate`
- `/define`
- `/suggest`
- `/reaction-role`

Current implementation status:

- `/ping` is a health check command.
- Staff role setup commands can select existing roles or auto-create/reuse exact defaults (`Admin`, `SrMod`, `Mod`) when omitted.
- Unset commands support clear-only and explicit role deletion (`delete_role=true`).
- Setup/unset actions persist to Supabase and emit setup logs to the configured log channel when possible.
- Info commands are stateless, use live Discord data, and perform no database writes.
