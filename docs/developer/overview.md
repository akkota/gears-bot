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
  - `/ban`
  - `/massban`
  - `/kick`
  - `/mute`
  - `/purge`
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
- `/mute` uses Discord voice mute, shared actor/bot hierarchy checks, and persists to `moderation_cases` + `active_mutes`.
- `/ban` is implemented with srmod-level bot permission checks, native Discord Ban Members checks, member-aware hierarchy enforcement, and moderation case persistence (`moderation_cases`).
- `/massban` is implemented with admin-level bot permission checks, native Discord Ban Members checks, per-target hierarchy enforcement where role data exists, and persistence to `moderation_cases` + `moderation_case_targets`.
- `/kick` is implemented with srmod-level bot permission checks, native Discord Kick Members checks, shared hierarchy checks, and moderation case persistence (`moderation_cases`).
- `/purge` is implemented with mod-level bot permission checks, native Discord Manage Messages checks, and summary-only persistence (`moderation_cases` + `purge_logs`).
- Info commands are stateless, use live Discord data, and perform no database writes.
