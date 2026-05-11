# Setup Guide (Step-by-Step For Beginners)

This guide is written for server admins who are new to bots and new to coding.

If you follow this in order, you can fully set up the current bot features.

## 1. What You Need Before Starting
- A Discord server where you have owner/admin control.
- A Discord bot application and bot token.
- A Supabase project.
- Node.js and `pnpm` installed on your computer.

## 2. Configure Environment Variables
Create a `.env` file in the project root.

Use this template:

```env
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NODE_ENV=development
LOG_LEVEL=debug
```

Notes:
- Keep `.env` private.
- `.env` is ignored by git.
- You can copy from `.env.example`.

## 3. Install and Start the Bot
Run:

```bash
pnpm install
pnpm register:guild
pnpm dev
```

What these commands do:
- `pnpm install`: installs dependencies.
- `pnpm register:guild`: uploads slash commands to your test server.
- `pnpm dev`: starts the bot.

Quick health check:
- In Discord, run `/ping`.
- Expected reply: `Pong!` (private/ephemeral).

## 4. First-Time Server Configuration
Run these setup commands in this order:
1. `/set-admin-role`
2. `/set-srmod-role`
3. `/set-mod-role`
4. `/set-log-channel`

What this does:
- Defines who can run setup/moderation commands.
- Sets where moderation and setup logs go.

Tips:
- You can pick an existing role (`role` option), or provide a custom role name (`name` option), or leave both blank to use defaults.
- Default role names are exactly `Admin`, `SrMod`, `Mod`.
- Do not provide `role` and `name` together.

## 5. Understand Unset vs Delete
Commands:
- `/unset-admin-role`
- `/unset-srmod-role`
- `/unset-mod-role`

Behavior:
- Without `delete_role:true`: removes bot config only.
- With `delete_role:true`: bot tries to delete the Discord role too, then clears config.

Use `delete_role:true` carefully.

## 6. Moderation Hierarchy (Simple Version)
- Mods can moderate lower roles only.
- SrMods can moderate lower roles only.
- Admins can moderate lower roles only.
- Equal role or higher role targets are blocked.
- Server owner can bypass user-vs-target hierarchy checks.
- Bot role must be above target role too.

## 7. Current Moderation Policy Note
- Team policy: 3 warnings should trigger a 1-day mute.
- Current status: `/warn` is not implemented yet, so this is not automated yet.

## 8. Manual Testing Checklist
After setup, test these commands in a safe test server:
- `/mute`
- `/kick`
- `/ban`
- `/massban`
- `/purge`
- `/remind`
- `/timestamp`
- `/timezone set`
- `/timezone view`
- `/timezone convert`
- `/timezone guild-default`
- `/userinfo`
- `/serverinfo`
- `/roleinfo`

For `/ban` and `/massban` specifically:
- Automated checks pass in development.
- Manual Discord testing is still recommended before production use.

## 9. Common Setup Problems
- Slash commands do not appear:
- run `pnpm register:guild` again
- confirm `DISCORD_GUILD_ID` is correct

- Bot says it cannot manage a role:
- move bot role above staff roles in Discord role list

- Permission denied unexpectedly:
- confirm configured Admin/SrMod/Mod roles are correct
- confirm user has both bot-level role and required Discord native permission

- Reminder never sends:
- ensure bot is still running
- ensure original channel still exists and bot can post there

## 10. Where To Go Next
- Use [commands.md](/Users/akhilkota/Documents/PersonalProjects/Gears/docs/user/commands.md) for detailed command-by-command help.
- Use [permissions.md](/Users/akhilkota/Documents/PersonalProjects/Gears/docs/user/permissions.md) for role and access rules.
