import type { Guild } from "discord.js";
import {
  getWelcomeSettings,
  upsertWelcomeSettings,
  type WelcomeSettings,
} from "../../../db/welcomeSettingsRepo.js";
import { DEFAULT_BOOST_MESSAGE, DEFAULT_WELCOME_MESSAGE } from "./welcomeTemplates.js";

function guildMeta(guild: Guild) {
  return {
    guildId: guild.id,
    guildName: guild.name,
    guildIconUrl: guild.iconURL(),
    guildOwnerId: guild.ownerId ?? null,
  };
}

export async function setWelcomeConfig(
  guild: Guild,
  input: { channelId: string; message?: string | null },
): Promise<WelcomeSettings> {
  return upsertWelcomeSettings({
    ...guildMeta(guild),
    welcomeChannelId: input.channelId,
    welcomeMessage: input.message?.trim() || DEFAULT_WELCOME_MESSAGE,
  });
}

export async function setBoostConfig(
  guild: Guild,
  input: { channelId: string; message?: string | null },
): Promise<WelcomeSettings> {
  return upsertWelcomeSettings({
    ...guildMeta(guild),
    boostChannelId: input.channelId,
    boostMessage: input.message?.trim() || DEFAULT_BOOST_MESSAGE,
  });
}

export async function loadWelcomeSettings(guildId: string): Promise<WelcomeSettings | null> {
  return getWelcomeSettings(guildId);
}
