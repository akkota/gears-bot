# Gears

Modular Discord bot for **Engineers for Sustainable World (ESW)** communities — built for day-to-day server ops, with a modular foundation for chapter-specific tooling.

Gears handles moderation, staff role configuration, reaction roles, reminders, timezone utilities, and other community management features. It’s written in TypeScript with discord.js v14 and Supabase Postgres.

## Features

- **Staff setup** — configure Admin / SrMod / Mod roles and a log channel
- **Moderation** — mute, kick, ban, massban, purge (with hierarchy checks + case logging)
- **Reaction roles** — button-based role panels with persisted mappings
- **Utilities** — reminders, timestamps, timezones, dictionary lookups, server/user/role info
- **ESW projects** — searchable Plan.io project database with chapter summaries and page links
- **Integrations** — Google Calendar → Discord events, list-email → Discord, Instagram/LinkedIn auto-posts
- **Permissions** — bot-level ranks layered with native Discord permissions

## Stack

- TypeScript + Node.js
- [discord.js](https://discord.js.org/) v14
- [Supabase](https://supabase.com/) Postgres (`@supabase/supabase-js`)
- Vitest, tsx, zod

## Quick start

**Requirements:** Node.js, [pnpm](https://pnpm.io/), a Discord bot application, and a Supabase project.

```bash
pnpm install
cp .env.example .env   # fill in tokens and Supabase credentials
pnpm register:guild    # register slash commands to your test guild
pnpm dev               # start the bot
```

Then in Discord, run `/ping` — you should get an ephemeral `Pong!`.

First-time server setup (in order):

1. `/set-admin-role`
2. `/set-srmod-role`
3. `/set-mod-role`
4. `/set-log-channel`

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Run the bot with hot reload |
| `pnpm build` | Compile TypeScript |
| `pnpm start` | Run the compiled bot |
| `pnpm typecheck` | Type-check without emitting |
| `pnpm test` | Run Vitest |
| `pnpm register:guild` | Register slash commands for `DISCORD_GUILD_ID` |
| `pnpm register:global` | Register slash commands globally |

## Environment

See [`.env.example`](.env.example):

| Variable | Purpose |
| --- | --- |
| `DISCORD_TOKEN` | Bot token |
| `DISCORD_CLIENT_ID` | Application / client ID |
| `DISCORD_GUILD_ID` | Test guild for guild command registration |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only) |
| `PLANIO_BASE_URL` | Optional Plan.io host (defaults to the public ESW projects DB) |
| `IMAP_*` | Optional dedicated mailbox for list-email → Discord |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Optional service account JSON for Calendar sync |
| `INSTAGRAM_*` / `LINKEDIN_*` | Optional social auto-post credentials |

Keep `.env` private — it is gitignored.

## Documentation

- [Setup guide](docs/user/setup-guide.md) — step-by-step for server admins
- [Commands](docs/user/commands.md) — full command reference
- [Permissions](docs/user/permissions.md) — bot ranks + Discord permissions
- [Developer overview](docs/developer/overview.md) — architecture and scope
- [Command development](docs/developer/command-development-guide.md)
- [Database schema](docs/developer/database-schema.md)

## Architecture notes

- Slash commands only (no prefix commands)
- No ORM — database access lives in `src/db/`
- Command files stay thin; business logic lives in services
- Permission checks are centralized in `src/shared/`

## License

ISC
