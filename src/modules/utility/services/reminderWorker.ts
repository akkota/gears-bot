import { ChannelType, type Client } from "discord.js";
import { getDueReminders, markReminderCompleted } from "../../../db/remindersRepo.js";

const DEFAULT_REMINDER_POLL_MS = 15_000;

let reminderWorkerInterval: NodeJS.Timeout | null = null;
let workerRunning = false;

async function processDueReminders(client: Client): Promise<void> {
  if (workerRunning) {
    return;
  }

  workerRunning = true;
  try {
    const due = await getDueReminders(50);

    for (const reminder of due) {
      try {
        const channel = await client.channels.fetch(reminder.channelId).catch(() => null);

        if (
          channel &&
          channel.isTextBased() &&
          channel.type !== ChannelType.DM &&
          "send" in channel
        ) {
          await channel.send({
            content: `<@${reminder.userId}> reminder: ${reminder.reminderText}`,
          });
        }
      } catch (error) {
        console.error(`Failed to send reminder ${reminder.id}:`, error);
      } finally {
        await markReminderCompleted(reminder.id).catch((error) => {
          console.error(`Failed to complete reminder ${reminder.id}:`, error);
        });
      }
    }
  } catch (error) {
    console.error("Reminder worker polling failed:", error);
  } finally {
    workerRunning = false;
  }
}

export function startReminderWorker(client: Client): void {
  if (reminderWorkerInterval) {
    return;
  }

  reminderWorkerInterval = setInterval(() => {
    void processDueReminders(client);
  }, DEFAULT_REMINDER_POLL_MS);

  reminderWorkerInterval.unref?.();
  void processDueReminders(client);
}

export function stopReminderWorker(): void {
  if (!reminderWorkerInterval) {
    return;
  }

  clearInterval(reminderWorkerInterval);
  reminderWorkerInterval = null;
}
