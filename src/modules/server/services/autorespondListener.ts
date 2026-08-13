import { type Message } from "discord.js";
import {
  findMatchingAutoresponse,
  isAutorespondOnCooldown,
  listGuildAutoresponses,
  markAutorespondFired,
} from "./autorespondService.js";

export async function handleGuildAutorespond(message: Message): Promise<void> {
  if (!message.inGuild() || !message.guild || message.author.bot) {
    return;
  }

  const content = message.content?.trim();
  if (!content) {
    return;
  }

  const rules = await listGuildAutoresponses(message.guild.id);
  const match = findMatchingAutoresponse(content, rules);
  if (!match) {
    return;
  }

  if (isAutorespondOnCooldown(message.guild.id, match.id)) {
    return;
  }

  markAutorespondFired(message.guild.id, match.id);
  await message.reply({ content: match.reply }).catch(() => undefined);
}
