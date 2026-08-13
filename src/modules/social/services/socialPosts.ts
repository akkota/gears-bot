import {
  EmbedBuilder,
  type MessageCreateOptions,
} from "discord.js";
import type { SocialPlatform } from "../../../db/socialPostsRepo.js";

export interface NormalizedSocialPost {
  platform: SocialPlatform;
  externalId: string;
  caption: string;
  permalink: string;
  mediaUrl: string | null;
  postedAt: string | null;
}

export function truncateCaption(caption: string, maxLength = 400): string {
  const normalized = caption.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildSocialAnnouncement(
  post: NormalizedSocialPost,
): MessageCreateOptions {
  const title =
    post.platform === "instagram" ? "New Instagram post" : "New LinkedIn post";
  const embed = new EmbedBuilder()
    .setColor(post.platform === "instagram" ? 0xe1306c : 0x0a66c2)
    .setTitle(title)
    .setURL(post.permalink)
    .setDescription(truncateCaption(post.caption || "Open the post to see the full update."));

  if (post.mediaUrl) {
    embed.setImage(post.mediaUrl);
  }

  if (post.postedAt) {
    const parsed = new Date(post.postedAt);
    if (!Number.isNaN(parsed.getTime())) {
      embed.setTimestamp(parsed);
    }
  }

  return {
    content: post.permalink,
    embeds: [embed],
  };
}

interface InstagramMediaItem {
  id?: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
  timestamp?: string;
  thumbnail_url?: string;
}

interface InstagramMediaResponse {
  data?: InstagramMediaItem[];
}

export function mapInstagramMedia(
  item: InstagramMediaItem,
): NormalizedSocialPost | null {
  if (!item.id || !item.permalink) {
    return null;
  }

  return {
    platform: "instagram",
    externalId: item.id,
    caption: item.caption?.trim() ?? "",
    permalink: item.permalink,
    mediaUrl: item.thumbnail_url || item.media_url || null,
    postedAt: item.timestamp ?? null,
  };
}

export async function fetchInstagramPosts(input: {
  userId: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
}): Promise<NormalizedSocialPost[]> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const url = new URL(`https://graph.instagram.com/${input.userId}/media`);
  url.searchParams.set(
    "fields",
    "id,caption,media_type,media_url,permalink,timestamp,thumbnail_url",
  );
  url.searchParams.set("access_token", input.accessToken);
  url.searchParams.set("limit", "10");

  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`Instagram request failed with status ${response.status}`);
  }

  const body = (await response.json()) as InstagramMediaResponse;
  return (body.data ?? [])
    .map(mapInstagramMedia)
    .filter((item): item is NormalizedSocialPost => item !== null);
}

interface LinkedInPostItem {
  id?: string;
  commentary?: string;
  content?: {
    media?: { id?: string };
  };
}

interface LinkedInPostsResponse {
  elements?: LinkedInPostItem[];
}

export function mapLinkedInPost(item: LinkedInPostItem): NormalizedSocialPost | null {
  if (!item.id) {
    return null;
  }

  return {
    platform: "linkedin",
    externalId: item.id,
    caption: item.commentary?.trim() ?? "",
    permalink: `https://www.linkedin.com/feed/update/${encodeURIComponent(item.id)}/`,
    mediaUrl: null,
    postedAt: null,
  };
}

export async function fetchLinkedInPosts(input: {
  orgUrn: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
}): Promise<NormalizedSocialPost[]> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const url = new URL("https://api.linkedin.com/rest/posts");
  url.searchParams.set("q", "author");
  url.searchParams.set("author", input.orgUrn);
  url.searchParams.set("count", "10");
  url.searchParams.set("sortBy", "LAST_MODIFIED");

  const response = await fetchImpl(url, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Linkedin-Version": "202507",
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });

  if (!response.ok) {
    throw new Error(`LinkedIn request failed with status ${response.status}`);
  }

  const body = (await response.json()) as LinkedInPostsResponse;
  return (body.elements ?? [])
    .map((item) => mapLinkedInPost(item))
    .filter((item): item is NormalizedSocialPost => item !== null);
}
