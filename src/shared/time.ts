export interface ParsedDuration {
  durationMs: number;
  normalized: string;
}

const DURATION_PATTERN = /^(\d+)\s*([mhd])$/i;

const UNIT_TO_MS: Record<string, number> = {
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseDuration(input: string): ParsedDuration | null {
  const trimmed = input.trim();
  const match = DURATION_PATTERN.exec(trimmed);

  if (!match) {
    return null;
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const unitMs = UNIT_TO_MS[unit];
  if (!unitMs) {
    return null;
  }

  const durationMs = amount * unitMs;
  return {
    durationMs,
    normalized: `${amount}${unit}`,
  };
}
