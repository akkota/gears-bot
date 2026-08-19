import { describe, expect, it } from "vitest";
import {
  CROPS,
  FERTILIZER_UNLOCK_LEVEL,
  WATERING_UNLOCK_LEVEL,
  boostFromHarvest,
  canHarvest,
  effectiveElapsedMs,
  fertilizerUnlocked,
  formatGardenUnlocks,
  harvestQuality,
  nextGardenUnlockLabel,
  plotsForLevel,
  stageFromElapsed,
  unlockedCrops,
  wateringUnlocked,
} from "../src/modules/garden/services/gardenCatalog.js";
import { livePlotFromRecord } from "../src/modules/garden/services/gardenService.js";
import {
  cellForSlot,
  drawOrderForSlots,
  fitSpriteToCell,
} from "../src/modules/garden/services/gardenCardLayout.js";

describe("garden unlocks", () => {
  it("starts with one plot and unlocks more by level", () => {
    expect(plotsForLevel(1)).toBe(1);
    expect(plotsForLevel(4)).toBe(1);
    expect(plotsForLevel(5)).toBe(2);
    expect(plotsForLevel(50)).toBe(6);
  });

  it("unlocks seeds and tools at the catalog levels", () => {
    expect(unlockedCrops(1).map((crop) => crop.id)).toEqual(["radish"]);
    expect(unlockedCrops(15).some((crop) => crop.id === "tomato")).toBe(true);
    expect(wateringUnlocked(4)).toBe(false);
    expect(wateringUnlocked(WATERING_UNLOCK_LEVEL)).toBe(true);
    expect(fertilizerUnlocked(FERTILIZER_UNLOCK_LEVEL - 1)).toBe(false);
    expect(fertilizerUnlocked(FERTILIZER_UNLOCK_LEVEL)).toBe(true);
  });

  it("lists garden unlocks when a level threshold is crossed", () => {
    const text = formatGardenUnlocks(4, 5);
    expect(text).toContain("Garden plot 2 unlocked");
    expect(text).toContain("Watering can unlocked");
    expect(formatGardenUnlocks(5, 5)).toBeNull();
    expect(nextGardenUnlockLabel(1)).toContain("level 3");
  });
});

describe("growth stages", () => {
  const crop = CROPS.radish;

  it("cannot harvest seed or sprout", () => {
    expect(stageFromElapsed(0, crop)).toBe("seed");
    expect(stageFromElapsed(crop.sproutMs, crop)).toBe("sprout");
    expect(canHarvest("seed")).toBe(false);
    expect(canHarvest("sprout")).toBe(false);
    expect(canHarvest("growing")).toBe(true);
    expect(canHarvest("ripe")).toBe(true);
    expect(canHarvest("wilt")).toBe(true);
  });

  it("scales harvest quality with wait time", () => {
    expect(harvestQuality("growing", false)).toBe("young");
    expect(harvestQuality("ripe", false)).toBe("mature");
    expect(harvestQuality("wilt", false)).toBe("wilted");
    expect(harvestQuality("growing", true)).toBe("mature");
    expect(harvestQuality("wilt", true)).toBe("young");
    expect(harvestQuality("seed", false)).toBeNull();
  });

  it("makes longer waits a bigger XP multiplier", () => {
    const young = boostFromHarvest({ crop, quality: "young", fertilized: false });
    const mature = boostFromHarvest({ crop, quality: "mature", fertilized: false });
    const wilted = boostFromHarvest({ crop, quality: "wilted", fertilized: false });
    expect(mature.multiplier).toBeGreaterThan(young.multiplier);
    expect(young.multiplier).toBeGreaterThan(wilted.multiplier);
    expect(mature.multiplier).toBe(crop.peakMultiplier);
    expect(mature.durationMs).toBeGreaterThan(young.durationMs);
  });

  it("cuts remaining time to ripe by 25% when watered", () => {
    const planted = 1_000_000;
    const watered = planted + crop.ripeMs / 2;
    const now = watered;
    const boosted = effectiveElapsedMs({
      plantedAtMs: planted,
      nowMs: now,
      wateredAtMs: watered,
      ripeMs: crop.ripeMs,
    });
    const plain = effectiveElapsedMs({
      plantedAtMs: planted,
      nowMs: now,
      wateredAtMs: null,
      ripeMs: crop.ripeMs,
    });
    expect(boosted).toBe(plain + (crop.ripeMs / 2) * 0.25);
  });
});

describe("live plots", () => {
  it("treats missing records as empty unlocked plots", () => {
    const plot = livePlotFromRecord(undefined, 0, true);
    expect(plot.empty).toBe(true);
    expect(plot.unlocked).toBe(true);
    expect(plot.harvestable).toBe(false);
  });

  it("marks a ripe radish harvestable", () => {
    const plantedAt = "2026-08-18T00:00:00.000Z";
    const now = Date.parse("2026-08-18T01:30:00.000Z");
    const plot = livePlotFromRecord(
      {
        guildId: "g",
        userId: "u",
        slot: 0,
        seedId: "radish",
        plantedAt,
        wateredAt: null,
        fertilized: false,
      },
      0,
      true,
      now,
    );
    expect(plot.stage).toBe("ripe");
    expect(plot.harvestable).toBe(true);
    expect(plot.quality).toBe("mature");
  });
});

describe("garden card layout", () => {
  it("maps six slots onto the front two center rows", () => {
    const front = cellForSlot(0);
    const mid = cellForSlot(3);
    expect(front).not.toBeNull();
    expect(mid).not.toBeNull();
    expect(front!.y).toBeGreaterThan(mid!.y);
    expect(cellForSlot(1)!.x).toBeGreaterThan(cellForSlot(0)!.x);
    expect(drawOrderForSlots([0, 3, 1])).toEqual([3, 0, 1]);
  });

  it("scales a padded seed to fill the cell, not the empty canvas", () => {
    const cell = cellForSlot(0)!;
    const dest = fitSpriteToCell(117, 79, cell);
    expect(dest.dw).toBeGreaterThan(cell.w * 0.85);
    expect(dest.dw).toBeLessThanOrEqual(cell.w * 1.25);
    expect(dest.dh).toBeLessThanOrEqual(cell.h * 1.45);
    expect(dest.dx).toBeGreaterThanOrEqual(cell.x - 8);
    expect(dest.dx + dest.dw).toBeLessThanOrEqual(cell.x + cell.w + 8);
  });

  it("lets tall plants grow upward from the cell floor", () => {
    const cell = cellForSlot(1)!;
    const dest = fitSpriteToCell(144, 238, cell);
    expect(dest.dh).toBeGreaterThan(cell.h);
    expect(dest.dy + dest.dh).toBeGreaterThan(cell.y + cell.h * 0.7);
    expect(dest.dy).toBeLessThan(cell.y);
  });
});
