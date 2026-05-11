import { Client, Events, GatewayIntentBits } from "discord.js";
import { startReminderWorker } from "../modules/utility/services/reminderWorker.js";
import { handleInteraction } from "./interactionHandler.js";

export function createDiscordClient(): Client {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}`);
    startReminderWorker(readyClient);
  });

  client.on(Events.InteractionCreate, (interaction) => {
    void handleInteraction(interaction);
  });

  return client;
}
