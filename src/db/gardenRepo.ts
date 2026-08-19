import { supabase } from "./supabase.js";

export interface GardenPlotRecord {
  guildId: string;
  userId: string;
  slot: number;
  seedId: string;
  plantedAt: string;
  wateredAt: string | null;
  fertilized: boolean;
}

export interface GardenInventoryRecord {
  id: string;
  guildId: string;
  userId: string;
  seedId: string;
  quality: string;
  fertilized: boolean;
  createdAt: string;
}

export interface GardenBoostRecord {
  guildId: string;
  userId: string;
  multiplier: number;
  expiresAt: string;
  sourceLabel: string;
}

interface PlotRow {
  guild_id: string;
  user_id: string;
  slot: number;
  seed_id: string;
  planted_at: string;
  watered_at: string | null;
  fertilized: boolean;
}

interface InventoryRow {
  id: string;
  guild_id: string;
  user_id: string;
  seed_id: string;
  quality: string;
  fertilized: boolean;
  created_at: string;
}

interface BoostRow {
  guild_id: string;
  user_id: string;
  multiplier: number;
  expires_at: string;
  source_label: string;
}

function mapPlot(row: PlotRow): GardenPlotRecord {
  return {
    guildId: row.guild_id,
    userId: row.user_id,
    slot: row.slot,
    seedId: row.seed_id,
    plantedAt: row.planted_at,
    wateredAt: row.watered_at,
    fertilized: row.fertilized,
  };
}

function mapInventory(row: InventoryRow): GardenInventoryRecord {
  return {
    id: row.id,
    guildId: row.guild_id,
    userId: row.user_id,
    seedId: row.seed_id,
    quality: row.quality,
    fertilized: row.fertilized,
    createdAt: row.created_at,
  };
}

function mapBoost(row: BoostRow): GardenBoostRecord {
  return {
    guildId: row.guild_id,
    userId: row.user_id,
    multiplier: Number(row.multiplier),
    expiresAt: row.expires_at,
    sourceLabel: row.source_label,
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
    throw new Error(`Failed to upsert guild for garden: ${error.message}`);
  }
}

export async function listGardenPlots(
  guildId: string,
  userId: string,
): Promise<GardenPlotRecord[]> {
  const { data, error } = await supabase
    .from("garden_plots")
    .select("guild_id,user_id,slot,seed_id,planted_at,watered_at,fertilized")
    .eq("guild_id", guildId)
    .eq("user_id", userId)
    .order("slot")
    .returns<PlotRow[]>();

  if (error) {
    throw new Error(`Failed to list garden plots: ${error.message}`);
  }

  return (data ?? []).map(mapPlot);
}

export async function upsertGardenPlot(input: {
  guildId: string;
  guildName: string | null;
  guildIconUrl: string | null;
  guildOwnerId: string | null;
  userId: string;
  slot: number;
  seedId: string;
  plantedAt: string;
  wateredAt: string | null;
  fertilized: boolean;
}): Promise<GardenPlotRecord> {
  await ensureGuildExists(input);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("garden_plots")
    .upsert(
      {
        guild_id: input.guildId,
        user_id: input.userId,
        slot: input.slot,
        seed_id: input.seedId,
        planted_at: input.plantedAt,
        watered_at: input.wateredAt,
        fertilized: input.fertilized,
        updated_at: now,
      },
      { onConflict: "guild_id,user_id,slot" },
    )
    .select("guild_id,user_id,slot,seed_id,planted_at,watered_at,fertilized")
    .single<PlotRow>();

  if (error || !data) {
    throw new Error(`Failed to save garden plot: ${error?.message ?? "unknown error"}`);
  }

  return mapPlot(data);
}

export async function deleteGardenPlot(
  guildId: string,
  userId: string,
  slot: number,
): Promise<void> {
  const { error } = await supabase
    .from("garden_plots")
    .delete()
    .eq("guild_id", guildId)
    .eq("user_id", userId)
    .eq("slot", slot);

  if (error) {
    throw new Error(`Failed to clear garden plot: ${error.message}`);
  }
}

export async function listGardenInventory(
  guildId: string,
  userId: string,
): Promise<GardenInventoryRecord[]> {
  const { data, error } = await supabase
    .from("garden_inventory")
    .select("id,guild_id,user_id,seed_id,quality,fertilized,created_at")
    .eq("guild_id", guildId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .returns<InventoryRow[]>();

  if (error) {
    throw new Error(`Failed to list garden inventory: ${error.message}`);
  }

  return (data ?? []).map(mapInventory);
}

export async function insertGardenInventoryItem(input: {
  guildId: string;
  guildName: string | null;
  guildIconUrl: string | null;
  guildOwnerId: string | null;
  userId: string;
  seedId: string;
  quality: string;
  fertilized: boolean;
}): Promise<GardenInventoryRecord> {
  await ensureGuildExists(input);
  const { data, error } = await supabase
    .from("garden_inventory")
    .insert({
      guild_id: input.guildId,
      user_id: input.userId,
      seed_id: input.seedId,
      quality: input.quality,
      fertilized: input.fertilized,
    })
    .select("id,guild_id,user_id,seed_id,quality,fertilized,created_at")
    .single<InventoryRow>();

  if (error || !data) {
    throw new Error(`Failed to store harvest: ${error?.message ?? "unknown error"}`);
  }

  return mapInventory(data);
}

export async function getGardenInventoryItem(
  guildId: string,
  userId: string,
  itemId: string,
): Promise<GardenInventoryRecord | null> {
  const { data, error } = await supabase
    .from("garden_inventory")
    .select("id,guild_id,user_id,seed_id,quality,fertilized,created_at")
    .eq("guild_id", guildId)
    .eq("user_id", userId)
    .eq("id", itemId)
    .maybeSingle<InventoryRow>();

  if (error) {
    throw new Error(`Failed to fetch harvest: ${error.message}`);
  }

  return data ? mapInventory(data) : null;
}

export async function deleteGardenInventoryItem(itemId: string): Promise<void> {
  const { error } = await supabase.from("garden_inventory").delete().eq("id", itemId);
  if (error) {
    throw new Error(`Failed to consume harvest: ${error.message}`);
  }
}

export async function getActiveGardenBoost(
  guildId: string,
  userId: string,
  now = new Date(),
): Promise<GardenBoostRecord | null> {
  const { data, error } = await supabase
    .from("garden_active_boosts")
    .select("guild_id,user_id,multiplier,expires_at,source_label")
    .eq("guild_id", guildId)
    .eq("user_id", userId)
    .gt("expires_at", now.toISOString())
    .maybeSingle<BoostRow>();

  if (error) {
    throw new Error(`Failed to fetch garden boost: ${error.message}`);
  }

  return data ? mapBoost(data) : null;
}

export async function upsertGardenBoost(input: {
  guildId: string;
  guildName: string | null;
  guildIconUrl: string | null;
  guildOwnerId: string | null;
  userId: string;
  multiplier: number;
  expiresAt: string;
  sourceLabel: string;
}): Promise<GardenBoostRecord> {
  await ensureGuildExists(input);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("garden_active_boosts")
    .upsert(
      {
        guild_id: input.guildId,
        user_id: input.userId,
        multiplier: input.multiplier,
        expires_at: input.expiresAt,
        source_label: input.sourceLabel,
        updated_at: now,
      },
      { onConflict: "guild_id,user_id" },
    )
    .select("guild_id,user_id,multiplier,expires_at,source_label")
    .single<BoostRow>();

  if (error || !data) {
    throw new Error(`Failed to save garden boost: ${error?.message ?? "unknown error"}`);
  }

  return mapBoost(data);
}
