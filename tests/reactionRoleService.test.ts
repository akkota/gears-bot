import { describe, expect, it } from "vitest";
import { parseMessageId } from "../src/modules/reactionRole/services/validateMessageId.js";

describe("parseMessageId", () => {
  it("accepts a typical 18-digit Discord message ID", () => {
    expect(parseMessageId("123456789012345678")).toBe("123456789012345678");
  });

  it("accepts a 17-digit message ID (minimum valid length)", () => {
    expect(parseMessageId("12345678901234567")).toBe("12345678901234567");
  });

  it("accepts a 19-digit message ID", () => {
    expect(parseMessageId("1234567890123456789")).toBe("1234567890123456789");
  });

  it("accepts a 20-digit message ID", () => {
    expect(parseMessageId("12345678901234567890")).toBe("12345678901234567890");
  });

  it("accepts a 25-digit message ID (no max length cap)", () => {
    expect(parseMessageId("1234567890123456789012345")).toBe(
      "1234567890123456789012345",
    );
  });

  it("trims surrounding whitespace before validating", () => {
    expect(parseMessageId("  123456789012345678  ")).toBe("123456789012345678");
  });

  it("returns null for an empty string", () => {
    expect(parseMessageId("")).toBeNull();
  });

  it("returns null for a string with only spaces", () => {
    expect(parseMessageId("   ")).toBeNull();
  });

  it("returns null for a string with letters", () => {
    expect(parseMessageId("abc123456789012345")).toBeNull();
  });

  it("returns null for a mixed alphanumeric string", () => {
    expect(parseMessageId("12345678901234abc")).toBeNull();
  });

  it("returns null for a too-short numeric string (under 17 digits)", () => {
    expect(parseMessageId("1234567890")).toBeNull();
  });

  it("returns null for a 16-digit string (just below minimum)", () => {
    expect(parseMessageId("1234567890123456")).toBeNull();
  });

  it("returns null for a string with a hyphen", () => {
    expect(parseMessageId("123456789-012345678")).toBeNull();
  });

  it("returns null for a string with a decimal point", () => {
    expect(parseMessageId("1234567890123456.78")).toBeNull();
  });

  it("does not convert to number (preserves the string exactly)", () => {
    const id = "123456789012345678";
    const result = parseMessageId(id);
    expect(typeof result).toBe("string");
    expect(result).toBe(id);
  });
});
