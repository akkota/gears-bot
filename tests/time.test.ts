import { describe, expect, it } from "vitest";
import { parseDuration } from "../src/shared/time.js";

describe("time helpers", () => {
  it("parses minutes", () => {
    expect(parseDuration("10m")).toEqual({
      durationMs: 600000,
      normalized: "10m",
    });
  });

  it("parses hours", () => {
    expect(parseDuration("2h")).toEqual({
      durationMs: 7200000,
      normalized: "2h",
    });
  });

  it("parses days", () => {
    expect(parseDuration("1d")).toEqual({
      durationMs: 86400000,
      normalized: "1d",
    });
  });

  it("trims and normalizes uppercase unit", () => {
    expect(parseDuration(" 15H ")).toEqual({
      durationMs: 54000000,
      normalized: "15h",
    });
  });

  it("returns null for invalid duration strings", () => {
    expect(parseDuration("0m")).toBeNull();
    expect(parseDuration("abc")).toBeNull();
    expect(parseDuration("10")).toBeNull();
    expect(parseDuration("10w")).toBeNull();
  });
});
