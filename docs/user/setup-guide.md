# Setup Guide

## Prerequisites

- Node.js
- pnpm
- Discord bot application and token
- Discord client ID and test guild ID
- Supabase project with schema and RLS applied

## Environment File

Create `.env` with:

```env
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NODE_ENV=development
LOG_LEVEL=debug
```

`.env` is git-ignored. Use `.env.example` as a template.

## Install And Run

```bash
pnpm install
pnpm register:guild
pnpm dev
```

After registration and startup, run `/ping` in your test server. The bot should reply with an ephemeral `Pong!`.

## Initial Server Setup Commands

After the bot is online, configure roles/channels with:

- `/set-admin-role`
- `/set-srmod-role`
- `/set-mod-role`
- `/set-log-channel`

Role setup notes:

- If no role is provided, bot reuses/creates exact names: `Admin`, `SrMod`, `Mod`.
- Only one configured Admin, SrMod, and Mod role ID is stored per server.
- Use `/unset-admin-role`, `/unset-srmod-role`, `/unset-mod-role` to clear settings.
- Pass `delete_role:true` only when you want the actual Discord role deleted.
