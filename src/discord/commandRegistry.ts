import { setAdminRoleCommand } from "../modules/admin/commands/setAdminRole.js";
import { setLogChannelCommand } from "../modules/admin/commands/setLogChannel.js";
import { setModRoleCommand } from "../modules/admin/commands/setModRole.js";
import { setSrmodRoleCommand } from "../modules/admin/commands/setSrmodRole.js";
import { unsetAdminRoleCommand } from "../modules/admin/commands/unsetAdminRole.js";
import { unsetModRoleCommand } from "../modules/admin/commands/unsetModRole.js";
import { unsetSrmodRoleCommand } from "../modules/admin/commands/unsetSrmodRole.js";
import { pingCommand } from "../modules/utility/commands/ping.js";
import { roleinfoCommand } from "../modules/utility/commands/roleinfo.js";
import { serverinfoCommand } from "../modules/utility/commands/serverinfo.js";
import { userinfoCommand } from "../modules/utility/commands/userinfo.js";
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
  userinfoCommand,
  serverinfoCommand,
  roleinfoCommand,
];

export const commandMap = new Map(
  registeredCommands.map((command) => [command.data.name, command]),
);
