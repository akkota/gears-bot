import { describe, expect, it } from "vitest";
import {
  lookupDefinition,
  normalizeDictionaryWord,
  summarizeDefinitions,
} from "../src/modules/utility/services/defineService.js";
import type { DictionaryProvider } from "../src/modules/utility/services/definitionProvider.js";

describe("define service", () => {
  it("normalizes valid words and rejects invalid input", () => {
    expect(normalizeDictionaryWord("  hello  ")).toBe("hello");
    expect(normalizeDictionaryWord("")).toBeNull();
    expect(normalizeDictionaryWord("   ")).toBeNull();
    expect(normalizeDictionaryWord("x".repeat(65))).toBeNull();
  });

  it("summarizes top definitions", () => {
    const lines = summarizeDefinitions({
      status: "found",
      word: "test",
      phonetic: "/test/",
      definitions: [
        {
          partOfSpeech: "noun",
          definition: "A procedure for critical evaluation.",
          example: "This is a unit test.",
        },
        {
          partOfSpeech: "verb",
          definition: "To take a test.",
          example: null,
        },
      ],
    });

    expect(lines[0]).toBe("Word: test");
    expect(lines[1]).toBe("Phonetic: /test/");
    expect(lines.some((line) => line.includes("critical evaluation"))).toBe(true);
  });

  it("uses provider abstraction for lookups", async () => {
    const mockProvider: DictionaryProvider = {
      lookup: async () => ({
        status: "not_found",
      }),
    };

    const result = await lookupDefinition("missingword", mockProvider);
    expect(result.status).toBe("not_found");
  });
});
