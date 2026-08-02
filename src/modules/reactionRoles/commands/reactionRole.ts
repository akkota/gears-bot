import { ChannelType, MessageFlags, Role, SlashCommandBuilder } from "discord.js";
import { requirePermission } from "../../../shared/permissions.js";
import type { SlashCommand } from "../../../shared/command.js";
import { parseMessageId } from "../services/parseMessageId.js";
import {
  addReactionRolePanelOption,
  createReactionRolePanel,
  ReactionRoleSetupError,
} from "../services/reactionRoleService.js";

export const reactionRoleCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("reaction-role")
    .setDescription("Create and configure button-based reaction role panels.")
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Create a new reaction role panel message.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel where the panel should be posted.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("title")
            .setDescription("Panel title shown above buttons.")
            .setRequired(true)
            .setMaxLength(100),
        )
        .addStringOption((option) =>
          option
            .setName("description")
            .setDescription("Optional panel description.")
            .setRequired(false)
            .setMaxLength(300),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("add-option")
        .setDescription("Add a role button option to an existing panel.")
        .addStringOption((option) =>
          option
            .setName("message_id")
            .setDescription(
              "Panel message ID or message link from /reaction-role create.",
            )
            // No setMaxLength: Discord enforces it in the client. A cap of 25
            // blocked snowflakes/links ("Must be 25 characters or fewer").
            .setRequired(true),
        )
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("Role to toggle when button is clicked.")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("label")
            .setDescription("Button label users will click.")
            .setRequired(true)
            .setMaxLength(80),
        )
        .addStringOption((option) =>
          option
            .setName("emoji")
            .setDescription("Optional emoji for the button (for example ✅).")
            .setRequired(false)
            .setMaxLength(50),
        )
        .addStringOption((option) =>
          option
            .setName("description")
            .setDescription("Optional internal description for this option.")
            .setRequired(false)
            .setMaxLength(200),
        ),
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.editReply({
        content: "This command can only be used in a server.",
      });
      return;
    }

    if (!(await requirePermission(interaction, "admin"))) {
      return;
    }

    const subcommand = interaction.options.getSubcommand(true);

    try {
      if (subcommand === "create") {
        const channel = interaction.options.getChannel("channel", true);
        const title = interaction.options.getString("title", true).trim();
        const description = interaction.options.getString("description", false)?.trim() ?? null;

        const panel = await createReactionRolePanel({
          interaction,
          channelId: channel.id,
          title,
          description,
        });

        await interaction.editReply({
          content: `Reaction role panel created in <#${panel.channelId}>. Message ID: \`${panel.messageId}\`. Use /reaction-role add-option with this message ID.`,
        });
        return;
      }

      const messageIdRaw = interaction.options.getString("message_id", true);
      const messageId = parseMessageId(messageIdRaw);
      if (!messageId) {
        await interaction.editReply({
          content:
            "Provide a valid panel message ID or Discord message link. Message IDs are long numbers (17+ digits) — use the ID returned by `/reaction-role create`, or right-click the panel → Copy Message ID / Copy Message Link.",
        });
        return;
      }

      const role = interaction.options.getRole("role", true);
      if (!(role instanceof Role)) {
        await interaction.editReply({
          content: "Could not resolve the selected role.",
        });
        return;
      }

      const label = interaction.options.getString("label", true).trim();
      if (label.length === 0) {
        await interaction.editReply({
          content: "Button label cannot be empty.",
        });
        return;
      }

      const emoji = interaction.options.getString("emoji", false)?.trim() ?? null;
      const description = interaction.options.getString("description", false)?.trim() ?? null;

      await addReactionRolePanelOption({
        interaction,
        messageId,
        role,
        label,
        emoji,
        description,
      });

      await interaction.editReply({
        content: `Added role option <@&${role.id}> to panel message \`${messageId}\`.`,
      });
    } catch (error) {
      if (error instanceof ReactionRoleSetupError) {
        await interaction.editReply({ content: error.message });
        return;
      }

      throw error;
    }
  },
};
