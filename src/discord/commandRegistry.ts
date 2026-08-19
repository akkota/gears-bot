import { setAdminRoleCommand } from "../modules/admin/commands/setAdminRole.js";
import { setLogChannelCommand } from "../modules/admin/commands/setLogChannel.js";
import { setModRoleCommand } from "../modules/admin/commands/setModRole.js";
import { setSrmodRoleCommand } from "../modules/admin/commands/setSrmodRole.js";
import { unsetAdminRoleCommand } from "../modules/admin/commands/unsetAdminRole.js";
import { unsetModRoleCommand } from "../modules/admin/commands/unsetModRole.js";
import { unsetSrmodRoleCommand } from "../modules/admin/commands/unsetSrmodRole.js";
import { setCalendarCommand } from "../modules/calendar/commands/setCalendar.js";
import { setEmailChannelCommand } from "../modules/email/commands/setEmailChannel.js";
import { banCommand } from "../modules/moderation/commands/ban.js";
import { kickCommand } from "../modules/moderation/commands/kick.js";
import { massbanCommand } from "../modules/moderation/commands/massban.js";
import { muteCommand } from "../modules/moderation/commands/mute.js";
import { purgeCommand } from "../modules/moderation/commands/purge.js";
import { setHabitChannelCommand } from "../modules/habits/commands/setHabitChannel.js";
import { projectCommand } from "../modules/projects/commands/project.js";
import { reactionRoleCommand } from "../modules/reactionRoles/commands/reactionRole.js";
import { autorespondCommand } from "../modules/server/commands/autorespond.js";
import { embedCommand } from "../modules/server/commands/embed.js";
import { repeatCommand } from "../modules/server/commands/repeat.js";
import { welcomeCommand } from "../modules/server/commands/welcome.js";
import { setSocialChannelCommand } from "../modules/social/commands/setSocialChannel.js";
import { defineCommand } from "../modules/utility/commands/define.js";
import { pingCommand } from "../modules/utility/commands/ping.js";
import { remindCommand } from "../modules/utility/commands/remind.js";
import { roleinfoCommand } from "../modules/utility/commands/roleinfo.js";
import { serverinfoCommand } from "../modules/utility/commands/serverinfo.js";
import { timezoneCommand } from "../modules/utility/commands/timezone.js";
import { timestampCommand } from "../modules/utility/commands/timestamp.js";
import { userinfoCommand } from "../modules/utility/commands/userinfo.js";
import { gardenCommand } from "../modules/garden/commands/garden.js";
import { givexpCommand } from "../modules/xp/commands/givexp.js";
import { levelRoleCommand } from "../modules/xp/commands/levelRole.js";
import { rankCommand } from "../modules/xp/commands/rank.js";
import { setxpCommand } from "../modules/xp/commands/setxp.js";
import { xpCommand } from "../modules/xp/commands/xp.js";
import type { SlashCommand } from "../shared/command.js";

export const registeredCommands: SlashCommand[] = [
  pingCommand,
  setAdminRoleCommand,
  setSrmodRoleCommand,
  setModRoleCommand,
  setLogChannelCommand,
  unsetAdminRoleCommand,
  unsetSrmodRoleCommand,
  unsetModRoleCommand,
  setCalendarCommand,
  setEmailChannelCommand,
  setSocialChannelCommand,
  setHabitChannelCommand,
  banCommand,
  massbanCommand,
  kickCommand,
  muteCommand,
  purgeCommand,
  reactionRoleCommand,
  projectCommand,
  defineCommand,
  remindCommand,
  timestampCommand,
  timezoneCommand,
  userinfoCommand,
  serverinfoCommand,
  roleinfoCommand,
  rankCommand,
  gardenCommand,
  xpCommand,
  givexpCommand,
  setxpCommand,
  levelRoleCommand,
  welcomeCommand,
  repeatCommand,
  autorespondCommand,
  embedCommand,
];

export const commandMap = new Map(
  registeredCommands.map((command) => [command.data.name, command]),
);
