import {
  countEswProjects,
  listEswProjects,
  upsertEswProjects,
  type EswProjectRecord,
} from "../../../db/eswProjectsRepo.js";
import {
  defaultPlanioProvider,
  type PlanioProvider,
} from "./planioProvider.js";

export const PROJECT_PAGE_SIZE = 5;

export interface ProjectSearchInput {
  query: string;
  chapter?: string | null;
}

function normalizeNeedle(value: string): string {
  return value.trim().toLowerCase();
}

export function tokenizeQuery(query: string): string[] {
  return normalizeNeedle(query)
    .split(/\s+/)
    .map((token) => token.replace(/[^\p{L}\p{N}-]+/gu, ""))
    .filter((token) => token.length > 0);
}

function textContainsToken(haystack: string, token: string): boolean {
  if (haystack.includes(token)) {
    return true;
  }

  const words = haystack.split(/[^a-z0-9]+/);
  return words.some((word) => {
    if (!word) {
      return false;
    }
    if (word.startsWith(token) || token.startsWith(word)) {
      return Math.min(word.length, token.length) >= 3;
    }
    return false;
  });
}

export function projectMatches(
  project: Pick<
    EswProjectRecord,
    "name" | "chapter" | "status" | "projectType" | "summary"
  >,
  query: string,
  chapter?: string | null,
): boolean {
  const chapterFilter = chapter?.trim();
  if (chapterFilter) {
    const chapterHaystack = project.chapter.toLowerCase();
    const chapterTokens = tokenizeQuery(chapterFilter);
    const chapterMatched =
      chapterTokens.length > 0
        ? chapterTokens.every((token) => textContainsToken(chapterHaystack, token))
        : textContainsToken(chapterHaystack, chapterFilter.toLowerCase());
    if (!chapterMatched) {
      return false;
    }
  }

  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) {
    return Boolean(chapterFilter);
  }

  const haystack = [
    project.name,
    project.chapter,
    project.status,
    project.projectType,
    project.summary,
  ]
    .join(" ")
    .toLowerCase();

  return tokens.every((token) => textContainsToken(haystack, token));
}

export async function syncEswProjects(
  provider: PlanioProvider = defaultPlanioProvider,
): Promise<number> {
  const projects = await provider.fetchAllProjects();
  const usable = projects.filter(
    (project) => project.identifier && project.name && project.identifier !== "about-esw",
  );
  await upsertEswProjects(usable);
  return usable.length;
}

export async function searchEswProjects(
  input: ProjectSearchInput,
  provider: PlanioProvider = defaultPlanioProvider,
): Promise<EswProjectRecord[]> {
  const existingCount = await countEswProjects();
  if (existingCount === 0) {
    await syncEswProjects(provider);
  }

  const projects = await listEswProjects();
  return projects.filter((project) =>
    projectMatches(project, input.query, input.chapter),
  );
}

export function paginateProjects<T>(
  projects: T[],
  page: number,
  pageSize = PROJECT_PAGE_SIZE,
): { items: T[]; page: number; totalPages: number; total: number } {
  const total = projects.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const start = safePage * pageSize;
  return {
    items: projects.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    total,
  };
}
