import {
  ChannelType,
  MessageFlags,
  SlashCommandBuilder,
  type GuildTextBasedChannel,
} from "discord.js";
import type { SlashCommand } from "../../../shared/command.js";
import { requireOwnerOrConfiguredAdmin } from "../../../shared/permissions.js";
import { createGuildEmbed, editGuildEmbed, EmbedServiceError } from "../services/embedService.js";

export const embedCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Create or edit a bot-authored embed.")
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Post a new embed.")
        .addStringOption((option) =>
          option.setName("title").setDescription("Embed title.").setRequired(false).setMaxLength(256),
        )
        .addStringOption((option) =>
          option
            .setName("description")
            .setDescription("Embed description.")
            .setRequired(false)
            .setMaxLength(4000),
        )
        .addStringOption((option) =>
          option
            .setName("color")
            .setDescription("Hex color like #7c3aed.")
            .setRequired(false)
            .setMaxLength(7),
        )
        .addStringOption((option) =>
          option.setName("image").setDescription("Image URL.").setRequired(false).setMaxLength(500),
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel to post in. Defaults to this channel.")
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("edit")
        .setDescription("Edit an embed created with /embed create.")
        .addStringOption((option) =>
          option
            .setName("message_id")
            .setDescription("Message id or Discord message link.")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("title").setDescription("New title.").setRequired(false).setMaxLength(256),
        )
        .addStringOption((option) =>
          option
            .setName("description")
            .setDescription("New description.")
            .setRequired(false)
            .setMaxLength(4000),
        )
        .addStringOption((option) =>
          option
            .setName("color")
            .setDescription("New hex color like #7c3aed.")
            .setRequired(false)
            .setMaxLength(7),
        )
        .addStringOption((option) =>
          option.setName("image").setDescription("New image URL.").setRequired(false).setMaxLength(500),
        ),
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const permissionContext = await requireOwnerOrConfiguredAdmin(interaction);
    if (!permissionContext) {
      return;
    }

    const guild = permissionContext.guild;
    const subcommand = interaction.options.getSubcommand(true);

    try {
      if (subcommand === "create") {
        const selected = interaction.options.getChannel("channel", false);
        const channelId = selected?.id ?? interaction.channelId;
        const fetched = await guild.channels.fetch(channelId).catch(() => null);
        if (!fetched || !fetched.isTextBased() || !("send" in fetched)) {
          await interaction.editReply({
            content: "Use this in a server text channel, or pick a channel.",
          });
          return;
        }

        const created = await createGuildEmbed({
          guild,
          channel: fetched as GuildTextBasedChannel,
          createdBy: interaction.user.id,
          title: interaction.options.getString("title", false),
          description: interaction.options.getString("description", false),
          colorInput: interaction.options.getString("color", false),
          imageUrl: interaction.options.getString("image", false),
        });
        await interaction.editReply({
          content: `Posted embed in <#${created.channelId}>. Message id: \`${created.messageId}\``,
        });
        return;
      }

      const updated = await editGuildEmbed({
        guild,
        messageInput: interaction.options.getString("message_id", true),
        title: interaction.options.getString("title", false),
        description: interaction.options.getString("description", false),
        colorInput: interaction.options.getString("color", false),
        imageUrl: interaction.options.getString("image", false),
      });
      await interaction.editReply({
        content: `Updated embed \`${updated.messageId}\`.`,
      });
    } catch (error) {
      if (error instanceof EmbedServiceError) {
        await interaction.editReply({ content: error.message });
        return;
      }
      throw error;
    }
  },
};
