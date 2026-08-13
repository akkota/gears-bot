import { EmbedBuilder, type Guild, type GuildTextBasedChannel } from "discord.js";
import {
  createBotEmbed,
  getBotEmbed,
  updateBotEmbed,
  type BotEmbedRecord,
} from "../../../db/botEmbedsRepo.js";
import { parseMessageId } from "../../reactionRoles/services/parseMessageId.js";

export class EmbedServiceError extends Error {}

export function parseEmbedColor(input: string | null | undefined): number | null {
  if (!input) {
    return null;
  }
  const hex = input.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return null;
  }
  return Number.parseInt(hex, 16);
}

export function buildStoredEmbed(record: {
  title: string | null;
  description: string | null;
  color: number | null;
  imageUrl: string | null;
}): EmbedBuilder {
  const embed = new EmbedBuilder();
  if (record.title) {
    embed.setTitle(record.title);
  }
  if (record.description) {
    embed.setDescription(record.description);
  }
  if (typeof record.color === "number") {
    embed.setColor(record.color);
  }
  if (record.imageUrl) {
    embed.setImage(record.imageUrl);
  }
  return embed;
}

function guildMeta(guild: Guild) {
  return {
    guildId: guild.id,
    guildName: guild.name,
    guildIconUrl: guild.iconURL(),
    guildOwnerId: guild.ownerId ?? null,
  };
}

function assertSendableChannel(channel: GuildTextBasedChannel | null): GuildTextBasedChannel {
  if (!channel || !channel.isTextBased() || !("send" in channel)) {
    throw new EmbedServiceError("That channel cannot receive embeds.");
  }
  return channel;
}

export async function createGuildEmbed(params: {
  guild: Guild;
  channel: GuildTextBasedChannel;
  createdBy: string;
  title?: string | null;
  description?: string | null;
  colorInput?: string | null;
  imageUrl?: string | null;
}): Promise<BotEmbedRecord> {
  const title = params.title?.trim() || null;
  const description = params.description?.trim() || null;
  const imageUrl = params.imageUrl?.trim() || null;
  if (!title && !description && !imageUrl) {
    throw new EmbedServiceError("Provide a title, description, or image.");
  }

  let color: number | null = null;
  if (params.colorInput?.trim()) {
    color = parseEmbedColor(params.colorInput);
    if (color === null) {
      throw new EmbedServiceError("Color must be a 6-digit hex value like #7c3aed.");
    }
  }

  const channel = assertSendableChannel(params.channel);
  const payload = { title, description, color, imageUrl };
  const sent = await channel.send({ embeds: [buildStoredEmbed(payload)] });

  return createBotEmbed({
    ...guildMeta(params.guild),
    channelId: channel.id,
    messageId: sent.id,
    title,
    description,
    color,
    imageUrl,
    createdBy: params.createdBy,
  });
}

export async function editGuildEmbed(params: {
  guild: Guild;
  messageInput: string;
  title?: string | null;
  description?: string | null;
  colorInput?: string | null;
  imageUrl?: string | null;
}): Promise<BotEmbedRecord> {
  const messageId = parseMessageId(params.messageInput);
  if (!messageId) {
    throw new EmbedServiceError("Provide a message id or Discord message link.");
  }

  const existing = await getBotEmbed(params.guild.id, messageId);
  if (!existing) {
    throw new EmbedServiceError("I can only edit embeds created with /embed create.");
  }

  const patch: {
    title?: string | null;
    description?: string | null;
    color?: number | null;
    imageUrl?: string | null;
  } = {};

  if (params.title !== undefined && params.title !== null) {
    patch.title = params.title.trim() || null;
  }
  if (params.description !== undefined && params.description !== null) {
    patch.description = params.description.trim() || null;
  }
  if (params.imageUrl !== undefined && params.imageUrl !== null) {
    patch.imageUrl = params.imageUrl.trim() || null;
  }
  if (params.colorInput !== undefined && params.colorInput !== null) {
    if (!params.colorInput.trim()) {
      patch.color = null;
    } else {
      const parsed = parseEmbedColor(params.colorInput);
      if (parsed === null) {
        throw new EmbedServiceError("Color must be a 6-digit hex value like #7c3aed.");
      }
      patch.color = parsed;
    }
  }

  const next = {
    title: Object.hasOwn(patch, "title") ? (patch.title ?? null) : existing.title,
    description: Object.hasOwn(patch, "description")
      ? (patch.description ?? null)
      : existing.description,
    color: Object.hasOwn(patch, "color") ? (patch.color ?? null) : existing.color,
    imageUrl: Object.hasOwn(patch, "imageUrl") ? (patch.imageUrl ?? null) : existing.imageUrl,
  };

  if (!next.title && !next.description && !next.imageUrl) {
    throw new EmbedServiceError("The embed would be empty. Leave at least a title, description, or image.");
  }

  const channel = await params.guild.channels.fetch(existing.channelId).catch(() => null);
  if (!channel || !channel.isTextBased() || !("messages" in channel)) {
    throw new EmbedServiceError("The original embed channel is gone.");
  }

  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (!message) {
    throw new EmbedServiceError("Could not find that message.");
  }
  if (message.author.id !== params.guild.client.user?.id) {
    throw new EmbedServiceError("I can only edit messages I sent.");
  }

  await message.edit({ embeds: [buildStoredEmbed(next)] });
  const updated = await updateBotEmbed(params.guild.id, messageId, patch);
  return updated ?? { ...existing, ...next };
}
