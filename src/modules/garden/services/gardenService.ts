import type { Guild } from "discord.js";
import {
  deleteGardenInventoryItem,
  deleteGardenPlot,
  getActiveGardenBoost,
  getGardenInventoryItem,
  insertGardenInventoryItem,
  listGardenInventory,
  listGardenPlots,
  upsertGardenBoost,
  upsertGardenPlot,
  type GardenBoostRecord,
  type GardenInventoryRecord,
  type GardenPlotRecord,
} from "../../../db/gardenRepo.js";
import {
  CROPS,
  FERTILIZER_UNLOCK_LEVEL,
  INVENTORY_CAP,
  WATERING_UNLOCK_LEVEL,
  boostFromHarvest,
  canHarvest,
  effectiveElapsedMs,
  fertilizerUnlocked,
  harvestQuality,
  isSeedId,
  plotsForLevel,
  qualityLabel,
  stageFromElapsed,
  stageLabel,
  unlockedCrops,
  wateringUnlocked,
  type CropDefinition,
  type GrowthStage,
  type HarvestQuality,
  type SeedId,
} from "./gardenCatalog.js";

export class GardenServiceError extends Error {}

export interface LivePlot {
  slot: number;
  unlocked: boolean;
  empty: boolean;
  seedId: SeedId | null;
  crop: CropDefinition | null;
  plantedAt: string | null;
  wateredAt: string | null;
  fertilized: boolean;
  stage: GrowthStage | null;
  harvestable: boolean;
  quality: HarvestQuality | null;
}

export interface GardenView {
  level: number;
  unlockedPlots: number;
  plots: LivePlot[];
  inventory: GardenInventoryRecord[];
  boost: GardenBoostRecord | null;
}

function guildMeta(guild: Guild) {
  return {
    guildId: guild.id,
    guildName: guild.name,
    guildIconUrl: guild.iconURL(),
    guildOwnerId: guild.ownerId ?? null,
  };
}

function parseTime(value: string): number {
  return Date.parse(value);
}

export function livePlotFromRecord(
  record: GardenPlotRecord | undefined,
  slot: number,
  unlocked: boolean,
  nowMs = Date.now(),
): LivePlot {
  if (!unlocked) {
    return {
      slot,
      unlocked: false,
      empty: true,
      seedId: null,
      crop: null,
      plantedAt: null,
      wateredAt: null,
      fertilized: false,
      stage: null,
      harvestable: false,
      quality: null,
    };
  }

  if (!record || !isSeedId(record.seedId)) {
    return {
      slot,
      unlocked: true,
      empty: true,
      seedId: null,
      crop: null,
      plantedAt: null,
      wateredAt: null,
      fertilized: false,
      stage: null,
      harvestable: false,
      quality: null,
    };
  }

  const crop = CROPS[record.seedId];
  const elapsed = effectiveElapsedMs({
    plantedAtMs: parseTime(record.plantedAt),
    nowMs,
    wateredAtMs: record.wateredAt ? parseTime(record.wateredAt) : null,
    ripeMs: crop.ripeMs,
  });
  const stage = stageFromElapsed(elapsed, crop);

  return {
    slot,
    unlocked: true,
    empty: false,
    seedId: record.seedId,
    crop,
    plantedAt: record.plantedAt,
    wateredAt: record.wateredAt,
    fertilized: record.fertilized,
    stage,
    harvestable: canHarvest(stage),
    quality: harvestQuality(stage, record.fertilized),
  };
}

export async function loadGardenView(params: {
  guildId: string;
  userId: string;
  level: number;
  now?: Date;
}): Promise<GardenView> {
  const now = params.now ?? new Date();
  const unlockedPlots = plotsForLevel(params.level);
  const [records, inventory, boost] = await Promise.all([
    listGardenPlots(params.guildId, params.userId),
    listGardenInventory(params.guildId, params.userId),
    getActiveGardenBoost(params.guildId, params.userId, now),
  ]);
  const bySlot = new Map(records.map((row) => [row.slot, row]));
  const plots = Array.from({ length: 6 }, (_, slot) =>
    livePlotFromRecord(bySlot.get(slot), slot, slot < unlockedPlots, now.getTime()),
  );

  return {
    level: params.level,
    unlockedPlots,
    plots,
    inventory,
    boost,
  };
}

export async function plantSeed(params: {
  guild: Guild;
  userId: string;
  level: number;
  seedId: string;
  slot?: number;
}): Promise<LivePlot> {
  if (!isSeedId(params.seedId)) {
    throw new GardenServiceError("Unknown seed.");
  }

  const crop = CROPS[params.seedId];
  if (params.level < crop.unlockLevel) {
    throw new GardenServiceError(`${crop.name} unlocks at level ${crop.unlockLevel}.`);
  }

  const view = await loadGardenView({
    guildId: params.guild.id,
    userId: params.userId,
    level: params.level,
  });

  const target =
    params.slot !== undefined
      ? view.plots.find((plot) => plot.slot === params.slot)
      : view.plots.find((plot) => plot.unlocked && plot.empty);

  if (!target) {
    throw new GardenServiceError("No empty plot. Harvest something first.");
  }
  if (!target.unlocked) {
    throw new GardenServiceError("That plot is still locked.");
  }
  if (!target.empty) {
    throw new GardenServiceError("That plot is already planted.");
  }

  const planted = await upsertGardenPlot({
    ...guildMeta(params.guild),
    userId: params.userId,
    slot: target.slot,
    seedId: params.seedId,
    plantedAt: new Date().toISOString(),
    wateredAt: null,
    fertilized: false,
  });

  return livePlotFromRecord(planted, planted.slot, true);
}

export async function waterPlots(params: {
  guild: Guild;
  userId: string;
  level: number;
  slot?: number;
}): Promise<number> {
  if (!wateringUnlocked(params.level)) {
    throw new GardenServiceError(`The watering can unlocks at level ${WATERING_UNLOCK_LEVEL}.`);
  }

  const view = await loadGardenView({
    guildId: params.guild.id,
    userId: params.userId,
    level: params.level,
  });
  const targets = view.plots.filter((plot) => {
    if (params.slot !== undefined && plot.slot !== params.slot) {
      return false;
    }
    return !plot.empty && !plot.wateredAt;
  });

  if (targets.length === 0) {
    throw new GardenServiceError(
      params.slot !== undefined ? "That plot has nothing to water." : "Nothing left to water.",
    );
  }

  const now = new Date().toISOString();
  for (const plot of targets) {
    if (!plot.seedId || !plot.plantedAt) {
      continue;
    }
    await upsertGardenPlot({
      ...guildMeta(params.guild),
      userId: params.userId,
      slot: plot.slot,
      seedId: plot.seedId,
      plantedAt: plot.plantedAt,
      wateredAt: now,
      fertilized: plot.fertilized,
    });
  }

  return targets.length;
}

export async function fertilizePlots(params: {
  guild: Guild;
  userId: string;
  level: number;
  slot?: number;
}): Promise<number> {
  if (!fertilizerUnlocked(params.level)) {
    throw new GardenServiceError(`Fertilizer unlocks at level ${FERTILIZER_UNLOCK_LEVEL}.`);
  }

  const view = await loadGardenView({
    guildId: params.guild.id,
    userId: params.userId,
    level: params.level,
  });
  const targets = view.plots.filter((plot) => {
    if (params.slot !== undefined && plot.slot !== params.slot) {
      return false;
    }
    return !plot.empty && !plot.fertilized;
  });

  if (targets.length === 0) {
    throw new GardenServiceError(
      params.slot !== undefined ? "That plot cannot be fertilized." : "Nothing left to fertilize.",
    );
  }

  for (const plot of targets) {
    if (!plot.seedId || !plot.plantedAt) {
      continue;
    }
    await upsertGardenPlot({
      ...guildMeta(params.guild),
      userId: params.userId,
      slot: plot.slot,
      seedId: plot.seedId,
      plantedAt: plot.plantedAt,
      wateredAt: plot.wateredAt,
      fertilized: true,
    });
  }

  return targets.length;
}

export async function harvestPlots(params: {
  guild: Guild;
  userId: string;
  level: number;
  slot?: number;
}): Promise<GardenInventoryRecord[]> {
  const view = await loadGardenView({
    guildId: params.guild.id,
    userId: params.userId,
    level: params.level,
  });
  const targets = view.plots.filter((plot) => {
    if (params.slot !== undefined && plot.slot !== params.slot) {
      return false;
    }
    return plot.harvestable && plot.quality && plot.seedId;
  });

  if (targets.length === 0) {
    throw new GardenServiceError(
      params.slot !== undefined
        ? "That plot is not ready to harvest yet."
        : "Nothing is ready to harvest yet.",
    );
  }

  const room = INVENTORY_CAP - view.inventory.length;
  if (room <= 0) {
    throw new GardenServiceError(`Your harvest bag is full (${INVENTORY_CAP}). Use something first.`);
  }
  if (targets.length > room) {
    throw new GardenServiceError(
      `Bag only has room for ${room} more item${room === 1 ? "" : "s"}. Use some produce first.`,
    );
  }

  const harvested: GardenInventoryRecord[] = [];
  for (const plot of targets) {
    if (!plot.seedId || !plot.quality) {
      continue;
    }
    const item = await insertGardenInventoryItem({
      ...guildMeta(params.guild),
      userId: params.userId,
      seedId: plot.seedId,
      quality: plot.quality,
      fertilized: plot.fertilized,
    });
    await deleteGardenPlot(params.guild.id, params.userId, plot.slot);
    harvested.push(item);
  }

  return harvested;
}

export async function useHarvest(params: {
  guild: Guild;
  userId: string;
  itemId: string;
  replace?: boolean;
  now?: Date;
}): Promise<GardenBoostRecord> {
  const now = params.now ?? new Date();
  const item = await getGardenInventoryItem(params.guild.id, params.userId, params.itemId);
  if (!item || !isSeedId(item.seedId)) {
    throw new GardenServiceError("That harvest is gone.");
  }

  const quality = item.quality as HarvestQuality;
  if (quality !== "wilted" && quality !== "young" && quality !== "mature") {
    throw new GardenServiceError("That harvest is invalid.");
  }

  const existing = await getActiveGardenBoost(params.guild.id, params.userId, now);
  if (existing && !params.replace) {
    throw new GardenServiceError("BOOST_ACTIVE");
  }

  const crop = CROPS[item.seedId];
  const boost = boostFromHarvest({ crop, quality, fertilized: item.fertilized });
  const sourceLabel = `${qualityLabel(quality)} ${crop.name}`;
  const saved = await upsertGardenBoost({
    ...guildMeta(params.guild),
    userId: params.userId,
    multiplier: boost.multiplier,
    expiresAt: new Date(now.getTime() + boost.durationMs).toISOString(),
    sourceLabel,
  });
  await deleteGardenInventoryItem(item.id);
  return saved;
}

export function describePlot(plot: LivePlot): string {
  const n = plot.slot + 1;
  if (!plot.unlocked) {
    return `Plot ${n}: locked`;
  }
  if (plot.empty || !plot.crop || !plot.stage) {
    return `Plot ${n}: empty`;
  }
  const flags = [
    plot.wateredAt ? "watered" : null,
    plot.fertilized ? "fertilized" : null,
    plot.harvestable ? "ready" : null,
  ]
    .filter(Boolean)
    .join(", ");
  return `Plot ${n}: ${plot.crop.name} (${stageLabel(plot.stage)}${flags ? `, ${flags}` : ""})`;
}

export function describeInventoryItem(item: GardenInventoryRecord): string {
  const crop = isSeedId(item.seedId) ? CROPS[item.seedId] : null;
  const name = crop?.name ?? item.seedId;
  const extra = item.fertilized ? ", fertilized" : "";
  return `${qualityLabel(item.quality as HarvestQuality)} ${name}${extra}`;
}

export function slotFromOption(value: number | null): number | undefined {
  if (value === null) {
    return undefined;
  }
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    throw new GardenServiceError("Slot must be 1–6.");
  }
  return value - 1;
}
