import { supabase } from "./supabase.js";

export type SocialPlatform = "instagram" | "linkedin";

export interface SocialPostRecord {
  platform: SocialPlatform;
  externalId: string;
  permalink: string | null;
  postedAt: string | null;
}

export async function hasSeenSocialPost(
  platform: SocialPlatform,
  externalId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("social_posts_seen")
    .select("external_id")
    .eq("platform", platform)
    .eq("external_id", externalId)
    .maybeSingle<{ external_id: string }>();

  if (error) {
    throw new Error(`Failed to check seen social post: ${error.message}`);
  }

  return Boolean(data);
}

export async function countSeenSocialPosts(platform: SocialPlatform): Promise<number> {
  const { count, error } = await supabase
    .from("social_posts_seen")
    .select("id", { count: "exact", head: true })
    .eq("platform", platform);

  if (error) {
    throw new Error(`Failed to count seen social posts: ${error.message}`);
  }

  return count ?? 0;
}

export async function markSocialPostSeen(input: SocialPostRecord): Promise<void> {
  const { error } = await supabase.from("social_posts_seen").upsert(
    {
      platform: input.platform,
      external_id: input.externalId,
      permalink: input.permalink,
      posted_at: input.postedAt,
    },
    { onConflict: "platform,external_id" },
  );

  if (error) {
    throw new Error(`Failed to mark social post seen: ${error.message}`);
  }
}
