import { Client, Events, GatewayIntentBits } from "discord.js";
import { startCalendarSyncWorker } from "../modules/calendar/services/calendarSyncWorker.js";
import { startEmailWorker } from "../modules/email/services/emailWorker.js";
import { startProjectSyncWorker } from "../modules/projects/services/projectSyncWorker.js";
import { startSocialWorker } from "../modules/social/services/socialWorker.js";
import { startReminderWorker } from "../modules/utility/services/reminderWorker.js";
import { handleInteraction } from "./interactionHandler.js";

export function createDiscordClient(): Client {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}`);
    startReminderWorker(readyClient);
    startProjectSyncWorker();
    startEmailWorker(readyClient);
    startCalendarSyncWorker(readyClient);
    startSocialWorker(readyClient);
  });

  client.on(Events.InteractionCreate, (interaction) => {
    void handleInteraction(interaction);
  });

  return client;
}
