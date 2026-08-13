import { EmbedBuilder } from "discord.js";
import { levelFromXp, xpForLevel } from "./levelMath.js";
import {
  getCurrentRank,
  getNextRank,
  rankStatuses,
  type RankDefinition,
} from "./rankLadder.js";

function progressBar(ratio: number, width = 10): string {
  const clamped = Math.min(1, Math.max(0, ratio));
  const filled = Math.round(clamped * width);
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
}

function statusLabel(status: "unlocked" | "current" | "locked"): string {
  if (status === "current") {
    return "Current";
  }
  if (status === "unlocked") {
    return "Unlocked";
  }
  return "Locked";
}

export function buildRankEmbed(params: {
  displayName: string;
  avatarUrl: string;
  xp: number;
  ranks: RankDefinition[];
}): EmbedBuilder {
  const level = levelFromXp(params.xp);
  const current = getCurrentRank(level, params.ranks);
  const next = getNextRank(level, params.ranks);
  const statuses = rankStatuses(level, params.ranks);
  const titleLine = current
    ? `Level ${level} · ${current.name}`
    : `Level ${level}`;

  const embed = new EmbedBuilder()
    .setColor(0x7c3aed)
    .setTitle(titleLine)
    .setThumbnail(params.avatarUrl)
    .setDescription(`${params.displayName}'s rank`)
    .addFields({
      name: "XP",
      value: `${params.xp.toLocaleString()} XP`,
      inline: true,
    });

  if (next) {
    const startXp = current ? xpForLevel(current.requiredLevel) : 0;
    const targetXp = xpForLevel(next.requiredLevel);
    const span = Math.max(1, targetXp - startXp);
    const into = Math.max(0, params.xp - startXp);
    const levelsToGo = Math.max(0, next.requiredLevel - level);
    embed.addFields({
      name: "Next role",
      value: `${progressBar(into / span)} ${next.name} at level ${next.requiredLevel} — ${levelsToGo} level${
        levelsToGo === 1 ? "" : "s"
      } to go`,
    });
  } else if (current) {
    embed.addFields({
      name: "Next role",
      value: "Highest role reached",
    });
  } else {
    embed.addFields({
      name: "Next role",
      value: "No rank ladder configured yet.",
    });
  }

  const progression =
    statuses.length === 0
      ? "None"
      : statuses
          .map(
            (rank) =>
              `• **${rank.name}** (Lv ${rank.requiredLevel}) — ${statusLabel(rank.status)}`,
          )
          .join("\n");

  embed.addFields({
    name: "Progression",
    value: progression.slice(0, 1024),
  });

  return embed;
}
