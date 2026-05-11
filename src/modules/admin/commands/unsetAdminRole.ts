import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../../shared/command.js";
import { requireOwner } from "../../../shared/permissions.js";
import {
  StaffRoleSetupError,
  unsetStaffRole,
} from "../services/guildSettingsService.js";

export const unsetAdminRoleCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("unset-admin-role")
    .setDescription("Unset the configured Admin role.")
    .addBooleanOption((option) =>
      option
        .setName("delete_role")
        .setDescription("Delete the Discord role from the server as well."),
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const permissionContext = await requireOwner(interaction);
    if (!permissionContext) {
      return;
    }

    const shouldDeleteRole =
      interaction.options.getBoolean("delete_role", false) ?? false;

    try {
      const result = await unsetStaffRole({
        guild: permissionContext.guild,
        roleKind: "admin",
        deleteRole: shouldDeleteRole,
        actor: interaction.user,
      });

      await interaction.editReply({
        content: result.deletedRoleId
          ? `Admin role unset and deleted (<@&${result.deletedRoleId}>).`
          : "Admin role unset. The Discord role was left in the server.",
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
