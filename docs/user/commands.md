# Commands

## Available Now

- `/ping`: Checks whether the bot is online. Replies with ephemeral `Pong!`.
- `/set-admin-role role?:<role> name?:<string>`: Owner only. Uses selected role, else custom-name role, else default `Admin`.
- `/set-srmod-role role?:<role> name?:<string>`: Owner or configured Admin role. Uses selected role, else custom-name role, else default `SrMod`.
- `/set-mod-role role?:<role> name?:<string>`: Owner or configured Admin role. Uses selected role, else custom-name role, else default `Mod`.
- `/unset-admin-role delete_role?:<boolean>`: Owner-only unset/delete of configured Admin role.
- `/unset-srmod-role delete_role?:<boolean>`: Owner or configured Admin role can unset/delete configured SrMod role.
- `/unset-mod-role delete_role?:<boolean>`: Owner or configured Admin role can unset/delete configured Mod role.
- `/set-log-channel channel:<channel>`: Sets bot log channel (owner or configured Admin role).
- `/kick user:<user> reason?:<text>`: Kicks a member from the server.
- `/mute user:<user> reason?:<text>`: Voice-mutes a member who is currently connected to a voice channel.
- `/purge amount:<1-100> user?:<user> reason?:<text>`: Deletes recent messages in the current channel. Optional user filter.
- `/userinfo user?:<user>`: Shows live Discord profile and server membership info.
- `/serverinfo`: Shows live Discord server metadata.
- `/roleinfo role:<role>`: Shows live Discord role metadata.

Unset vs delete:

- Without `delete_role` (or `false`): only clears the stored role ID.
- With `delete_role:true`: bot deletes the Discord role and then clears the stored role ID.
- Role deletion only runs when explicitly requested.

Setup validation:

- Do not provide both `role` and `name` at the same time.
- If a role already exists with the chosen name, bot reuses it (no duplicate role creation).
- Bot syncs required staff permissions onto selected/reused/created roles before saving configuration.

Purge behavior notes:

- Amount must be between 1 and 100.
- Old messages may be skipped by Discord bulk delete limits.
- If no messages are deleted, command returns a clear message.

Mute behavior notes:

- Target must currently be in a voice channel.
- Requires both moderator and bot to have Discord `Mute Members`.
- Target must be below both moderator and bot role hierarchy (owner bypass applies only to moderator-vs-target check).

## Planned MVP Commands

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
