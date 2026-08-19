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
- ESW project search (Plan.io)
- Email list → Discord
- Google Calendar → Discord events
- Instagram/LinkedIn auto-posts
- XP / levels, garden plots, and customizable level-up roles
- Welcome / boost messages, repeating messages, autoresponder, embed maker
- Website habit challenge verification bridge (`/set-habit-channel`)

Future modules may include:

- Tickets/modmail
- QOTW/topic system
- Chapter updates
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
/project
/set-email-channel
/set-calendar
/set-social-channel
/set-habit-channel
/rank
/garden
/xp
/givexp
/setxp
/level-role
/welcome
/repeat
/autorespond
/embed
```

## Permission Rules

- `/set-admin-role`: Server owner only
- `/set-srmod-role`: Discord Administrator only
- `/set-mod-role`: Discord Administrator only
