import { describe, expect, it } from "vitest";
import {
  findMatchingAutoresponse,
  isAutorespondOnCooldown,
  markAutorespondFired,
} from "../src/modules/server/services/autorespondService.js";
import { parseEmbedColor } from "../src/modules/server/services/embedService.js";
import {
  formatInterval,
  parseRepeatInterval,
  RepeatServiceError,
} from "../src/modules/server/services/repeatService.js";
import { renderWelcomeTemplate } from "../src/modules/server/services/welcomeTemplates.js";

describe("welcome templates", () => {
  it("replaces user, server, memberCount, and boosts", () => {
    const rendered = renderWelcomeTemplate("Hi {user} — welcome to {server} ({memberCount}, {boosts} boosts)", {
      userMention: "<@1>",
      serverName: "ESW",
      memberCount: 42,
      boostCount: 3,
    });
    expect(rendered).toBe("Hi <@1> — welcome to ESW (42, 3 boosts)");
  });
});

describe("repeat intervals", () => {
  it("parses 10m, 1h, and 1d", () => {
    expect(parseRepeatInterval("10m")).toEqual({ intervalMs: 600_000, normalized: "10m" });
    expect(parseRepeatInterval("1h")).toEqual({ intervalMs: 3_600_000, normalized: "1h" });
    expect(parseRepeatInterval("1d")).toEqual({ intervalMs: 86_400_000, normalized: "1d" });
  });

  it("rejects intervals under one minute", () => {
    expect(() => parseRepeatInterval("0m")).toThrow(RepeatServiceError);
  });

  it("formats whole-unit intervals", () => {
    expect(formatInterval(600_000)).toBe("10m");
    expect(formatInterval(3_600_000)).toBe("1h");
  });
});

describe("autorespond matching", () => {
  const rules = [
    { id: "a", guildId: "g", trigger: "hi", reply: "hello", createdBy: "1" },
    { id: "b", guildId: "g", trigger: "hi there", reply: "hey", createdBy: "1" },
  ];

  it("matches case-insensitively and prefers the longest trigger", () => {
    const match = findMatchingAutoresponse("Oh HI THERE everyone", rules);
    expect(match?.id).toBe("b");
  });

  it("returns null when nothing matches", () => {
    expect(findMatchingAutoresponse("good morning", rules)).toBeNull();
  });

  it("blocks another fire within the cooldown window", () => {
    const now = Date.parse("2026-08-13T00:01:00.000Z");
    markAutorespondFired("g", "a", now - 1_000);
    expect(isAutorespondOnCooldown("g", "a", now)).toBe(true);
    expect(isAutorespondOnCooldown("g", "a", now + 10_000)).toBe(false);
  });
});

describe("embed color", () => {
  it("parses hash and bare hex", () => {
    expect(parseEmbedColor("#7c3aed")).toBe(0x7c3aed);
    expect(parseEmbedColor("00ff00")).toBe(0x00ff00);
  });

  it("rejects invalid colors", () => {
    expect(parseEmbedColor("blue")).toBeNull();
    expect(parseEmbedColor("#fff")).toBeNull();
  });
});
