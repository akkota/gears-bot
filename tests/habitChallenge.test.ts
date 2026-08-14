import { describe, expect, it } from "vitest";
import { parseHabitButtonCustomId } from "../src/modules/habits/services/habitChallengeWorker.js";

describe("habit challenge buttons", () => {
  it("parses approve and reject custom ids", () => {
    expect(parseHabitButtonCustomId("habit:approve:abc-123")).toEqual({
      action: "approve",
      logId: "abc-123",
    });
    expect(parseHabitButtonCustomId("habit:reject:abc-123")).toEqual({
      action: "reject",
      logId: "abc-123",
    });
    expect(parseHabitButtonCustomId("rr:toggle:1")).toBeNull();
  });
});
