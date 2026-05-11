/**
 * Validates a Discord message ID as a snowflake.
 *
 * Rules:
 * - Must contain only digits (no letters, spaces, or symbols)
 * - Must be at least 17 characters (Discord snowflakes are never shorter)
 * - No upper length limit — stored and passed as a string throughout
 *
 * @returns The trimmed ID string if valid, or null if invalid.
 */
export function parseMessageId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!/^\d{17,}$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}
