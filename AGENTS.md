# AGENTS.md

## Project

This is a modular Discord bot for community/student organization management.

The current MVP includes:

- Admin role configuration
- Moderation commands
- Utility commands
- Suggestions
- Reaction roles
- Reminders
- Timezone utilities

Future modules may include:

- Tickets/modmail
- QOTW/topic system
- Google Calendar sync
- Chapter updates
- XP/economy
- Analytics
- Invite tracking
- Anti-spam
- Anti-phish

## Stack

- TypeScript
- Node.js
- discord.js v14
- Supabase Postgres
- @supabase/supabase-js
- Vitest
- tsx
- zod

No ORM is used.

## Current MVP Scope

Only implement these commands unless explicitly asked otherwise:

```txt
/set-mod-role
/set-srmod-role
/set-admin-role
/set-log-channel
/warn
/mute
/kick
/ban
/massban
/purge
/userinfo
/serverinfo
/roleinfo
/remind
/timestamp
/timezone
/calculate
/define
/suggest
/reaction-role