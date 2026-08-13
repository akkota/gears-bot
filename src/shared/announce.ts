import { ChannelType, type Client, type MessageCreateOptions } from "discord.js";

export async function sendGuildChannelMessage(
  client: Client,
  channelId: string,
  payload: MessageCreateOptions,
): Promise<boolean> {
  const channel = await client.channels.fetch(channelId).catch(() => null);

  if (
    !channel ||
    !channel.isTextBased() ||
    channel.type === ChannelType.DM ||
    !("send" in channel)
  ) {
    return false;
  }

  await channel.send(payload);
  return true;
}
