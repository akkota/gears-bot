import { Client, Events, GatewayIntentBits } from "discord.js";
import { startCalendarSyncWorker } from "../modules/calendar/services/calendarSyncWorker.js";
import { startEmailWorker } from "../modules/email/services/emailWorker.js";
import { startHabitChallengeWorker } from "../modules/habits/services/habitChallengeWorker.js";
import { startProjectSyncWorker } from "../modules/projects/services/projectSyncWorker.js";
import { handleGuildAutorespond } from "../modules/server/services/autorespondListener.js";
import { startRepeatWorker } from "../modules/server/services/repeatWorker.js";
import { handleMemberBoost, handleMemberJoin } from "../modules/server/services/welcomeListener.js";
import { startSocialWorker } from "../modules/social/services/socialWorker.js";
import { startReminderWorker } from "../modules/utility/services/reminderWorker.js";
import { handleGuildMessageXp } from "../modules/xp/services/messageXpListener.js";
import { handleInteraction } from "./interactionHandler.js";

export function createDiscordClient(): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}`);
    startReminderWorker(readyClient);
    startRepeatWorker(readyClient);
    startHabitChallengeWorker(readyClient);
    startProjectSyncWorker();
    startEmailWorker(readyClient);
    startCalendarSyncWorker(readyClient);
    startSocialWorker(readyClient);
  });

  client.on(Events.InteractionCreate, (interaction) => {
    void handleInteraction(interaction);
  });

  client.on(Events.MessageCreate, (message) => {
    void handleGuildMessageXp(message);
    void handleGuildAutorespond(message);
  });

  client.on(Events.GuildMemberAdd, (member) => {
    void handleMemberJoin(member).catch((error) => {
      console.error("Welcome handler failed:", error);
    });
  });

  client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
    void handleMemberBoost(oldMember, newMember).catch((error) => {
      console.error("Boost handler failed:", error);
    });
  });

  return client;
}
