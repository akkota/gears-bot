import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import {
  CROPS,
  INVENTORY_CAP,
  fertilizerUnlocked,
  isSeedId,
  qualityLabel,
  unlockedCrops,
  wateringUnlocked,
} from "./gardenCatalog.js";
import { describeInventoryItem, describePlot, type GardenView } from "./gardenService.js";

export const GARDEN_PREFIX = "garden:";

export function parseGardenCustomId(
  customId: string,
): { action: string; ownerId: string; extra: string | null } | null {
  if (!customId.startsWith(GARDEN_PREFIX)) {
    return null;
  }
  const parts = customId.slice(GARDEN_PREFIX.length).split(":");
  const [action, ownerId, ...rest] = parts;
  if (!action || !ownerId) {
    return null;
  }
  return { action, ownerId, extra: rest.length > 0 ? rest.join(":") : null };
}

export function gardenCustomId(action: string, ownerId: string, extra?: string): string {
  return extra ? `${GARDEN_PREFIX}${action}:${ownerId}:${extra}` : `${GARDEN_PREFIX}${action}:${ownerId}`;
}

export function buildGardenEmbed(params: {
  displayName: string;
  rankName: string | null;
  xp: number;
  view: GardenView;
  nextUnlock: string;
  imageName?: string;
}): EmbedBuilder {
  const rank = params.rankName
    ? `Level ${params.view.level} · ${params.rankName}`
    : `Level ${params.view.level}`;
  const boost = params.view.boost;
  const embed = new EmbedBuilder()
    .setColor(0x2f6b3c)
    .setTitle(`${params.displayName}'s garden`)
    .setDescription(
      [
        rank,
        `${params.xp.toLocaleString()} XP`,
        boost
          ? `Active boost: **${boost.multiplier.toFixed(2)}x** (${boost.sourceLabel})`
          : "No XP boost active.",
        `Next unlock: ${params.nextUnlock}`,
      ].join("\n"),
    )
    .addFields({
      name: `Plots (${params.view.unlockedPlots}/6)`,
      value: params.view.plots.filter((plot) => plot.unlocked).map(describePlot).join("\n") || "None",
    });

  if (params.imageName) {
    embed.setImage(`attachment://${params.imageName}`);
  }

  return embed;
}

export function buildGardenActionRows(params: {
  ownerId: string;
  view: GardenView;
  self: boolean;
}): ActionRowBuilder<ButtonBuilder>[] {
  if (!params.self) {
    return [];
  }

  const canWater = wateringUnlocked(params.view.level);
  const canFertilize = fertilizerUnlocked(params.view.level);
  const hasEmpty = params.view.plots.some((plot) => plot.unlocked && plot.empty);
  const hasHarvest = params.view.plots.some((plot) => plot.harvestable);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(gardenCustomId("plant", params.ownerId))
      .setLabel("Plant")
      .setStyle(ButtonStyle.Success)
      .setDisabled(!hasEmpty),
    new ButtonBuilder()
      .setCustomId(gardenCustomId("water", params.ownerId))
      .setLabel("Water")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!canWater),
    new ButtonBuilder()
      .setCustomId(gardenCustomId("harvest", params.ownerId))
      .setLabel("Harvest")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!hasHarvest),
    new ButtonBuilder()
      .setCustomId(gardenCustomId("fertilize", params.ownerId))
      .setLabel("Fertilize")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!canFertilize),
    new ButtonBuilder()
      .setCustomId(gardenCustomId("bag", params.ownerId))
      .setLabel(`Bag (${params.view.inventory.length}/${INVENTORY_CAP})`)
      .setStyle(ButtonStyle.Secondary),
  );

  return [row];
}

export function buildPlantSeedSelect(ownerId: string, level: number) {
  const crops = unlockedCrops(level);
  const menu = new StringSelectMenuBuilder()
    .setCustomId(gardenCustomId("plantpick", ownerId))
    .setPlaceholder("Choose a seed")
    .addOptions(
      crops.map((crop) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(crop.name)
          .setDescription(`Unlocks at level ${crop.unlockLevel}`)
          .setValue(crop.id),
      ),
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export function buildInventoryEmbed(view: GardenView): EmbedBuilder {
  const lines =
    view.inventory.length === 0
      ? "Empty. Harvest a ripe plant to fill this bag."
      : view.inventory.map((item, index) => `${index + 1}. ${describeInventoryItem(item)}`).join("\n");

  return new EmbedBuilder()
    .setColor(0x2f6b3c)
    .setTitle("Harvest bag")
    .setDescription(`${lines}\n\nUse an item to start a timed chat-XP boost. Only one boost at a time.`);
}

export function buildInventorySelect(ownerId: string, view: GardenView) {
  const options = view.inventory.slice(0, 25).map((item) => {
    const crop = isSeedId(item.seedId) ? CROPS[item.seedId] : null;
    return new StringSelectMenuOptionBuilder()
      .setLabel(describeInventoryItem(item).slice(0, 100))
      .setDescription(crop ? `${crop.peakMultiplier}x peak if fully mature` : "Harvest")
      .setValue(item.id);
  });

  const menu = new StringSelectMenuBuilder()
    .setCustomId(gardenCustomId("usepick", ownerId))
    .setPlaceholder(options.length === 0 ? "Bag is empty" : "Use a harvest")
    .setDisabled(options.length === 0)
    .addOptions(
      options.length > 0
        ? options
        : [new StringSelectMenuOptionBuilder().setLabel("Empty").setValue("none")],
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export function buildBackRow(ownerId: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(gardenCustomId("view", ownerId))
      .setLabel("Back to garden")
      .setStyle(ButtonStyle.Secondary),
  );
}

export function buildReplaceBoostRow(ownerId: string, itemId: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(gardenCustomId("usereplace", ownerId, itemId))
      .setLabel("Replace current boost")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(gardenCustomId("bag", ownerId))
      .setLabel("Keep current boost")
      .setStyle(ButtonStyle.Secondary),
  );
}

export function qualityName(value: string): string {
  if (value === "mature" || value === "young" || value === "wilted") {
    return qualityLabel(value);
  }
  return value;
}
