import { MessageFlags, Role, SlashCommandBuilder } from "discord.js";
import {
  createLevelRole,
  deleteLevelRole,
  listLevelRoles,
} from "../../../db/levelRolesRepo.js";
import type { SlashCommand } from "../../../shared/command.js";
import { requireOwnerOrConfiguredAdmin } from "../../../shared/permissions.js";
import {
  ensureRankDiscordRole,
  LevelRoleSetupError,
} from "../services/levelRoleSetup.js";
import { DEFAULT_LEVEL_ROLES } from "../services/rankLadder.js";

function uniqueConstraintMessage(error: unknown): string | null {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("required_level")) {
    return "A rank already exists at that level.";
  }
  if (message.includes("discord_role_id")) {
    return "That Discord role is already used by another rank.";
  }
  return null;
}

export const levelRoleCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("level-role")
    .setDescription("Configure the customizable level-up rank ladder.")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add a rank at a required level. Creates a Discord role from the name if you omit role.")
        .addStringOption((option) =>
          option.setName("name").setDescription("Rank name.").setRequired(true).setMaxLength(80),
        )
        .addIntegerOption((option) =>
          option
            .setName("level")
            .setDescription("Required level.")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(1000),
        )
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("Existing Discord role to use. Leave empty to create one from the name.")
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove a rank by name or level.")
        .addStringOption((option) =>
          option.setName("name").setDescription("Rank name to remove.").setRequired(false),
        )
        .addIntegerOption((option) =>
          option.setName("level").setDescription("Required level to remove.").setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("Show the configured rank ladder."),
    )
    .addSubcommand((sub) =>
      sub
        .setName("setup-defaults")
        .setDescription("Create the default Beginner → Master ranks and Discord roles."),
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const permissionContext = await requireOwnerOrConfiguredAdmin(interaction);
    if (!permissionContext) {
      return;
    }

    const guild = permissionContext.guild;
    const subcommand = interaction.options.getSubcommand(true);
    const guildMeta = {
      guildId: guild.id,
      guildName: guild.name,
      guildIconUrl: guild.iconURL(),
      guildOwnerId: guild.ownerId ?? null,
    };

    try {
      if (subcommand === "list") {
        const roles = await listLevelRoles(guild.id);
        if (roles.length === 0) {
          await interaction.editReply({
            content:
              "No custom ranks yet. Display uses the default ladder (Beginner → Master) until you run `/level-role add` or `/level-role setup-defaults`.",
          });
          return;
        }

        const lines = roles.map(
          (role) =>
            `• **${role.name}** — level ${role.requiredLevel} — <@&${role.discordRoleId}>`,
        );
        await interaction.editReply({ content: lines.join("\n") });
        return;
      }

      if (subcommand === "add") {
        const name = interaction.options.getString("name", true).trim();
        const level = interaction.options.getInteger("level", true);
        const providedRole = interaction.options.getRole("role", false);
        if (!name) {
          await interaction.editReply({ content: "Rank name cannot be empty." });
          return;
        }

        let role: Role;
        let createdRole = false;
        if (providedRole) {
          if (!(providedRole instanceof Role)) {
            await interaction.editReply({ content: "Could not resolve that Discord role." });
            return;
          }
          role = providedRole;
        } else {
          const ensured = await ensureRankDiscordRole(guild, name);
          role = ensured.role;
          createdRole = ensured.created;
        }

        await createLevelRole({
          ...guildMeta,
          name,
          requiredLevel: level,
          discordRoleId: role.id,
        });
        await interaction.editReply({
          content: createdRole
            ? `Added **${name}** at level ${level} (${role}). Created that Discord role at the bottom of the role list.`
            : `Added **${name}** at level ${level} (${role}).`,
        });
        return;
      }

      if (subcommand === "remove") {
        const name = interaction.options.getString("name", false)?.trim();
        const level = interaction.options.getInteger("level", false);
        if (!name && typeof level !== "number") {
          await interaction.editReply({
            content: "Provide a rank name or level to remove.",
          });
          return;
        }

        const removed = await deleteLevelRole({
          guildId: guild.id,
          name,
          requiredLevel: level ?? undefined,
        });
        await interaction.editReply({
          content: removed
            ? "Removed that rank from the ladder."
            : "No matching rank found.",
        });
        return;
      }

      const existing = await listLevelRoles(guild.id);
      const existingLevels = new Set(existing.map((role) => role.requiredLevel));
      const created: string[] = [];

      for (const rank of DEFAULT_LEVEL_ROLES) {
        if (existingLevels.has(rank.requiredLevel)) {
          continue;
        }

        const { role } = await ensureRankDiscordRole(guild, rank.name);
        await createLevelRole({
          ...guildMeta,
          name: rank.name,
          requiredLevel: rank.requiredLevel,
          discordRoleId: role.id,
        });
        created.push(`${rank.name} (Lv ${rank.requiredLevel})`);
      }

      await interaction.editReply({
        content:
          created.length > 0
            ? `Default ranks ready:\n${created.map((item) => `• ${item}`).join("\n")}`
            : "Default ranks are already configured for every default level.",
      });
    } catch (error) {
      if (error instanceof LevelRoleSetupError) {
        await interaction.editReply({ content: error.message });
        return;
      }

      const constraint = uniqueConstraintMessage(error);
      if (constraint) {
        await interaction.editReply({ content: constraint });
        return;
      }

      throw error;
    }
  },
};
