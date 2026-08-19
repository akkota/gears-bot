import { existsSync } from "node:fs";
import path from "node:path";
import { createCanvas, loadImage, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import type { GardenView, LivePlot } from "./gardenService.js";
import { fertilizerUnlocked, wateringUnlocked, type GrowthStage } from "./gardenCatalog.js";
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  cellForSlot,
  drawOrderForSlots,
  fitSpriteToCell,
} from "./gardenCardLayout.js";

interface LoadedSprite {
  image: Image;
  minX: number;
  minY: number;
  w: number;
  h: number;
}

const imageCache = new Map<string, LoadedSprite | null>();

function assetsDir(): string {
  return path.join(process.cwd(), "assets", "garden");
}

function contentBox(image: Image): { minX: number; minY: number; w: number; h: number } {
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  const { data } = ctx.getImageData(0, 0, image.width, image.height);
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const alpha = data[(y * image.width + x) * 4 + 3] ?? 0;
      if (alpha < 80) {
        continue;
      }
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) {
    return { minX: 0, minY: 0, w: image.width, h: image.height };
  }
  return { minX, minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

async function loadAsset(name: string): Promise<LoadedSprite | null> {
  const cached = imageCache.get(name);
  if (cached !== undefined) {
    return cached;
  }

  const filePath = path.join(assetsDir(), name);
  if (!existsSync(filePath)) {
    imageCache.set(name, null);
    return null;
  }

  try {
    const image = await loadImage(filePath);
    const box = contentBox(image);
    const sprite = { image, ...box };
    imageCache.set(name, sprite);
    return sprite;
  } catch {
    imageCache.set(name, null);
    return null;
  }
}

function cropFile(seedId: string, stage: GrowthStage): string {
  return `${seedId}_${stage}.png`;
}

function roundRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawHud(
  ctx: SKRSContext2D,
  params: {
    displayName: string;
    level: number;
    rankName: string | null;
    xpLabel: string;
    nextUnlock: string;
    boostLabel: string | null;
    watering: boolean;
    fertilizer: boolean;
  },
): void {
  ctx.fillStyle = "rgba(12, 28, 18, 0.72)";
  roundRect(ctx, 24, 16, 912, 92, 16);
  ctx.fill();

  ctx.fillStyle = "#f4efe4";
  ctx.font = "600 28px sans-serif";
  ctx.fillText(params.displayName, 44, 52);

  ctx.font = "20px sans-serif";
  ctx.fillStyle = "#c5e0c8";
  const rank = params.rankName ? `Level ${params.level} · ${params.rankName}` : `Level ${params.level}`;
  ctx.fillText(`${rank}   ${params.xpLabel}`, 44, 82);

  ctx.font = "16px sans-serif";
  ctx.fillStyle = "#e8d9a8";
  ctx.fillText(params.nextUnlock, 520, 52);
  if (params.boostLabel) {
    ctx.fillStyle = "#9ee7a8";
    ctx.fillText(params.boostLabel, 520, 78);
  }

  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#d7c9a3";
  const tools = [
    params.watering ? "Watering can" : null,
    params.fertilizer ? "Fertilizer" : null,
  ].filter(Boolean);
  if (tools.length > 0) {
    ctx.fillText(tools.join(" · "), 44, 98);
  }
}

export async function renderGardenCard(params: {
  view: GardenView;
  displayName: string;
  rankName: string | null;
  xpLabel: string;
  nextUnlock: string;
}): Promise<Buffer | null> {
  const background = await loadAsset("garden_bg.png");
  if (!background) {
    return null;
  }

  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(background.image, 0, 0, CARD_WIDTH, CARD_HEIGHT);

  const planted = params.view.plots.filter(
    (plot) => plot.unlocked && !plot.empty && plot.seedId && plot.stage,
  );
  const order = drawOrderForSlots(planted.map((plot) => plot.slot));
  const bySlot = new Map(planted.map((plot) => [plot.slot, plot]));

  for (const slot of order) {
    const plot = bySlot.get(slot);
    const cell = cellForSlot(slot);
    if (!plot?.seedId || !plot.stage || !cell) {
      continue;
    }

    const sprite = await loadAsset(cropFile(plot.seedId, plot.stage));
    if (!sprite) {
      continue;
    }

    const dest = fitSpriteToCell(sprite.w, sprite.h, cell);
    ctx.drawImage(
      sprite.image,
      sprite.minX,
      sprite.minY,
      sprite.w,
      sprite.h,
      dest.dx,
      dest.dy,
      dest.dw,
      dest.dh,
    );
  }

  const boost = params.view.boost;
  drawHud(ctx, {
    displayName: params.displayName,
    level: params.view.level,
    rankName: params.rankName,
    xpLabel: params.xpLabel,
    nextUnlock: `Next: ${params.nextUnlock}`,
    boostLabel: boost
      ? `Boost ${boost.multiplier.toFixed(2)}x · ${boost.sourceLabel}`
      : null,
    watering: wateringUnlocked(params.view.level),
    fertilizer: fertilizerUnlocked(params.view.level),
  });

  return canvas.toBuffer("image/png");
}

export function plotStatusLines(plots: LivePlot[]): string {
  return plots
    .filter((plot) => plot.unlocked)
    .map((plot) => {
      const n = plot.slot + 1;
      if (plot.empty || !plot.crop || !plot.stage) {
        return `• Plot ${n}: empty`;
      }
      const ready = plot.harvestable ? " — ready" : "";
      return `• Plot ${n}: ${plot.crop.name} (${plot.stage}${ready})`;
    })
    .join("\n");
}
