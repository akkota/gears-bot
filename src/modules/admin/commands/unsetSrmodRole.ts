import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../../shared/command.js";
import { requireOwnerOrConfiguredAdmin } from "../../../shared/permissions.js";
import {
  StaffRoleSetupError,
  unsetStaffRole,
} from "../services/guildSettingsService.js";

export const unsetSrmodRoleCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("unset-srmod-role")
    .setDescription("Unset the configured SrMod role.")
    .addBooleanOption((option) =>
      option
        .setName("delete_role")
        .setDescription("Delete the Discord role from the server as well."),
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const permissionContext = await requireOwnerOrConfiguredAdmin(interaction);
    if (!permissionContext) {
      return;
    }

    const shouldDeleteRole =
      interaction.options.getBoolean("delete_role", false) ?? false;

    try {
      const result = await unsetStaffRole({
        guild: permissionContext.guild,
        roleKind: "srmod",
        deleteRole: shouldDeleteRole,
        actor: interaction.user,
      });

      await interaction.editReply({
        content: result.deletedRoleId
          ? `SrMod role unset and deleted (<@&${result.deletedRoleId}>).`
          : "SrMod role unset. The Discord role was left in the server.",
      });
      return;
    } catch (error) {
      if (error instanceof StaffRoleSetupError) {
        await interaction.editReply({ content: error.message });
        return;
      }

      throw error;
    }
  },
};
