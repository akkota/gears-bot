import { type Message } from "discord.js";
import { handleMessageXp, sendUnlockNotice } from "./xpService.js";

export async function handleGuildMessageXp(message: Message): Promise<void> {
  if (!message.inGuild() || message.author.bot) {
    return;
  }

  try {
    const unlockMessage = await handleMessageXp(message);
    if (unlockMessage) {
      await sendUnlockNotice(message.channel, message.author.id, unlockMessage);
    }
  } catch (error) {
    console.error("Message XP handling failed:", error);
  }
}
