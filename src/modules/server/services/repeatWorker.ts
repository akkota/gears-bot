import { ChannelType, type Client } from "discord.js";
import { bumpRepeatMessage, getDueRepeatMessages } from "../../../db/repeatMessagesRepo.js";

const DEFAULT_REPEAT_POLL_MS = 15_000;

let repeatWorkerInterval: NodeJS.Timeout | null = null;
let workerRunning = false;

function nextRunAfterSend(intervalMs: number): string {
  return new Date(Date.now() + Math.max(intervalMs, 60_000)).toISOString();
}

async function processDueRepeats(client: Client): Promise<void> {
  if (workerRunning) {
    return;
  }

  workerRunning = true;
  try {
    const due = await getDueRepeatMessages(50);

    for (const item of due) {
      try {
        const channel = await client.channels.fetch(item.channelId).catch(() => null);
        if (
          channel &&
          channel.isTextBased() &&
          channel.type !== ChannelType.DM &&
          "send" in channel
        ) {
          await channel.send({ content: item.content });
        }
      } catch (error) {
        console.error(`Failed to send repeat message ${item.id}:`, error);
      } finally {
        await bumpRepeatMessage(item.id, nextRunAfterSend(item.intervalMs)).catch((error) => {
          console.error(`Failed to bump repeat message ${item.id}:`, error);
        });
      }
    }
  } catch (error) {
    console.error("Repeat message worker polling failed:", error);
  } finally {
    workerRunning = false;
  }
}

export function startRepeatWorker(client: Client): void {
  if (repeatWorkerInterval) {
    return;
  }

  repeatWorkerInterval = setInterval(() => {
    void processDueRepeats(client);
  }, DEFAULT_REPEAT_POLL_MS);

  repeatWorkerInterval.unref?.();
  void processDueRepeats(client);
}

export function stopRepeatWorker(): void {
  if (!repeatWorkerInterval) {
    return;
  }

  clearInterval(repeatWorkerInterval);
  repeatWorkerInterval = null;
}
