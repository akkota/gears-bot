/**
 * Parses a Discord message snowflake from raw user input.
 *
 * Accepts:
 * - A bare snowflake (digits only, at least 17 characters)
 * - A Discord message link (.../channels/{guild}/{channel}/{message})
 *
 * Message IDs are always treated as strings — never numbers — so large
 * snowflakes are not truncated by JavaScript number precision.
 */
export function parseMessageId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const linkMatch = trimmed.match(
    /(?:https?:\/\/)?(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/channels\/\d+\/\d+\/(\d{17,})/i,
  );
  if (linkMatch?.[1]) {
    return linkMatch[1];
  }

  if (/^\d{17,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}
