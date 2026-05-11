import { describe, expect, it } from "vitest";
import {
  isValidIanaTimezone,
  parseDateTimeToEpoch,
  parseDuration,
} from "../src/shared/time.js";

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

  it("parses reminder-style relative times", () => {
    expect(parseDuration("10m")?.normalized).toBe("10m");
    expect(parseDuration("2h")?.normalized).toBe("2h");
    expect(parseDuration("3d")?.normalized).toBe("3d");
  });

  it("parses ISO datetime to epoch", () => {
    const parsed = parseDateTimeToEpoch("2026-05-11T12:00:00Z", null);
    expect(parsed?.epochSeconds).toBe(1778500800);
  });

  it("parses naive datetime with timezone", () => {
    const parsed = parseDateTimeToEpoch(
      "2026-05-11 05:00:00",
      "America/Los_Angeles",
    );
    expect(parsed?.epochSeconds).toBe(1778500800);
  });

  it("returns null for invalid datetime/timezone inputs", () => {
    expect(parseDateTimeToEpoch("", null)).toBeNull();
    expect(parseDateTimeToEpoch("not-a-date", null)).toBeNull();
    expect(parseDateTimeToEpoch("2026-05-11 12:00", "Not/A_Timezone")).toBeNull();
  });

  it("validates IANA timezone names", () => {
    expect(isValidIanaTimezone("America/Los_Angeles")).toBe(true);
    expect(isValidIanaTimezone("UTC")).toBe(true);
    expect(isValidIanaTimezone("Invalid/Timezone")).toBe(false);
  });
});
