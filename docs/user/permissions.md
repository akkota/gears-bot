# Permissions Guide (Plain English)

This bot uses two permission systems at the same time:
- Bot-level roles (Mod, SrMod, Admin) configured in this bot.
- Native Discord permissions (like Kick Members, Ban Members).

A user usually needs both.

## Bot Role Levels
From highest to lowest:
1. `discord_admin`
2. `admin`
3. `srmod`
4. `mod`
5. `everyone`

What this means in simple terms:
- `mod` can handle basic moderation.
- `srmod` can do everything mod can, plus stronger actions.
- `admin` can do setup and high-impact tools like massban.

## Moderation Hierarchy Rule (Very Important)
When moderating members:
- You cannot moderate someone with the same or higher top role than you.
- Example: SrMod cannot moderate Admin.
- Example: Mod cannot moderate SrMod or Admin.
- Server owner can bypass this user-vs-target rule.
- Discord Administrator alone does not bypass this rule unless they are the owner.
- The bot also must be above the target role, or the action fails.

## Current Command Access
- `/ping`: everyone
- `/set-admin-role`: server owner only
- `/unset-admin-role`: server owner only
- `/set-srmod-role`: server owner or configured Admin
- `/unset-srmod-role`: server owner or configured Admin
- `/set-mod-role`: server owner or configured Admin
- `/unset-mod-role`: server owner or configured Admin
- `/set-log-channel`: server owner or configured Admin
- `/mute`: SrMod+ and Discord `Mute Members`
- `/kick`: SrMod+ and Discord `Kick Members`
- `/ban`: SrMod+ and Discord `Ban Members`
- `/massban`: Admin+ and Discord `Ban Members`
- `/purge`: Mod+ and Discord `Manage Messages`
- `/reaction-role`: Admin+ (bot-level) and bot needs Discord `Manage Roles`
- `/remind`: everyone
- `/timestamp`: everyone
- `/define`: everyone
- `/timezone set`: everyone
- `/timezone view`: everyone
- `/timezone convert`: everyone
- `/timezone guild-default`: Admin+
- `/userinfo`: everyone
- `/serverinfo`: everyone
- `/roleinfo`: everyone

## Staff Roles Created By Setup Commands
If you run setup commands without selecting a role, the bot can reuse/create:
- `Admin`
- `SrMod`
- `Mod`

Default permission intent:
- `Admin`: Administrator
- `SrMod`: Moderate Members, Mute Members, Manage Messages, Kick Members, Ban Members
- `Mod`: Moderate Members, Manage Messages

## Warn/Mute Policy Note
- Team policy: 3 warnings should trigger a 1-day mute.
- Current status: `/warn` is not implemented yet, so this policy is not automatically enforced by the bot yet.

## Common Permission Errors
- `You do not have permission...`: your bot-level role is too low.
- `You need the Discord ... permission...`: your Discord role is missing a required native permission.
- `I cannot ... due to role hierarchy.`: bot role is too low in Discord role list.
- `You cannot ... a member with an equal or higher role.`: target role is too high for you.
