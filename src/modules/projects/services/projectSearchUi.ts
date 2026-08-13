import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import type { EswProjectRecord } from "../../../db/eswProjectsRepo.js";
import { PROJECT_PAGE_SIZE } from "./projectSearchService.js";

const CUSTOM_ID_PREFIX = "proj:";

export interface ProjectSearchState {
  query: string;
  chapter: string | null;
}

const searchCache = new Map<string, ProjectSearchState>();

function encodePayload(state: ProjectSearchState): string {
  return Buffer.from(
    JSON.stringify({ q: state.query, c: state.chapter ?? "" }),
    "utf8",
  ).toString("base64url");
}

function decodePayload(encoded: string): ProjectSearchState | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as { q?: unknown; c?: unknown };
    if (typeof parsed.q !== "string") {
      return null;
    }
    return {
      query: parsed.q,
      chapter: typeof parsed.c === "string" && parsed.c.length > 0 ? parsed.c : null,
    };
  } catch {
    return searchCache.get(encoded) ?? null;
  }
}

function cacheToken(state: ProjectSearchState): string {
  const token = encodePayload(state).slice(0, 24);
  searchCache.set(token, state);
  return token;
}

export function parseProjectPageCustomId(
  customId: string,
): { page: number; state: ProjectSearchState } | null {
  if (!customId.startsWith(CUSTOM_ID_PREFIX)) {
    return null;
  }

  const parts = customId.split(":");
  if (parts.length < 4) {
    return null;
  }

  const kind = parts[1];
  const page = Number.parseInt(parts[2] ?? "", 10);
  const payload = parts.slice(3).join(":");
  if (!Number.isFinite(page) || page < 0 || !payload) {
    return null;
  }

  const state =
    kind === "t" ? (searchCache.get(payload) ?? null) : decodePayload(payload);
  if (!state) {
    return null;
  }

  return { page, state };
}

export function buildProjectPageCustomId(
  page: number,
  state: ProjectSearchState,
): string {
  const encoded = encodePayload(state);
  const direct = `${CUSTOM_ID_PREFIX}p:${page}:${encoded}`;
  if (direct.length <= 100) {
    return direct;
  }

  return `${CUSTOM_ID_PREFIX}t:${page}:${cacheToken(state)}`;
}

export function buildProjectSearchMessage(
  results: EswProjectRecord[],
  page: number,
  total: number,
  totalPages: number,
  state: ProjectSearchState,
): {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
} {
  const embed = new EmbedBuilder()
    .setColor(0x2f9e44)
    .setTitle("ESW project search")
    .setDescription(
      total === 0
        ? "No matching projects found."
        : `Found **${total}** project${total === 1 ? "" : "s"} for \`${state.query}\`${
            state.chapter ? ` in chapter \`${state.chapter}\`` : ""
          }.`,
    );

  if (results.length > 0) {
    embed.addFields(
      results.map((project, index) => {
        const chapter = project.chapter || "Unknown chapter";
        const status = project.status || "Unknown status";
        const summary = project.summary || "No summary available.";
        return {
          name: `${page * PROJECT_PAGE_SIZE + index + 1}. ${project.name}`,
          value: `**${chapter}** · ${status}\n${summary.slice(0, 220)}${
            summary.length > 220 ? "…" : ""
          }`,
        };
      }),
    );
  }

  if (totalPages > 1) {
    embed.setFooter({ text: `Page ${page + 1} of ${totalPages}` });
  }

  const linkRow = new ActionRowBuilder<ButtonBuilder>();
  for (const project of results) {
    if (linkRow.components.length >= 5) {
      break;
    }
    linkRow.addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel(project.name.slice(0, 80))
        .setURL(project.url),
    );
  }

  const components: ActionRowBuilder<ButtonBuilder>[] = [];
  if (linkRow.components.length > 0) {
    components.push(linkRow);
  }

  if (totalPages > 1) {
    const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildProjectPageCustomId(Math.max(page - 1, 0), state))
        .setLabel("Previous")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page <= 0),
      new ButtonBuilder()
        .setCustomId(buildProjectPageCustomId(Math.min(page + 1, totalPages - 1), state))
        .setLabel("Next")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= totalPages - 1),
    );
    components.push(navRow);
  }

  return { embeds: [embed], components };
}
