import { ChannelType, MessageFlags, SlashCommandBuilder } from "discord.js";
import { channelExistsInGuild } from "../../../shared/discordChecks.js";
import type { SlashCommand } from "../../../shared/command.js";
import { requireOwnerOrConfiguredAdmin } from "../../../shared/permissions.js";
import { loadWelcomeSettings, setBoostConfig, setWelcomeConfig } from "../services/welcomeService.js";

export const welcomeCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Configure join welcome and boost messages.")
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Set the welcome channel and message.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel for join messages.")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
        )
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("Template. Use {user}, {server}, {memberCount}, {boosts}.")
            .setRequired(false)
            .setMaxLength(1800),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("boost")
        .setDescription("Set the boost thank-you channel and message.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel for boost messages.")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
        )
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("Template. Use {user}, {server}, {memberCount}, {boosts}.")
            .setRequired(false)
            .setMaxLength(1800),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("show").setDescription("Show the current welcome and boost config."),
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const permissionContext = await requireOwnerOrConfiguredAdmin(interaction);
    if (!permissionContext) {
      return;
    }

    const guild = permissionContext.guild;
    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === "show") {
      const settings = await loadWelcomeSettings(guild.id);
      if (!settings?.welcomeChannelId && !settings?.boostChannelId) {
        await interaction.editReply({
          content: "No welcome or boost messages configured yet.",
        });
        return;
      }

      const lines = [
        settings.welcomeChannelId
          ? `Welcome: <#${settings.welcomeChannelId}>\n${settings.welcomeMessage ?? "(default)"}`
          : "Welcome: not set",
        settings.boostChannelId
          ? `Boost: <#${settings.boostChannelId}>\n${settings.boostMessage ?? "(default)"}`
          : "Boost: not set",
      ];
      await interaction.editReply({ content: lines.join("\n\n") });
      return;
    }

    const channel = interaction.options.getChannel("channel", true);
    const message = interaction.options.getString("message", false);
    const exists = await channelExistsInGuild(guild, channel.id);
    if (!exists) {
      await interaction.editReply({
        content: "The selected channel no longer exists in this server.",
      });
      return;
    }

    if (subcommand === "set") {
      await setWelcomeConfig(guild, { channelId: channel.id, message });
      await interaction.editReply({
        content: `Welcome messages will be sent in <#${channel.id}>.`,
      });
      return;
    }

    await setBoostConfig(guild, { channelId: channel.id, message });
    await interaction.editReply({
      content: `Boost messages will be sent in <#${channel.id}>.`,
    });
  },
};
