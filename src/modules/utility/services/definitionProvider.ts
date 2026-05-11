export interface DictionaryDefinition {
  partOfSpeech: string | null;
  definition: string;
  example: string | null;
}

export interface DictionaryLookupFound {
  status: "found";
  word: string;
  phonetic: string | null;
  definitions: DictionaryDefinition[];
}

export interface DictionaryLookupNotFound {
  status: "not_found";
}

export interface DictionaryLookupError {
  status: "error";
}

export type DictionaryLookupResult =
  | DictionaryLookupFound
  | DictionaryLookupNotFound
  | DictionaryLookupError;

export interface DictionaryProvider {
  lookup(word: string): Promise<DictionaryLookupResult>;
}

interface DictionaryApiMeaning {
  partOfSpeech?: string;
  definitions?: Array<{
    definition?: string;
    example?: string;
  }>;
}

interface DictionaryApiEntry {
  word?: string;
  phonetic?: string;
  phonetics?: Array<{
    text?: string;
  }>;
  meanings?: DictionaryApiMeaning[];
}

function toDefinitions(entries: DictionaryApiEntry[]): DictionaryDefinition[] {
  const output: DictionaryDefinition[] = [];

  for (const entry of entries) {
    const meanings = entry.meanings ?? [];
    for (const meaning of meanings) {
      const partOfSpeech = meaning.partOfSpeech ?? null;
      const definitions = meaning.definitions ?? [];
      for (const item of definitions) {
        if (!item.definition) {
          continue;
        }

        output.push({
          partOfSpeech,
          definition: item.definition,
          example: item.example ?? null,
        });
      }
    }
  }

  return output;
}

function firstPhonetic(entry: DictionaryApiEntry | undefined): string | null {
  if (!entry) {
    return null;
  }

  if (entry.phonetic) {
    return entry.phonetic;
  }

  return entry.phonetics?.find((item) => item.text)?.text ?? null;
}

export class DictionaryApiDevProvider implements DictionaryProvider {
  async lookup(word: string): Promise<DictionaryLookupResult> {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;

    try {
      const response = await fetch(url);

      if (response.status === 404) {
        return { status: "not_found" };
      }

      if (!response.ok) {
        return { status: "error" };
      }

      const payload = (await response.json()) as DictionaryApiEntry[];
      if (!Array.isArray(payload) || payload.length === 0) {
        return { status: "not_found" };
      }

      const definitions = toDefinitions(payload);
      if (definitions.length === 0) {
        return { status: "not_found" };
      }

      const canonicalWord = payload[0]?.word?.trim() || word;

      return {
        status: "found",
        word: canonicalWord,
        phonetic: firstPhonetic(payload[0]),
        definitions,
      };
    } catch {
      return { status: "error" };
    }
  }
}

export const defaultDictionaryProvider: DictionaryProvider =
  new DictionaryApiDevProvider();
