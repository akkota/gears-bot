import type { Client } from "discord.js";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { env } from "../../../env.js";
import {
  hasSeenEmailMessage,
  markEmailMessageSeen,
} from "../../../db/emailMessagesRepo.js";
import { listGuildSettings } from "../../../db/guildSettingsRepo.js";
import { sendGuildChannelMessage } from "../../../shared/announce.js";
import { startIntervalWorker } from "../../../shared/intervalWorker.js";
import {
  formatEmailAnnouncement,
  normalizeMessageId,
  shouldIgnoreListEmail,
  stripHtml,
  type ParsedListEmail,
} from "./emailParser.js";

const EMAIL_POLL_MS = 90_000;

let stopHandle: (() => void) | null = null;
let running = false;

function imapConfigured(): boolean {
  return Boolean(env.IMAP_HOST && env.IMAP_USER && env.IMAP_PASSWORD);
}

async function fetchUnseenEmails(): Promise<ParsedListEmail[]> {
  if (!imapConfigured()) {
    return [];
  }

  const client = new ImapFlow({
    host: env.IMAP_HOST!,
    port: env.IMAP_PORT,
    secure: env.IMAP_SECURE,
    auth: {
      user: env.IMAP_USER!,
      pass: env.IMAP_PASSWORD!,
    },
    logger: false,
  });

  const parsed: ParsedListEmail[] = [];

  await client.connect();
  try {
    const lock = await client.getMailboxLock(env.IMAP_MAILBOX);
    try {
      for await (const message of client.fetch(
        { seen: false },
        { envelope: true, source: true, uid: true },
      )) {
        if (!message.source) {
          continue;
        }

        const mail = await simpleParser(message.source);
        const messageId = normalizeMessageId(
          mail.messageId ?? message.envelope?.messageId,
        );
        if (!messageId) {
          continue;
        }

        const subject = mail.subject?.trim() || "(no subject)";
        const fromAddress =
          mail.from?.text?.trim() ||
          message.envelope?.from?.[0]?.address ||
          "Unknown";
        const text =
          mail.text?.trim() ||
          (mail.html ? stripHtml(String(mail.html)) : "");

        parsed.push({
          messageId,
          subject,
          fromAddress,
          text,
          receivedAt: mail.date ?? null,
        });

        await client.messageFlagsAdd(message.uid, ["\\Seen"], { uid: true });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }

  return parsed;
}

async function announceEmail(client: Client, email: ParsedListEmail): Promise<void> {
  if (await hasSeenEmailMessage(email.messageId)) {
    return;
  }

  if (
    shouldIgnoreListEmail({
      subject: email.subject,
      fromAddress: email.fromAddress,
    })
  ) {
    await markEmailMessageSeen({
      messageId: email.messageId,
      subject: email.subject,
      fromAddress: email.fromAddress,
      receivedAt: email.receivedAt?.toISOString() ?? null,
    });
    return;
  }

  const settings = await listGuildSettings();
  const content = formatEmailAnnouncement(email);

  for (const guild of settings) {
    if (!guild.emailAnnounceChannelId) {
      continue;
    }

    try {
      await sendGuildChannelMessage(client, guild.emailAnnounceChannelId, {
        content,
      });
    } catch (error) {
      console.error(
        `Failed to post email ${email.messageId} to guild ${guild.guildId}:`,
        error,
      );
    }
  }

  await markEmailMessageSeen({
    messageId: email.messageId,
    subject: email.subject,
    fromAddress: email.fromAddress,
    receivedAt: email.receivedAt?.toISOString() ?? null,
  });
}

async function tick(client: Client): Promise<void> {
  if (running || !imapConfigured()) {
    return;
  }

  running = true;
  try {
    const emails = await fetchUnseenEmails();
    for (const email of emails) {
      await announceEmail(client, email);
    }
  } catch (error) {
    console.error("Email poll failed:", error);
  } finally {
    running = false;
  }
}

export function startEmailWorker(client: Client): void {
  if (stopHandle || !imapConfigured()) {
    if (!imapConfigured()) {
      console.log("Email worker skipped: IMAP credentials are not configured.");
    }
    return;
  }

  stopHandle = startIntervalWorker(() => tick(client), EMAIL_POLL_MS);
}

export function stopEmailWorker(): void {
  stopHandle?.();
  stopHandle = null;
}
