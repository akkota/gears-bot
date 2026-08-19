import { MessageFlags, type MessageComponentInteraction } from "discord.js";
import { getXpSnapshot, loadLadder } from "../../xp/services/xpService.js";
import { isSeedId } from "./gardenCatalog.js";
import { presentGarden } from "./gardenPresent.js";
import {
  GardenServiceError,
  describeInventoryItem,
  fertilizePlots,
  harvestPlots,
  loadGardenView,
  plantSeed,
  useHarvest,
  waterPlots,
} from "./gardenService.js";
import {
  buildBackRow,
  buildInventoryEmbed,
  buildInventorySelect,
  buildPlantSeedSelect,
  buildReplaceBoostRow,
  parseGardenCustomId,
} from "./gardenUi.js";

async function redrawGarden(interaction: MessageComponentInteraction): Promise<void> {
  if (!interaction.inGuild() || !interaction.guild) {
    return;
  }

  const snapshot = await getXpSnapshot(interaction.guild.id, interaction.user.id);
  const ranks = await loadLadder(interaction.guild.id);
  const presented = await presentGarden({
    guildId: interaction.guild.id,
    ownerId: interaction.user.id,
    displayName: interaction.user.displayName,
    xp: snapshot.xp,
    level: snapshot.level,
    ranks,
    self: true,
  });

  await interaction.editReply({
    content: null,
    embeds: presented.embeds,
    files: presented.files,
    components: presented.components,
  });
}

export async function handleGardenComponent(interaction: MessageComponentInteraction): Promise<void> {
  const parsed = parseGardenCustomId(interaction.customId);
  if (!parsed) {
    return;
  }

  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.reply({
      content: "This can only be used in a server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (interaction.user.id !== parsed.ownerId) {
    await interaction.reply({
      content: "That's not your garden.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferUpdate();
  const guild = interaction.guild;
  const userId = interaction.user.id;
  const snapshot = await getXpSnapshot(guild.id, userId);

  try {
    if (parsed.action === "view") {
      await redrawGarden(interaction);
      return;
    }

    if (parsed.action === "plant") {
      await interaction.editReply({
        components: [buildPlantSeedSelect(userId, snapshot.level), buildBackRow(userId)],
      });
      return;
    }

    if (parsed.action === "plantpick" && interaction.isStringSelectMenu()) {
      const seed = interaction.values[0];
      if (!seed || !isSeedId(seed)) {
        await redrawGarden(interaction);
        return;
      }
      await plantSeed({
        guild,
        userId,
        level: snapshot.level,
        seedId: seed,
      });
      await redrawGarden(interaction);
      return;
    }

    if (parsed.action === "water") {
      await waterPlots({ guild, userId, level: snapshot.level });
      await redrawGarden(interaction);
      return;
    }

    if (parsed.action === "fertilize") {
      await fertilizePlots({ guild, userId, level: snapshot.level });
      await redrawGarden(interaction);
      return;
    }

    if (parsed.action === "harvest") {
      const items = await harvestPlots({ guild, userId, level: snapshot.level });
      await redrawGarden(interaction);
      await interaction.followUp({
        content: `Harvested: ${items.map((item) => describeInventoryItem(item)).join(", ")}.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (parsed.action === "bag") {
      const view = await loadGardenView({
        guildId: guild.id,
        userId,
        level: snapshot.level,
      });
      await interaction.editReply({
        content: null,
        files: [],
        embeds: [buildInventoryEmbed(view)],
        components: [buildInventorySelect(userId, view), buildBackRow(userId)],
      });
      return;
    }

    if (parsed.action === "usepick" && interaction.isStringSelectMenu()) {
      const itemId = interaction.values[0];
      if (!itemId || itemId === "none") {
        return;
      }
      try {
        const boost = await useHarvest({ guild, userId, itemId });
        await redrawGarden(interaction);
        await interaction.followUp({
          content: `Boost on: **${boost.multiplier.toFixed(2)}x** chat XP from ${boost.sourceLabel}.`,
          flags: MessageFlags.Ephemeral,
        });
      } catch (error) {
        if (error instanceof GardenServiceError && error.message === "BOOST_ACTIVE") {
          await interaction.editReply({
            components: [buildReplaceBoostRow(userId, itemId)],
          });
          return;
        }
        throw error;
      }
      return;
    }

    if (parsed.action === "usereplace" && parsed.extra) {
      const boost = await useHarvest({
        guild,
        userId,
        itemId: parsed.extra,
        replace: true,
      });
      await redrawGarden(interaction);
      await interaction.followUp({
        content: `Replaced boost with **${boost.multiplier.toFixed(2)}x** from ${boost.sourceLabel}.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  } catch (error) {
    const message =
      error instanceof GardenServiceError ? error.message : "Something went wrong in the garden.";
    await redrawGarden(interaction).catch(() => undefined);
    await interaction.followUp({ content: message, flags: MessageFlags.Ephemeral }).catch(() => undefined);
  }
}
