export interface ParsedDuration {
  durationMs: number;
  normalized: string;
}

export interface ParsedDateTimeInput {
  epochSeconds: number;
}

const DURATION_PATTERN = /^(\d+)\s*([mhd])$/i;

const UNIT_TO_MS: Record<string, number> = {
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

const SIMPLE_DATETIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

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

function hasExplicitOffsetOrZulu(input: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(input.trim());
}

export function isValidIanaTimezone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function getZonedParts(
  timestampMs: number,
  timeZone: string,
): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(timestampMs));

  const partValue = (type: string): number =>
    Number.parseInt(parts.find((part) => part.type === type)?.value ?? "0", 10);

  return {
    year: partValue("year"),
    month: partValue("month"),
    day: partValue("day"),
    hour: partValue("hour"),
    minute: partValue("minute"),
    second: partValue("second"),
  };
}

function getTimeZoneOffsetMs(timestampMs: number, timeZone: string): number {
  const zoned = getZonedParts(timestampMs, timeZone);
  const zonedAsUtc = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
  );
  return zonedAsUtc - timestampMs;
}

function parseNaiveDateTimeInTimeZone(
  datetime: string,
  timeZone: string,
): ParsedDateTimeInput | null {
  const match = SIMPLE_DATETIME_PATTERN.exec(datetime.trim());
  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const hour = Number.parseInt(match[4] ?? "0", 10);
  const minute = Number.parseInt(match[5] ?? "0", 10);
  const second = Number.parseInt(match[6] ?? "0", 10);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const firstOffset = getTimeZoneOffsetMs(utcGuess, timeZone);
  const firstEpochMs = utcGuess - firstOffset;
  const secondOffset = getTimeZoneOffsetMs(firstEpochMs, timeZone);
  const epochMs = utcGuess - secondOffset;

  const roundTrip = getZonedParts(epochMs, timeZone);
  if (
    roundTrip.year !== year ||
    roundTrip.month !== month ||
    roundTrip.day !== day ||
    roundTrip.hour !== hour ||
    roundTrip.minute !== minute ||
    roundTrip.second !== second
  ) {
    return null;
  }

  return {
    epochSeconds: Math.floor(epochMs / 1000),
  };
}

export function parseDateTimeToEpoch(
  datetime: string,
  timeZone?: string | null,
): ParsedDateTimeInput | null {
  const trimmed = datetime.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (!timeZone) {
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return { epochSeconds: Math.floor(parsed.getTime() / 1000) };
  }

  if (!isValidIanaTimezone(timeZone)) {
    return null;
  }

  if (hasExplicitOffsetOrZulu(trimmed)) {
    const absolute = new Date(trimmed);
    if (Number.isNaN(absolute.getTime())) {
      return null;
    }

    return { epochSeconds: Math.floor(absolute.getTime() / 1000) };
  }

  return parseNaiveDateTimeInTimeZone(trimmed, timeZone);
}

export function formatEpochInTimezone(
  epochSeconds: number,
  timeZone: string,
): string | null {
  if (!isValidIanaTimezone(timeZone)) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(new Date(epochSeconds * 1000));
}
