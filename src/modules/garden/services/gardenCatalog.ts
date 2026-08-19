export type SeedId =
  | "radish"
  | "lettuce"
  | "marigold"
  | "tomato"
  | "sunflower"
  | "pumpkin";

export type GrowthStage = "seed" | "sprout" | "growing" | "ripe" | "wilt";
export type HarvestQuality = "wilted" | "young" | "mature";

export interface CropDefinition {
  id: SeedId;
  name: string;
  unlockLevel: number;
  sproutMs: number;
  growingMs: number;
  ripeMs: number;
  wiltMs: number;
  peakMultiplier: number;
  boostDurationMs: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const PLOT_UNLOCK_LEVELS = [1, 5, 10, 20, 35, 50] as const;
export const MAX_PLOTS = PLOT_UNLOCK_LEVELS.length;
export const WATERING_UNLOCK_LEVEL = 5;
export const FERTILIZER_UNLOCK_LEVEL = 20;
export const INVENTORY_CAP = 12;
export const WATERING_TIME_CUT = 0.25;

export const CROPS: Record<SeedId, CropDefinition> = {
  radish: {
    id: "radish",
    name: "Radish",
    unlockLevel: 1,
    sproutMs: 8 * MINUTE,
    growingMs: 20 * MINUTE,
    ripeMs: 1 * HOUR,
    wiltMs: 2 * HOUR,
    peakMultiplier: 1.25,
    boostDurationMs: 15 * MINUTE,
  },
  lettuce: {
    id: "lettuce",
    name: "Lettuce",
    unlockLevel: 3,
    sproutMs: 15 * MINUTE,
    growingMs: 45 * MINUTE,
    ripeMs: 2 * HOUR,
    wiltMs: 5 * HOUR,
    peakMultiplier: 1.4,
    boostDurationMs: 20 * MINUTE,
  },
  marigold: {
    id: "marigold",
    name: "Marigold",
    unlockLevel: 8,
    sproutMs: 30 * MINUTE,
    growingMs: 90 * MINUTE,
    ripeMs: 4 * HOUR,
    wiltMs: 10 * HOUR,
    peakMultiplier: 1.6,
    boostDurationMs: 30 * MINUTE,
  },
  tomato: {
    id: "tomato",
    name: "Tomato",
    unlockLevel: 15,
    sproutMs: 1 * HOUR,
    growingMs: 4 * HOUR,
    ripeMs: 8 * HOUR,
    wiltMs: 20 * HOUR,
    peakMultiplier: 1.8,
    boostDurationMs: 45 * MINUTE,
  },
  sunflower: {
    id: "sunflower",
    name: "Sunflower",
    unlockLevel: 25,
    sproutMs: 3 * HOUR,
    growingMs: 8 * HOUR,
    ripeMs: 18 * HOUR,
    wiltMs: 36 * HOUR,
    peakMultiplier: 2,
    boostDurationMs: 60 * MINUTE,
  },
  pumpkin: {
    id: "pumpkin",
    name: "Pumpkin",
    unlockLevel: 40,
    sproutMs: 6 * HOUR,
    growingMs: 18 * HOUR,
    ripeMs: 36 * HOUR,
    wiltMs: 72 * HOUR,
    peakMultiplier: 2.5,
    boostDurationMs: 90 * MINUTE,
  },
};

export const CROP_LIST: CropDefinition[] = Object.values(CROPS);

export const QUALITY_MULTIPLIER: Record<HarvestQuality, number> = {
  wilted: 0.25,
  young: 0.5,
  mature: 1,
};

export const QUALITY_DURATION: Record<HarvestQuality, number> = {
  wilted: 0.5,
  young: 0.75,
  mature: 1,
};

export function isSeedId(value: string): value is SeedId {
  return value in CROPS;
}

export function plotsForLevel(level: number): number {
  return PLOT_UNLOCK_LEVELS.filter((required) => level >= required).length;
}

export function nextPlotUnlock(level: number): { slot: number; level: number } | null {
  const index = PLOT_UNLOCK_LEVELS.findIndex((required) => required > level);
  if (index === -1) {
    return null;
  }
  return { slot: index + 1, level: PLOT_UNLOCK_LEVELS[index] };
}

export function unlockedCrops(level: number): CropDefinition[] {
  return CROP_LIST.filter((crop) => level >= crop.unlockLevel);
}

export function nextCropUnlock(level: number): CropDefinition | null {
  return CROP_LIST.find((crop) => crop.unlockLevel > level) ?? null;
}

export function wateringUnlocked(level: number): boolean {
  return level >= WATERING_UNLOCK_LEVEL;
}

export function fertilizerUnlocked(level: number): boolean {
  return level >= FERTILIZER_UNLOCK_LEVEL;
}

export function effectiveElapsedMs(params: {
  plantedAtMs: number;
  nowMs: number;
  wateredAtMs: number | null;
  ripeMs: number;
}): number {
  const raw = Math.max(0, params.nowMs - params.plantedAtMs);
  if (params.wateredAtMs === null) {
    return raw;
  }

  const elapsedAtWater = Math.max(0, params.wateredAtMs - params.plantedAtMs);
  const remainingToRipe = Math.max(0, params.ripeMs - elapsedAtWater);
  return raw + remainingToRipe * WATERING_TIME_CUT;
}

export function stageFromElapsed(elapsedMs: number, crop: CropDefinition): GrowthStage {
  if (elapsedMs < crop.sproutMs) {
    return "seed";
  }
  if (elapsedMs < crop.growingMs) {
    return "sprout";
  }
  if (elapsedMs < crop.ripeMs) {
    return "growing";
  }
  if (elapsedMs < crop.wiltMs) {
    return "ripe";
  }
  return "wilt";
}

export function canHarvest(stage: GrowthStage): boolean {
  return stage === "growing" || stage === "ripe" || stage === "wilt";
}

export function harvestQuality(stage: GrowthStage, fertilized: boolean): HarvestQuality | null {
  if (!canHarvest(stage)) {
    return null;
  }

  let quality: HarvestQuality =
    stage === "ripe" ? "mature" : stage === "growing" ? "young" : "wilted";

  if (fertilized) {
    if (quality === "wilted") {
      quality = "young";
    } else if (quality === "young") {
      quality = "mature";
    }
  }

  return quality;
}

export function boostFromHarvest(params: {
  crop: CropDefinition;
  quality: HarvestQuality;
  fertilized: boolean;
}): { multiplier: number; durationMs: number } {
  const durationFactor =
    QUALITY_DURATION[params.quality] * (params.fertilized && params.quality === "mature" ? 1.25 : 1);
  return {
    multiplier: roundMultiplier(params.crop.peakMultiplier * QUALITY_MULTIPLIER[params.quality]),
    durationMs: Math.round(params.crop.boostDurationMs * durationFactor),
  };
}

export function roundMultiplier(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatGardenUnlocks(previousLevel: number, level: number): string | null {
  if (level <= previousLevel) {
    return null;
  }

  const parts: string[] = [];
  for (const [index, required] of PLOT_UNLOCK_LEVELS.entries()) {
    if (required > previousLevel && required <= level) {
      parts.push(`Garden plot ${index + 1} unlocked`);
    }
  }
  for (const crop of CROP_LIST) {
    if (crop.unlockLevel > previousLevel && crop.unlockLevel <= level) {
      parts.push(`${crop.name} seeds unlocked`);
    }
  }
  if (WATERING_UNLOCK_LEVEL > previousLevel && WATERING_UNLOCK_LEVEL <= level) {
    parts.push("Watering can unlocked");
  }
  if (FERTILIZER_UNLOCK_LEVEL > previousLevel && FERTILIZER_UNLOCK_LEVEL <= level) {
    parts.push("Fertilizer bag unlocked");
  }

  return parts.length > 0 ? parts.join("\n") : null;
}

export function nextGardenUnlockLabel(level: number): string {
  const candidates: { level: number; label: string }[] = [];
  const plot = nextPlotUnlock(level);
  if (plot) {
    candidates.push({ level: plot.level, label: `plot ${plot.slot}` });
  }
  const crop = nextCropUnlock(level);
  if (crop) {
    candidates.push({ level: crop.unlockLevel, label: `${crop.name} seeds` });
  }
  if (level < WATERING_UNLOCK_LEVEL) {
    candidates.push({ level: WATERING_UNLOCK_LEVEL, label: "watering can" });
  }
  if (level < FERTILIZER_UNLOCK_LEVEL) {
    candidates.push({ level: FERTILIZER_UNLOCK_LEVEL, label: "fertilizer" });
  }
  candidates.sort((left, right) => left.level - right.level);
  const next = candidates[0];
  return next ? `${next.label} at level ${next.level}` : "Garden fully unlocked";
}

export function qualityLabel(quality: HarvestQuality): string {
  if (quality === "mature") {
    return "mature";
  }
  if (quality === "young") {
    return "young";
  }
  return "wilted";
}

export function stageLabel(stage: GrowthStage): string {
  if (stage === "growing") {
    return "young";
  }
  if (stage === "ripe") {
    return "ripe";
  }
  return stage;
}
