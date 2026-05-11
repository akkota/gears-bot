import {
  defaultDictionaryProvider,
  type DictionaryLookupFound,
  type DictionaryLookupResult,
  type DictionaryProvider,
} from "./definitionProvider.js";

export function normalizeDictionaryWord(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > 64) {
    return null;
  }

  return trimmed;
}

export function summarizeDefinitions(result: DictionaryLookupFound): string[] {
  const lines: string[] = [];
  lines.push(`Word: ${result.word}`);

  if (result.phonetic) {
    lines.push(`Phonetic: ${result.phonetic}`);
  }

  const top = result.definitions.slice(0, 3);
  top.forEach((item, index) => {
    const pos = item.partOfSpeech ? ` (${item.partOfSpeech})` : "";
    lines.push(`${index + 1}. ${item.definition}${pos}`);
    if (item.example) {
      lines.push(`   Example: ${item.example}`);
    }
  });

  if (result.definitions.length > top.length) {
    lines.push(`...and ${result.definitions.length - top.length} more definition(s).`);
  }

  return lines;
}

export async function lookupDefinition(
  word: string,
  provider: DictionaryProvider = defaultDictionaryProvider,
): Promise<DictionaryLookupResult> {
  return provider.lookup(word);
}
