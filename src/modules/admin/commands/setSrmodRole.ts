import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../../shared/command.js";
import { requireOwnerOrConfiguredAdmin } from "../../../shared/permissions.js";
import {
  StaffRoleSetupError,
  setStaffRole,
} from "../services/guildSettingsService.js";

export const setSrmodRoleCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("set-srmod-role")
    .setDescription("Set the SrMod role used by the bot permission system.")
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("Role that should map to bot SrMod.")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Create/reuse a role with this name.")
        .setRequired(false),
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const permissionContext = await requireOwnerOrConfiguredAdmin(interaction);
    if (!permissionContext) {
      return;
    }

    const selectedRole = interaction.options.getRole("role", false);
    const selectedRoleId = selectedRole?.id ?? null;
    const customName = interaction.options.getString("name", false);

    try {
      const result = await setStaffRole({
        guild: permissionContext.guild,
        roleKind: "srmod",
        selectedRoleId,
        customRoleName: customName,
        actor: interaction.user,
      });

      await interaction.editReply({
        content:
          result.source === "created"
            ? `SrMod role created and set to <@&${result.role.id}>.`
            : `SrMod role set to <@&${result.role.id}>.`,
      });
    } catch (error) {
      if (error instanceof StaffRoleSetupError) {
        await interaction.editReply({ content: error.message });
        return;
      }

      throw error;
    }
  },
};
