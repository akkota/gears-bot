# Permissions System

## Hierarchy

The internal permission hierarchy is:

1. `discord_admin`
2. `admin`
3. `srmod`
4. `mod`
5. `everyone`

In code, this is represented in ascending rank order in `src/shared/permissions.ts`.

## Current Helpers

`src/shared/permissions.ts` exports:

- `PermissionLevel` type union
- `getPermissionRank(level)`
- `hasLevel(actual, required)`
- `getMemberPermissionLevel(member, settings)`
- `requirePermission(interaction, requiredLevel)`
- `getHigherPermissionLevel(left, right)`
- `hasRequiredPermissionLevel(userLevel, requiredLevel)` (compatibility alias)

These helpers are pure and tested in `tests/permissions.test.ts`.

## Enforcement Strategy

- Role IDs configured in `guild_settings` drive custom role-based checks.
- Discord-native permissions (KickMembers, BanMembers, ManageMessages, etc.) are checked separately.
- Role hierarchy checks (bot and moderator vs target) are handled in `src/shared/discordChecks.ts`.

## Implemented Command Rules

- `/set-admin-role`: Server owner only
- `/unset-admin-role`: Server owner only
- `/set-srmod-role`: Server owner or configured Admin role
- `/unset-srmod-role`: Server owner or configured Admin role
- `/set-mod-role`: Server owner or configured Admin role
- `/unset-mod-role`: Server owner or configured Admin role
- `/set-log-channel`: Server owner or configured Admin role

Important behavior:

- Discord Administrator alone is not enough for staff-role override operations.
- Server owner is always allowed.
- Configured Admin role membership is checked directly from `guild_settings.admin_role_id`.
- Bot must have `ManageRoles` and role-hierarchy control to configure/delete staff roles.
- Selected/stored roles are rejected when they are managed roles, `@everyone`, or at/above bot highest role.

## Permission Resolution Inputs

`getMemberPermissionLevel` uses:

- Discord Administrator flag on the invoker
- Configured role IDs from `guild_settings`:
  - `admin_role_id`
  - `srmod_role_id`
  - `mod_role_id`
- Invoker role IDs

`requirePermission` fetches guild settings from `guild_settings`, resolves the invoker's level, and returns a pass/fail boolean after sending an ephemeral failure message when needed.

For staff setup authority checks, use:

- `requireOwner(interaction)`
- `requireOwnerOrConfiguredAdmin(interaction)`
- `hasConfiguredAdminRole(member, settings)`
- `isServerOwnerForAdminRoleConfig(guild, member)`

## Staff Role Defaults

When running `/set-admin-role`, `/set-srmod-role`, `/set-mod-role`:

- `role` and `name` cannot both be provided.
- If `role` is provided, that role is used (after validation).
- Else if `name` is provided, bot reuses or creates that exact name.
- Else bot uses default names.

Default names:

- `/set-admin-role` reuses/creates `Admin` with `Administrator`
- `/set-srmod-role` reuses/creates `SrMod` with:
  - `ModerateMembers`
  - `MuteMembers`
  - `ManageMessages`
  - `KickMembers`
  - `BanMembers`
- `/set-mod-role` reuses/creates `Mod` with:
  - `ModerateMembers`
  - `ManageMessages`

Permission syncing behavior:

- Before saving to Supabase, bot ensures required permissions exist on the role.
- Sync is additive: required permissions are added; unrelated existing permissions are preserved.
- If role validation or permission syncing fails, settings are not updated in Supabase.

Command intent mapping for moderation levels:

- Mod should handle bot commands such as `/warn`, `/purge`
- SrMod should handle Mod actions plus `/mute`, `/kick`, `/ban`
- Admin should handle SrMod actions plus setup/admin commands
