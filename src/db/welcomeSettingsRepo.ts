import { supabase } from "./supabase.js";

export interface WelcomeSettings {
  guildId: string;
  welcomeChannelId: string | null;
  welcomeMessage: string | null;
  boostChannelId: string | null;
  boostMessage: string | null;
}

interface WelcomeSettingsRow {
  guild_id: string;
  welcome_channel_id: string | null;
  welcome_message: string | null;
  boost_channel_id: string | null;
  boost_message: string | null;
}

function mapRow(row: WelcomeSettingsRow): WelcomeSettings {
  return {
    guildId: row.guild_id,
    welcomeChannelId: row.welcome_channel_id,
    welcomeMessage: row.welcome_message,
    boostChannelId: row.boost_channel_id,
    boostMessage: row.boost_message,
  };
}

async function ensureGuildExists(input: {
  guildId: string;
  guildName: string | null;
  guildIconUrl: string | null;
  guildOwnerId: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase.from("guilds").upsert(
    {
      guild_id: input.guildId,
      name: input.guildName,
      icon_url: input.guildIconUrl,
      owner_id: input.guildOwnerId,
      updated_at: now,
    },
    { onConflict: "guild_id", ignoreDuplicates: false },
  );

  if (error) {
    throw new Error(`Failed to upsert guild for welcome settings: ${error.message}`);
  }
}

export async function getWelcomeSettings(guildId: string): Promise<WelcomeSettings | null> {
  const { data, error } = await supabase
    .from("welcome_settings")
    .select("guild_id,welcome_channel_id,welcome_message,boost_channel_id,boost_message")
    .eq("guild_id", guildId)
    .maybeSingle<WelcomeSettingsRow>();

  if (error) {
    throw new Error(`Failed to fetch welcome settings: ${error.message}`);
  }

  return data ? mapRow(data) : null;
}

export async function upsertWelcomeSettings(input: {
  guildId: string;
  guildName: string | null;
  guildIconUrl: string | null;
  guildOwnerId: string | null;
  welcomeChannelId?: string | null;
  welcomeMessage?: string | null;
  boostChannelId?: string | null;
  boostMessage?: string | null;
}): Promise<WelcomeSettings> {
  await ensureGuildExists(input);
  const existing = await getWelcomeSettings(input.guildId);
  const now = new Date().toISOString();

  const payload = {
    guild_id: input.guildId,
    welcome_channel_id:
      input.welcomeChannelId !== undefined
        ? input.welcomeChannelId
        : (existing?.welcomeChannelId ?? null),
    welcome_message:
      input.welcomeMessage !== undefined ? input.welcomeMessage : (existing?.welcomeMessage ?? null),
    boost_channel_id:
      input.boostChannelId !== undefined ? input.boostChannelId : (existing?.boostChannelId ?? null),
    boost_message:
      input.boostMessage !== undefined ? input.boostMessage : (existing?.boostMessage ?? null),
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("welcome_settings")
    .upsert(payload, { onConflict: "guild_id" })
    .select("guild_id,welcome_channel_id,welcome_message,boost_channel_id,boost_message")
    .single<WelcomeSettingsRow>();

  if (error || !data) {
    throw new Error(`Failed to upsert welcome settings: ${error?.message ?? "unknown error"}`);
  }

  return mapRow(data);
}
