export interface ParsedListEmail {
  messageId: string;
  subject: string;
  fromAddress: string;
  text: string;
  receivedAt: Date | null;
}

const IGNORE_SUBJECT =
  /^(re|fw|fwd|automatic reply|auto(?:matic)?:|out of office|undeliverable)\b/i;
const IGNORE_FROM = /(mailer-daemon|postmaster|noreply|no-reply)/i;

export function normalizeMessageId(raw: string | undefined | null): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/^<|>$/g, "");
}

export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function truncateEmailBody(text: string, maxLength = 1600): string {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function shouldIgnoreListEmail(input: {
  subject: string;
  fromAddress: string;
  autoSubmitted?: string | null;
}): boolean {
  if (input.autoSubmitted && input.autoSubmitted.toLowerCase() !== "no") {
    return true;
  }

  if (IGNORE_SUBJECT.test(input.subject.trim())) {
    return true;
  }

  return IGNORE_FROM.test(input.fromAddress);
}

export function formatEmailAnnouncement(email: ParsedListEmail): string {
  const body = truncateEmailBody(email.text || "(No text body)");
  const lines = [
    "**New ESW list email**",
    `**From:** ${email.fromAddress || "Unknown"}`,
    `**Subject:** ${email.subject || "(no subject)"}`,
    "",
    body,
  ];
  return lines.join("\n").slice(0, 1900);
}
