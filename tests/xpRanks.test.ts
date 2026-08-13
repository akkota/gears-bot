import { describe, expect, it } from "vitest";
import { levelFromXp, xpForLevel, xpToNextLevel } from "../src/modules/xp/services/levelMath.js";
import {
  DEFAULT_LEVEL_ROLES,
  formatUnlockMessage,
  getCrossedRanks,
  getCurrentRank,
  getNextRank,
  rankStatuses,
  resolveLadder,
} from "../src/modules/xp/services/rankLadder.js";
import { isOnMessageXpCooldown } from "../src/modules/xp/services/xpService.js";
import { buildRankEmbed } from "../src/modules/xp/services/rankUi.js";

describe("level formula", () => {
  it("starts at level 1 with 0 XP", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(xpForLevel(1)).toBe(0);
  });

  it("uses 100 * (L-1)^2 for level thresholds", () => {
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(5)).toBe(1600);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(1599)).toBe(4);
    expect(levelFromXp(1600)).toBe(5);
  });

  it("computes remaining XP to the next level", () => {
    const progress = xpToNextLevel(100);
    expect(progress.level).toBe(2);
    expect(progress.xpNeeded).toBe(xpForLevel(3) - 100);
  });
});

describe("rank ladder", () => {
  it("uses default ranks when none are stored", () => {
    expect(resolveLadder([])).toEqual(DEFAULT_LEVEL_ROLES);
  });

  it("uses a custom ladder when configured", () => {
    const custom = [{ name: "Intern", requiredLevel: 1, discordRoleId: "1" }];
    expect(resolveLadder(custom)).toEqual(custom);
  });

  it("selects the highest qualifying rank", () => {
    expect(getCurrentRank(1, DEFAULT_LEVEL_ROLES)?.name).toBe("Beginner");
    expect(getCurrentRank(12, DEFAULT_LEVEL_ROLES)?.name).toBe("Skilled");
    expect(getCurrentRank(50, DEFAULT_LEVEL_ROLES)?.name).toBe("Master");
    expect(getCurrentRank(1, [{ name: "Rising", requiredLevel: 5 }])).toBeNull();
  });

  it("returns the next rank or null at the top", () => {
    expect(getNextRank(4, DEFAULT_LEVEL_ROLES)?.name).toBe("Rising");
    expect(getNextRank(50, DEFAULT_LEVEL_ROLES)).toBeNull();
  });

  it("reports every rank crossed when skipping levels", () => {
    const crossed = getCrossedRanks(1, 25, DEFAULT_LEVEL_ROLES);
    expect(crossed.map((rank) => rank.name)).toEqual(["Rising", "Skilled", "Advanced"]);
    expect(formatUnlockMessage(crossed)).toContain("Advanced");
    expect(formatUnlockMessage(crossed)).toContain("Rising");
    expect(formatUnlockMessage([])).toBeNull();
  });

  it("marks ranks unlocked, current, or locked", () => {
    const statuses = rankStatuses(12, DEFAULT_LEVEL_ROLES);
    expect(statuses.find((rank) => rank.name === "Beginner")?.status).toBe("unlocked");
    expect(statuses.find((rank) => rank.name === "Skilled")?.status).toBe("current");
    expect(statuses.find((rank) => rank.name === "Master")?.status).toBe("locked");
  });
});

describe("message XP cooldown", () => {
  it("blocks another award within 60 seconds", () => {
    const now = Date.parse("2026-08-13T00:01:00.000Z");
    expect(
      isOnMessageXpCooldown(
        {
          guildId: "g",
          userId: "u",
          xp: 15,
          lastMessageXpAt: "2026-08-13T00:00:30.000Z",
        },
        now,
      ),
    ).toBe(true);
    expect(
      isOnMessageXpCooldown(
        {
          guildId: "g",
          userId: "u",
          xp: 15,
          lastMessageXpAt: "2026-08-13T00:00:00.000Z",
        },
        now,
      ),
    ).toBe(false);
  });
});

describe("rank embed", () => {
  it("shows current role beside level and next-role progress", () => {
    const embed = buildRankEmbed({
      displayName: "Ada",
      avatarUrl: "https://example.com/a.png",
      xp: xpForLevel(12),
      ranks: DEFAULT_LEVEL_ROLES,
    });
    const json = embed.toJSON();
    expect(json.title).toContain("Level 12");
    expect(json.title).toContain("Skilled");
    expect(json.fields?.some((field) => field.name === "Next role" && field.value.includes("Advanced"))).toBe(
      true,
    );
    expect(json.fields?.some((field) => field.value.includes("Current"))).toBe(true);
    expect(json.fields?.some((field) => field.value.includes("Locked"))).toBe(true);
  });

  it("shows max rank when the highest role is reached", () => {
    const embed = buildRankEmbed({
      displayName: "Ada",
      avatarUrl: "https://example.com/a.png",
      xp: xpForLevel(50),
      ranks: DEFAULT_LEVEL_ROLES,
    });
    const json = embed.toJSON();
    expect(json.title).toContain("Master");
    expect(json.fields?.some((field) => field.value === "Highest role reached")).toBe(true);
  });
});
