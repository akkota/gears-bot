import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../../shared/command.js";
import { CROPS, CROP_LIST, isSeedId } from "../services/gardenCatalog.js";
import { presentGarden } from "../services/gardenPresent.js";
import {
  GardenServiceError,
  describeInventoryItem,
  fertilizePlots,
  harvestPlots,
  loadGardenView,
  plantSeed,
  slotFromOption,
  waterPlots,
} from "../services/gardenService.js";
import { getXpSnapshot, loadLadder } from "../../xp/services/xpService.js";
import { buildBackRow, buildInventoryEmbed, buildInventorySelect } from "../services/gardenUi.js";

const seedChoices = CROP_LIST.map((crop) => ({ name: crop.name, value: crop.id }));

export const gardenCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("garden")
    .setDescription("Tend your XP garden: plant, water, harvest, and use produce for chat XP boosts.")
    .addSubcommand((sub) => sub.setName("view").setDescription("Show your garden."))
    .addSubcommand((sub) =>
      sub
        .setName("plant")
        .setDescription("Plant a seed in the first empty plot.")
        .addStringOption((option) =>
          option
            .setName("seed")
            .setDescription("Crop to plant.")
            .setRequired(true)
            .addChoices(...seedChoices),
        )
        .addIntegerOption((option) =>
          option
            .setName("slot")
            .setDescription("Plot 1–6. Defaults to the first empty plot.")
            .setMinValue(1)
            .setMaxValue(6),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("water")
        .setDescription("Water planted plots (once each). Unlocks at level 5.")
        .addIntegerOption((option) =>
          option
            .setName("slot")
            .setDescription("Plot 1–6. Defaults to every unwatered plot.")
            .setMinValue(1)
            .setMaxValue(6),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("fertilize")
        .setDescription("Fertilize planted plots (once each). Unlocks at level 20.")
        .addIntegerOption((option) =>
          option
            .setName("slot")
            .setDescription("Plot 1–6. Defaults to every unfertilized plot.")
            .setMinValue(1)
            .setMaxValue(6),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("harvest")
        .setDescription("Harvest ready plants into your bag.")
        .addIntegerOption((option) =>
          option
            .setName("slot")
            .setDescription("Plot 1–6. Defaults to every ready plot.")
            .setMinValue(1)
            .setMaxValue(6),
        ),
    )
    .addSubcommand((sub) => sub.setName("inventory").setDescription("Open your harvest bag.")),
  async execute(interaction) {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();
    const guild = interaction.guild;
    const userId = interaction.user.id;
    const snapshot = await getXpSnapshot(guild.id, userId);
    const subcommand = interaction.options.getSubcommand(true);
    let notice: string | null = null;

    try {
      if (subcommand === "plant") {
        const seed = interaction.options.getString("seed", true);
        if (!isSeedId(seed)) {
          await interaction.editReply({ content: "Unknown seed." });
          return;
        }
        const plot = await plantSeed({
          guild,
          userId,
          level: snapshot.level,
          seedId: seed,
          slot: slotFromOption(interaction.options.getInteger("slot")),
        });
        notice = `Planted ${CROPS[seed].name} in plot ${plot.slot + 1}.`;
      } else if (subcommand === "water") {
        const count = await waterPlots({
          guild,
          userId,
          level: snapshot.level,
          slot: slotFromOption(interaction.options.getInteger("slot")),
        });
        notice = `Watered ${count} plot${count === 1 ? "" : "s"}.`;
      } else if (subcommand === "fertilize") {
        const count = await fertilizePlots({
          guild,
          userId,
          level: snapshot.level,
          slot: slotFromOption(interaction.options.getInteger("slot")),
        });
        notice = `Fertilized ${count} plot${count === 1 ? "" : "s"}.`;
      } else if (subcommand === "harvest") {
        const items = await harvestPlots({
          guild,
          userId,
          level: snapshot.level,
          slot: slotFromOption(interaction.options.getInteger("slot")),
        });
        notice = `Harvested ${items.length}: ${items.map((item) => describeInventoryItem(item)).join(", ")}.`;
      } else if (subcommand === "inventory") {
        const view = await loadGardenView({
          guildId: guild.id,
          userId,
          level: snapshot.level,
        });
        await interaction.editReply({
          embeds: [buildInventoryEmbed(view)],
          components: [buildInventorySelect(userId, view), buildBackRow(userId)],
        });
        return;
      }

      const ranks = await loadLadder(guild.id);
      const presented = await presentGarden({
        guildId: guild.id,
        ownerId: userId,
        displayName: interaction.user.displayName,
        xp: snapshot.xp,
        level: snapshot.level,
        ranks,
        self: true,
      });
      await interaction.editReply({
        content: notice,
        embeds: presented.embeds,
        files: presented.files,
        components: presented.components,
      });
    } catch (error) {
      if (error instanceof GardenServiceError) {
        await interaction.editReply({ content: error.message });
        return;
      }
      throw error;
    }
  },
};
