# Permissions

## Bot Permission Levels

The bot uses this role hierarchy:

1. `discord_admin`
2. `admin`
3. `srmod`
4. `mod`
5. `everyone`

Configured role IDs are stored in `guild_settings`.

## Current Command Access

- `/ping`: Everyone
- `/set-admin-role`: Server owner only
- `/unset-admin-role`: Server owner only
- `/set-srmod-role`: Server owner or configured Admin role
- `/unset-srmod-role`: Server owner or configured Admin role
- `/set-mod-role`: Server owner or configured Admin role
- `/unset-mod-role`: Server owner or configured Admin role
- `/set-log-channel`: Server owner or configured Admin role
- `/userinfo`: Everyone
- `/serverinfo`: Everyone
- `/roleinfo`: Everyone

Future command permissions follow the project’s MVP matrix and will be documented here as each command is implemented.

## Staff Role Defaults

When setup commands omit a role, bot reuses/creates:

- `Admin` (Administrator permission)
- `SrMod` (Moderate Members, Manage Messages, Kick Members, Ban Members)
- `Mod` (Moderate Members, Manage Messages)

Setup command input behavior:

- `role` selects an existing role directly.
- `name` reuses/creates a role by that exact name.
- If both are omitted, default names above are used.
- `role` and `name` cannot both be provided.

## Intended Command Capabilities

- Mod: `/warn`, `/mute`, `/purge`
- SrMod: Mod actions plus `/kick`, `/ban`
- Admin: SrMod actions plus setup/admin commands

Native Discord permission requirements (in addition to bot-level role checks):

- `/mute`: requires Discord `Moderate Members`
- `/purge`: requires Discord `Manage Messages`
- `/kick`: requires Discord `Kick Members`
- `/ban`: requires Discord `Ban Members`
