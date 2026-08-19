# Commands Guide (Beginner Friendly)

This page explains every command currently implemented in the bot.

How to read this page:
- `Purpose`: what the command is for.
- `Who can use it`: who is allowed to run it.
- `Example`: what to type in Discord.
- `Inputs`: what each option means.
- `What happens`: what the bot does after you run it.
- `Example success response`: what a normal success message looks like.
- `Common errors`: what usually goes wrong and how to fix it.

Important moderation note:
- Moderators cannot take action on members with equal or higher roles.
- Server owner can bypass user-vs-target hierarchy checks.
- The bot itself must also be higher than the target role to moderate.

## `/ping`
Purpose:
- Check if the bot is online.

Who can use it:
- Everyone.

Example:
- `/ping`

Inputs:
- None.

What happens:
- Bot replies privately to you.

Example success response:
- `Pong!`

Common errors:
- Usually none. If no response, bot may be offline.

## `/set-admin-role`
Purpose:
- Choose which server role counts as bot-level `admin`.

Who can use it:
- Server owner only.

Example:
- `/set-admin-role role:@Admin`
- `/set-admin-role name:AdminTeam`
- `/set-admin-role` (uses default `Admin` role name)

Inputs:
- `role` (optional): pick an existing Discord role.
- `name` (optional): role name to find or create.

What happens:
- Bot validates the role.
- Bot ensures required permissions are present.
- Bot saves the role ID in server settings.

Example success response:
- `Admin role set to @Admin.`

Common errors:
- `Provide either role or name, not both.`: you filled both options.
- `Cannot configure the @everyone role.`: pick a normal role.
- `Bot cannot manage that role...`: move bot role above target role.

## `/set-srmod-role`
Purpose:
- Choose which role counts as `srmod` (senior moderator).

Who can use it:
- Server owner or configured Admin role.

Example:
- `/set-srmod-role role:@SrMod`
- `/set-srmod-role name:Senior Moderators`
- `/set-srmod-role` (uses default `SrMod` role name)

Inputs:
- `role` (optional): existing role.
- `name` (optional): name to reuse/create.

What happens:
- Bot saves the role ID as `srmod`.
- Bot syncs required permissions, including voice mute ability.

Example success response:
- `SrMod role set to @SrMod.`

Common errors:
- Permission denied if user is not owner/Admin.
- Role hierarchy error if bot cannot manage selected role.

## `/set-mod-role`
Purpose:
- Choose which role counts as `mod`.

Who can use it:
- Server owner or configured Admin role.

Example:
- `/set-mod-role role:@Mod`
- `/set-mod-role name:Moderators`
- `/set-mod-role` (uses default `Mod` role name)

Inputs:
- `role` (optional): existing role.
- `name` (optional): name to reuse/create.

What happens:
- Bot validates and saves role as `mod`.

Example success response:
- `Mod role set to @Mod.`

Common errors:
- Same as other role setup commands (invalid role, hierarchy, no permission).

## `/unset-admin-role`
Purpose:
- Remove the configured Admin role from bot settings.

Who can use it:
- Server owner only.

Example:
- `/unset-admin-role`
- `/unset-admin-role delete_role:true`

Inputs:
- `delete_role` (optional boolean):
- `false` or omitted: only clears bot setting.
- `true`: deletes the Discord role too, then clears setting.

What happens:
- Bot clears saved Admin role ID.
- If `delete_role:true`, bot deletes the role first.

Example success response:
- `Admin role unset.`

Common errors:
- `No configured Admin role was found.`: nothing saved yet.
- Delete failed due to hierarchy: move bot role above target role.

## `/unset-srmod-role`
Purpose:
- Remove configured SrMod role from bot settings.

Who can use it:
- Server owner or configured Admin role.

Example:
- `/unset-srmod-role`
- `/unset-srmod-role delete_role:true`

Inputs:
- `delete_role` (optional boolean), same behavior as unset-admin.

What happens:
- Clears stored SrMod role ID.

Example success response:
- `SrMod role unset.`

Common errors:
- Not configured yet.
- Bot cannot delete role due to role hierarchy.

## `/unset-mod-role`
Purpose:
- Remove configured Mod role from bot settings.

Who can use it:
- Server owner or configured Admin role.

Example:
- `/unset-mod-role`
- `/unset-mod-role delete_role:true`

Inputs:
- `delete_role` (optional boolean), same behavior as other unset commands.

What happens:
- Clears stored Mod role ID.

Example success response:
- `Mod role unset.`

Common errors:
- Not configured yet.
- Bot cannot delete role due to hierarchy.

## `/set-log-channel`
Purpose:
- Choose where moderation/setup log messages are posted.

Who can use it:
- Server owner or configured Admin role.

Example:
- `/set-log-channel channel:#bot-logs`

Inputs:
- `channel` (required): text channel for logs.

What happens:
- Bot saves the channel ID.
- Future moderation/setup actions attempt to log there.

Example success response:
- `Log channel set to #bot-logs.`

Common errors:
- Permission denied if user is not owner/Admin.
- Invalid channel if channel no longer exists.

## `/mute`
Purpose:
- Voice-mute a member currently in a voice channel.

Who can use it:
- SrMod and above.
- User must also have Discord `Mute Members` permission.

Example:
- `/mute user:@Spammer reason:Spamming in VC`

Inputs:
- `user` (required): target member.
- `reason` (optional): short reason for logs.

What happens:
- Bot checks hierarchy and permissions.
- Bot applies Discord voice mute.
- Bot stores a moderation case.

Example success response:
- `Voice-muted username#1234.`

Common errors:
- `That member is not currently connected to a voice channel.`
- `You need the Discord Mute Members permission...`
- `You cannot mute a member with an equal or higher role.`

## `/kick`
Purpose:
- Remove a member from the server.

Who can use it:
- SrMod and above.
- User must also have Discord `Kick Members` permission.

Example:
- `/kick user:@User reason:Repeated spam`

Inputs:
- `user` (required): target member.
- `reason` (optional): reason for logs.

What happens:
- Bot checks hierarchy and permissions.
- Bot kicks target member.
- Bot stores a moderation case.

Example success response:
- `Kicked username#1234.`

Common errors:
- `You cannot kick a member with an equal or higher role.`
- `I cannot kick this member due to role hierarchy.`

## `/ban`
Purpose:
- Ban one user by mention or numeric ID.

Who can use it:
- SrMod and above.
- User must also have Discord `Ban Members` permission.

Example:
- `/ban user_or_id:@User reason:Severe harassment`
- `/ban user_or_id:123456789012345678 delete_message_days:1 reason:Raid`

Inputs:
- `user_or_id` (required): mention or raw user ID.
- `delete_message_days` (optional): delete up to 7 days of message history.
- `reason` (optional): reason for logs.

What happens:
- If target is in server, hierarchy checks run.
- If target is not in server, ID-only ban still runs.
- Bot stores moderation case.

Example success response:
- `Banned username#1234 (123456789012345678).`

Common errors:
- `Provide a valid user mention or numeric user ID.`
- `You cannot ban a member with an equal or higher role.`
- `Failed to ban that user.`

Testing status:
- Automated checks pass.
- Manual Discord testing is still recommended.

## `/massban`
Purpose:
- Ban multiple user IDs in one command.

Who can use it:
- Admin and above.
- User must also have Discord `Ban Members` permission.

Example:
- `/massban user_ids:111...,222...,333... reason:Raid cleanup`
- `/massban user_ids:111... 222... 333... reason:Alt accounts`

Inputs:
- `user_ids` (required): comma-separated or space-separated IDs.
- `reason` (optional): reason for logs.

What happens:
- Bot creates one massban case.
- Bot tries each ID one by one.
- Failures do not stop the rest.
- Per-target success/failure is saved.

Example success response:
- `Massban complete. Success: 7. Failed: 2.`

Common errors:
- `No valid user IDs provided...`: input is malformed.
- Hierarchy blocks for targets currently in guild.
- Some IDs may fail while others succeed.

Testing status:
- Automated checks pass.
- Manual Discord testing is still recommended.

## `/purge`
Purpose:
- Delete recent messages in current channel.

Who can use it:
- Mod and above.
- User must also have Discord `Manage Messages` permission.

Example:
- `/purge amount:25`
- `/purge amount:50 user:@User reason:Spam cleanup`

Inputs:
- `amount` (required): number from 1 to 100.
- `user` (optional): only delete that user’s messages.
- `reason` (optional): reason for logs.

What happens:
- Bot fetches recent messages.
- Bot deletes matching messages in bulk.
- Bot stores summary logs (not every message).

Example success response:
- `Deleted 25 message(s).`

Common errors:
- `Amount must be between 1 and 100.`
- `Messages older than 14 days cannot be bulk deleted.`
- Missing `Manage Messages` permission.

## `/reaction-role`
Purpose:
- Let admins create clickable role panels where users can self-assign roles.

Who can use it:
- Admin and above for setup commands.
- Everyone can click panel buttons to toggle roles.

Example:
- `/reaction-role create channel:#roles title:Choose Roles description:Pick your tags`
- `/reaction-role add-option message_id:123456789012345678 role:@Announcements label:Announcements emoji:📢`

Inputs:
- `create` subcommand:
- `channel` (required): where panel message should be posted.
- `title` (required): panel title.
- `description` (optional): panel description text.
- `add-option` subcommand:
- `message_id` (required): panel message ID returned by `create`, or a Discord message link to that panel. No character cap in the slash option — paste the full ID or link.
- `role` (required): role users will get/remove when clicking.
- `label` (required): button label shown to users.
- `emoji` (optional): button emoji.
- `description` (optional): internal option note for storage/use.

What happens:
- Admin creates a panel message first.
- Admin adds one or more role options to that panel.
- Users click buttons to toggle each mapped role on/off.
- Mappings are stored so they still work after bot restarts.

Example success response:
- `Reaction role panel created in #roles. Message ID: ...`
- `Added role option @Announcements to panel message ...`
- User click result: `Added role @Announcements.` or `Removed role @Announcements.`

Common errors:
- `No active reaction role panel found for that message ID.`: wrong message ID or inactive panel.
- `Panel message no longer exists. The panel was deactivated.`: panel message was deleted.
- `I need the Discord Manage Roles permission...`: bot lacks required native permission.
- `I cannot manage that role...`: target role is above/equal to bot’s highest role.
- `That role no longer exists...`: mapped role was deleted.

## `/remind`
Purpose:
- Set a reminder in this server channel.

Who can use it:
- Everyone.

Example:
- `/remind time:10m message:Check mod queue`
- `/remind time:2h message:Start event`

Inputs:
- `time` (required): relative time like `10m`, `2h`, `3d`.
- `message` (required): what to remind you about.

What happens:
- Bot saves reminder to database.
- Worker sends reminder when due.
- Reminder is marked completed after send.

Example success response:
- `Reminder set for ...`

Common errors:
- `Invalid time format...`: use `m`, `h`, or `d`.
- If channel was deleted later, reminder is safely skipped/completed.

## `/timestamp`
Purpose:
- Convert a date/time into Discord timestamp formats.

Who can use it:
- Everyone.

Example:
- `/timestamp datetime:2026-05-12 18:00 timezone:America/Los_Angeles`
- `/timestamp datetime:2026-05-12T18:00:00Z`

Inputs:
- `datetime` (required): date and time text.
- `timezone` (optional): IANA timezone.

What happens:
- Bot parses input and returns multiple Discord timestamp styles.

Example success response:
- `Short time: <t:...:t>`
- `Long date/time: <t:...:F>`
- `Relative time: <t:...:R>`
- `Raw epoch seconds: ...`

Common errors:
- Invalid datetime format.
- Invalid timezone name.

## `/define`
Purpose:
- Look up the meaning of a word.

Who can use it:
- Everyone.

Example:
- `/define word:resilient`
- `/define word:community`

Inputs:
- `word` (required): the word you want defined.

What happens:
- Bot queries a dictionary provider.
- Bot returns the top definitions (and example usage when available).

Example success response:
- `Word: resilient`
- `1. Able to recover quickly from difficulties. (adjective)`

Common errors:
- `No definition found for ...`: word was not found in the dictionary source.
- `Dictionary service is temporarily unavailable...`: dictionary API/network issue; retry shortly.

## `/timezone set`
Purpose:
- Save your timezone for this server.

Who can use it:
- Everyone.

Example:
- `/timezone set timezone:America/New_York`

Inputs:
- `timezone` (required): IANA timezone name.

What happens:
- Bot stores your timezone in the database for this guild.

Example success response:
- `Your timezone has been set to America/New_York.`

Common errors:
- Invalid timezone name.

## `/timezone view`
Purpose:
- See your saved timezone and the server default timezone.

Who can use it:
- Everyone.

Example:
- `/timezone view`

Inputs:
- None.

What happens:
- Bot shows:
- your timezone (if set)
- guild default timezone
- effective timezone used for fallback

Example success response:
- `Your timezone: America/New_York`
- `Guild default timezone: UTC`
- `Effective timezone: America/New_York`

Common errors:
- Usually none.

## `/timezone convert`
Purpose:
- Convert a time from one timezone to another.

Who can use it:
- Everyone.

Example:
- `/timezone convert datetime:2026-05-12 15:00 from_timezone:UTC to_timezone:America/Chicago`
- `/timezone convert datetime:2026-05-12 15:00`

Inputs:
- `datetime` (required): source date/time text.
- `from_timezone` (optional): source timezone.
- `to_timezone` (optional): target timezone.

What happens:
- If you omit timezones, bot uses your saved timezone first, then guild default.
- Bot returns source display, target display, and Discord timestamp.

Example success response:
- `Source (UTC): ...`
- `Target (America/Chicago): ...`
- `Discord: <t:...:F> (<t:...:R>)`

Common errors:
- Invalid source/target timezone.
- Invalid datetime format.

## `/timezone guild-default`
Purpose:
- Set the server’s default timezone fallback.

Who can use it:
- Admin and above.

Example:
- `/timezone guild-default timezone:America/Los_Angeles`

Inputs:
- `timezone` (required): IANA timezone.

What happens:
- Bot saves guild default timezone in settings.
- Used when a user has no personal timezone saved.

Example success response:
- `Guild default timezone set to America/Los_Angeles.`

Common errors:
- Permission denied if user is below Admin.
- Invalid timezone name.

## `/userinfo`
Purpose:
- Show profile and server member details for a user.

Who can use it:
- Everyone.

Example:
- `/userinfo`
- `/userinfo user:@Member`

Inputs:
- `user` (optional): user to inspect.

What happens:
- Bot sends an info embed with account and membership details.

Example success response:
- Embed with username, join date, role count, and IDs.

Common errors:
- Target member not found in guild.

## `/serverinfo`
Purpose:
- Show server details.

Who can use it:
- Everyone.

Example:
- `/serverinfo`

Inputs:
- None.

What happens:
- Bot sends an embed with server name, owner, member counts, and creation time.

Example success response:
- Embed with key server information.

Common errors:
- Command must be run inside a server.

## `/roleinfo`
Purpose:
- Show details for a specific role.

Who can use it:
- Everyone.

Example:
- `/roleinfo role:@SrMod`

Inputs:
- `role` (required): role to inspect.

What happens:
- Bot sends embed with role ID, color, position, mentionable status, and permissions summary.

Example success response:
- Embed with selected role details.

Common errors:
- Role not found.

## `/project search`
Purpose:
- Search the ESW projects database by topic, project name, or chapter.

Who can use it:
- Everyone.

Example:
- `/project search query:hydroponics`
- `/project search query:smoothie bike chapter:Brown`

Inputs:
- `query` (required): keyword, project name, or topic.
- `chapter` (optional): school/chapter name filter.

What happens:
- Bot searches cached Plan.io projects.
- Results show chapter, status, a short summary, and buttons that open the project page.

Example success response:
- Embed titled `ESW project search` with matching projects and link buttons.

Common errors:
- `No matching projects found.`: try a broader keyword or different chapter name.
- Search temporarily unavailable: Plan.io or the database could not be reached.

## `/set-email-channel`
Purpose:
- Choose where distribution-list emails are posted.

Who can use it:
- Server owner or configured Admin.

Example:
- `/set-email-channel channel:#announcements`

What happens:
- Bot stores the channel. A dedicated mailbox (configured via IMAP env vars) is polled and new list emails are posted here. Replies and bounce messages are ignored.

## `/set-calendar`
Purpose:
- Connect a Google Calendar so new events become Discord scheduled events.

Who can use it:
- Server owner or configured Admin.

Example:
- `/set-calendar calendar_id:esw@group.calendar.google.com announce_channel:#events`

Inputs:
- `calendar_id` (required): Google Calendar ID.
- `announce_channel` (optional): also post a message when a new event is synced.

What happens:
- Bot stores the calendar ID and syncs upcoming events into Discord Scheduled Events.

## `/set-social-channel`
Purpose:
- Choose where Instagram and LinkedIn posts are mirrored.

Who can use it:
- Server owner or configured Admin.

Example:
- `/set-social-channel channel:#social`

What happens:
- Bot stores the channel. Configured Instagram/LinkedIn accounts are polled; new posts are announced with a link. Existing posts are imported silently on first run.

## `/rank`
Purpose:
- Show a member's garden, level, Discord rank, and garden unlocks.

Who can use it:
- Everyone.

Example:
- `/rank`
- `/rank user:@Ada`

What happens:
- Bot posts a garden card (plots + plants) with level, XP, active boost, and the next garden unlock.
- Your own card includes Plant / Water / Harvest / Fertilize / Bag buttons.
- Discord level-roles from `/level-role` still apply; they are listed as the current rank on the card.

## `/garden`
Purpose:
- Tend plots, harvest produce, and spend harvests on a timed chat-XP boost.

Who can use it:
- Everyone.

Example:
- `/garden view`
- `/garden plant seed:Radish`
- `/garden water`
- `/garden harvest`
- `/garden inventory`

What happens:
- You start with 1 plot. More plots, seeds, watering (Lv 5), and fertilizer (Lv 20) unlock as you level.
- Plants must grow before harvest. Waiting longer (up to a peak, then wilt) makes a stronger XP boost.
- Harvests go into a bag (12 max). Using one starts a chat-XP multiplier. Only one boost at a time.

Common errors:
- `No empty plot. Harvest something first.`
- `That plot is not ready to harvest yet.`
- `The watering can unlocks at level 5.`

## `/xp`
Purpose:
- Check a member's XP total and level.

Who can use it:
- Everyone.

Example:
- `/xp`
- `/xp user:@Ada`

What happens:
- Bot shows current XP, level, rank name, and progress to the next level.

## `/givexp` / `/setxp`
Purpose:
- Staff tools to add or set XP.

Who can use it:
- SrMod and above.

Example:
- `/givexp user:@Ada amount:500`
- `/setxp user:@Ada amount:800`

What happens:
- XP updates through the same path as chat XP, so skipped ranks still unlock and Discord roles stay in sync.
- A New Role Unlocked message is included when a rank threshold is crossed.

## `/level-role`
Purpose:
- Customize the rank ladder (name, required level, Discord role).

Who can use it:
- Server owner or configured Admin.

Example:
- `/level-role setup-defaults`
- `/level-role add name:Rising level:5`
- `/level-role add name:Rising level:5 role:@Rising`
- `/level-role list`
- `/level-role remove level:5`

What happens:
- `/level-role add` creates a Discord role from `name` if you omit `role` (reuses an exact name match). New roles are created with no extra permissions at the bottom of the role list, just above @everyone.
- The highest qualifying rank is the member's current role. Lower ladder roles are removed. Unrelated Discord roles are left alone.
- Chat XP (25 XP / message, 30s cooldown) uses this same ladder.

## `/welcome`
Purpose:
- Send a message when someone joins, and when someone boosts.

Who can use it:
- Server owner or configured Admin.

Example:
- `/welcome set channel:#welcome message:Welcome {user} to {server}!`
- `/welcome boost channel:#announcements`
- `/welcome show`

What happens:
- Templates can use `{user}`, `{server}`, `{memberCount}`, and `{boosts}`.
- Requires Server Members Intent in the Discord Developer Portal.

## `/repeat`
Purpose:
- Post the same message on a timer.

Who can use it:
- Server owner or configured Admin.

Example:
- `/repeat add channel:#rules interval:1d message:Please read the rules.`
- `/repeat list`
- `/repeat remove id:...`

What happens:
- First post is after one interval. Shortest interval is 1 minute (`10m`, `1h`, `1d`).

## `/autorespond`
Purpose:
- Auto-reply when a message contains a trigger phrase.

Who can use it:
- Server owner or configured Admin.

Example:
- `/autorespond add trigger:office hours reply:Office hours are posted in #announcements.`
- `/autorespond list`
- `/autorespond remove trigger:office hours`

What happens:
- Match is case-insensitive. The longest matching trigger wins. Bots are ignored. Same trigger waits 8 seconds before firing again.
- Requires Message Content Intent in the Discord Developer Portal.

## `/embed`
Purpose:
- Create or edit a bot-authored embed.

Who can use it:
- Server owner or configured Admin.

Example:
- `/embed create title:Welcome description:Read the rules. color:#7c3aed`
- `/embed edit message_id:123... title:Updated title`

What happens:
- Edit only works on embeds created with `/embed create` (message id or message link).

## `/set-habit-channel`
Purpose:
- Choose where website habit proofs are posted for Discord Approve/Reject.

Who can use it:
- Server owner or configured Admin.

Example:
- `/set-habit-channel channel:#challenges`

What happens:
- Pending photo logs from the ESW website are posted with Approve/Reject buttons (Mod+). Either Discord or the website staff queue can verify the same log.

## Moderation Policy Note
- Team policy: 3 warnings should trigger a 1-day mute.
- Current status: `/warn` is not implemented yet in this build, so this policy is not automated yet.
