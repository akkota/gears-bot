import type { Client } from "discord.js";
import { env } from "../../../env.js";
import { listGuildSettings } from "../../../db/guildSettingsRepo.js";
import {
  countSeenSocialPosts,
  hasSeenSocialPost,
  markSocialPostSeen,
  type SocialPlatform,
} from "../../../db/socialPostsRepo.js";
import { sendGuildChannelMessage } from "../../../shared/announce.js";
import { startIntervalWorker } from "../../../shared/intervalWorker.js";
import {
  buildSocialAnnouncement,
  fetchInstagramPosts,
  fetchLinkedInPosts,
  type NormalizedSocialPost,
} from "./socialPosts.js";

const SOCIAL_POLL_MS = 10 * 60 * 1000;

let stopHandle: (() => void) | null = null;
let running = false;

function instagramConfigured(): boolean {
  return Boolean(env.INSTAGRAM_ACCESS_TOKEN && env.INSTAGRAM_USER_ID);
}

function linkedInConfigured(): boolean {
  return Boolean(env.LINKEDIN_ACCESS_TOKEN && env.LINKEDIN_ORG_URN);
}

async function bootstrapIfNeeded(
  platform: SocialPlatform,
  posts: NormalizedSocialPost[],
): Promise<boolean> {
  const seenCount = await countSeenSocialPosts(platform);
  if (seenCount > 0) {
    return false;
  }

  for (const post of posts) {
    await markSocialPostSeen({
      platform: post.platform,
      externalId: post.externalId,
      permalink: post.permalink,
      postedAt: post.postedAt,
    });
  }

  console.log(
    `Social worker imported ${posts.length} existing ${platform} post(s) without announcing.`,
  );
  return true;
}

async function announcePosts(
  client: Client,
  posts: NormalizedSocialPost[],
): Promise<void> {
  if (posts.length === 0) {
    return;
  }

  const platform = posts[0].platform;
  if (await bootstrapIfNeeded(platform, posts)) {
    return;
  }

  const settings = await listGuildSettings();
  const channels = settings
    .map((guild) => guild.socialAnnounceChannelId)
    .filter((channelId): channelId is string => Boolean(channelId));

  if (channels.length === 0) {
    return;
  }

  for (const post of posts) {
    if (await hasSeenSocialPost(post.platform, post.externalId)) {
      continue;
    }

    const payload = buildSocialAnnouncement(post);
    for (const channelId of channels) {
      try {
        await sendGuildChannelMessage(client, channelId, payload);
      } catch (error) {
        console.error(
          `Failed to announce ${post.platform} post ${post.externalId}:`,
          error,
        );
      }
    }

    await markSocialPostSeen({
      platform: post.platform,
      externalId: post.externalId,
      permalink: post.permalink,
      postedAt: post.postedAt,
    });
  }
}

async function tick(client: Client): Promise<void> {
  if (running) {
    return;
  }

  running = true;
  try {
    if (instagramConfigured()) {
      const posts = await fetchInstagramPosts({
        userId: env.INSTAGRAM_USER_ID!,
        accessToken: env.INSTAGRAM_ACCESS_TOKEN!,
      });
      await announcePosts(client, posts);
    }

    if (linkedInConfigured()) {
      const posts = await fetchLinkedInPosts({
        orgUrn: env.LINKEDIN_ORG_URN!,
        accessToken: env.LINKEDIN_ACCESS_TOKEN!,
      });
      await announcePosts(client, posts);
    }
  } catch (error) {
    console.error("Social poll failed:", error);
  } finally {
    running = false;
  }
}

export function startSocialWorker(client: Client): void {
  if (stopHandle) {
    return;
  }

  if (!instagramConfigured() && !linkedInConfigured()) {
    console.log("Social worker skipped: Instagram/LinkedIn credentials are not configured.");
    return;
  }

  stopHandle = startIntervalWorker(() => tick(client), SOCIAL_POLL_MS);
}

export function stopSocialWorker(): void {
  stopHandle?.();
  stopHandle = null;
}
