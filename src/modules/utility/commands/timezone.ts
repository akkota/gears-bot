import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { getGuildSettings, upsertGuildSettings } from "../../../db/guildSettingsRepo.js";
import { getUserTimezone, upsertUserTimezone } from "../../../db/userTimezonesRepo.js";
import type { SlashCommand } from "../../../shared/command.js";
import {
  formatEpochInTimezone,
  isValidIanaTimezone,
  parseDateTimeToEpoch,
} from "../../../shared/time.js";
import { requirePermission } from "../../../shared/permissions.js";

function getGuildDefaultTimezoneOrUtc(defaultTimezone: string | null): string {
  return defaultTimezone ?? "UTC";
}

export const timezoneCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("timezone")
    .setDescription("Manage and convert timezones.")
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Set your timezone for this server.")
        .addStringOption((option) =>
          option
            .setName("timezone")
            .setDescription("IANA timezone (for example: America/Los_Angeles).")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("view").setDescription("View your timezone and guild default."),
    )
    .addSubcommand((sub) =>
      sub
        .setName("convert")
        .setDescription("Convert a datetime between timezones.")
        .addStringOption((option) =>
          option
            .setName("datetime")
            .setDescription("Datetime (ISO or YYYY-MM-DD HH:mm[:ss]).")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("from_timezone")
            .setDescription("Source timezone (optional).")
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("to_timezone")
            .setDescription("Target timezone (optional).")
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("guild-default")
        .setDescription("Set this server's default timezone (Admin+).")
        .addStringOption((option) =>
          option
            .setName("timezone")
            .setDescription("IANA timezone (for example: America/Los_Angeles).")
            .setRequired(true),
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

    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === "set") {
      const timezone = interaction.options.getString("timezone", true).trim();
      if (!isValidIanaTimezone(timezone)) {
        await interaction.editReply({
          content:
            "Invalid timezone. Use a valid IANA timezone like `America/Los_Angeles`.",
        });
        return;
      }

      await upsertUserTimezone({
        guildId: interaction.guild.id,
        guildName: interaction.guild.name,
        guildIconUrl: interaction.guild.iconURL(),
        guildOwnerId: interaction.guild.ownerId ?? null,
        userId: interaction.user.id,
        timezone,
      });

      await interaction.editReply({
        content: `Your timezone has been set to \`${timezone}\`.`,
      });
      return;
    }

    if (subcommand === "view") {
      const [userTimezone, guildSettings] = await Promise.all([
        getUserTimezone(interaction.guild.id, interaction.user.id),
        getGuildSettings(interaction.guild.id),
      ]);

      const guildDefault = getGuildDefaultTimezoneOrUtc(
        guildSettings?.defaultTimezone ?? null,
      );

      await interaction.editReply({
        content: [
          `Your timezone: \`${userTimezone?.timezone ?? "Not set"}\``,
          `Guild default timezone: \`${guildDefault}\``,
          `Effective timezone: \`${userTimezone?.timezone ?? guildDefault}\``,
        ].join("\n"),
      });
      return;
    }

    if (subcommand === "guild-default") {
      if (!(await requirePermission(interaction, "admin"))) {
        return;
      }

      const timezone = interaction.options.getString("timezone", true).trim();
      if (!isValidIanaTimezone(timezone)) {
        await interaction.editReply({
          content:
            "Invalid timezone. Use a valid IANA timezone like `America/Los_Angeles`.",
        });
        return;
      }

      await upsertGuildSettings(
        {
          guildId: interaction.guild.id,
          name: interaction.guild.name,
          iconUrl: interaction.guild.iconURL(),
          ownerId: interaction.guild.ownerId ?? null,
        },
        {
          defaultTimezone: timezone,
        },
      );

      await interaction.editReply({
        content: `Guild default timezone set to \`${timezone}\`.`,
      });
      return;
    }

    const datetime = interaction.options.getString("datetime", true);
    const fromTimezoneInput = interaction.options.getString("from_timezone", false)?.trim() ?? null;
    const toTimezoneInput = interaction.options.getString("to_timezone", false)?.trim() ?? null;

    const [userTimezone, guildSettings] = await Promise.all([
      getUserTimezone(interaction.guild.id, interaction.user.id),
      getGuildSettings(interaction.guild.id),
    ]);

    const guildDefault = getGuildDefaultTimezoneOrUtc(
      guildSettings?.defaultTimezone ?? null,
    );

    const effectiveFromTimezone =
      fromTimezoneInput ?? userTimezone?.timezone ?? guildDefault;
    const effectiveToTimezone =
      toTimezoneInput ?? userTimezone?.timezone ?? guildDefault;

    if (!isValidIanaTimezone(effectiveFromTimezone)) {
      await interaction.editReply({
        content: `Invalid source timezone: \`${effectiveFromTimezone}\`.`,
      });
      return;
    }

    if (!isValidIanaTimezone(effectiveToTimezone)) {
      await interaction.editReply({
        content: `Invalid target timezone: \`${effectiveToTimezone}\`.`,
      });
      return;
    }

    const parsed = parseDateTimeToEpoch(datetime, effectiveFromTimezone);
    if (!parsed) {
      await interaction.editReply({
        content:
          "Invalid datetime input. Use ISO or `YYYY-MM-DD HH:mm[:ss]`.",
      });
      return;
    }

    const sourceDisplay = formatEpochInTimezone(
      parsed.epochSeconds,
      effectiveFromTimezone,
    );
    const targetDisplay = formatEpochInTimezone(
      parsed.epochSeconds,
      effectiveToTimezone,
    );

    if (!sourceDisplay || !targetDisplay) {
      await interaction.editReply({
        content: "Failed to format converted times. Check timezone inputs.",
      });
      return;
    }

    await interaction.editReply({
      content: [
        `Source (${effectiveFromTimezone}): ${sourceDisplay}`,
        `Target (${effectiveToTimezone}): ${targetDisplay}`,
        `Discord: <t:${parsed.epochSeconds}:F> (<t:${parsed.epochSeconds}:R>)`,
      ].join("\n"),
    });
  },
};
