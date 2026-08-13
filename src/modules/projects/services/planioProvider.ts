export const DEFAULT_PLANIO_BASE_URL = "https://eswprojects.plan.io";

export interface PlanioCustomField {
  id: number;
  name: string;
  value?: unknown;
}

export interface PlanioProjectPayload {
  id: number;
  identifier: string;
  name: string;
  description?: string | null;
  custom_fields?: PlanioCustomField[];
  updated_on?: string | null;
}

interface PlanioProjectsResponse {
  projects?: PlanioProjectPayload[];
  total_count?: number;
  offset?: number;
  limit?: number;
}

export interface MappedEswProject {
  planioId: number;
  identifier: string;
  name: string;
  chapter: string;
  status: string;
  projectType: string;
  summary: string;
  url: string;
  updatedOn: string | null;
}

const DEFAULT_PAGE_SIZE = 100;

function asString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function asJoinedList(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => asString(item))
      .filter(Boolean)
      .join(", ");
  }

  return asString(value);
}

function customFieldValue(
  fields: PlanioCustomField[] | undefined,
  name: string,
): unknown {
  return fields?.find((field) => field.name === name)?.value;
}

export function buildProjectUrl(baseUrl: string, identifier: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/projects/${identifier}`;
}

export function truncateSummary(text: string, maxLength = 400): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function mapPlanioProject(
  payload: PlanioProjectPayload,
  baseUrl: string,
): MappedEswProject {
  const descriptionImpact = asString(
    customFieldValue(payload.custom_fields, "Project Description & Impact"),
  );
  const summarySource = descriptionImpact || asString(payload.description);

  return {
    planioId: payload.id,
    identifier: payload.identifier,
    name: payload.name.trim(),
    chapter: asJoinedList(customFieldValue(payload.custom_fields, "Chapter")),
    status: asString(customFieldValue(payload.custom_fields, "Project Status")),
    projectType: asJoinedList(
      customFieldValue(payload.custom_fields, "Project Type"),
    ),
    summary: truncateSummary(summarySource),
    url: buildProjectUrl(baseUrl, payload.identifier),
    updatedOn: payload.updated_on ?? null,
  };
}

export interface PlanioProvider {
  fetchAllProjects(): Promise<MappedEswProject[]>;
}

export function createPlanioProvider(
  fetchImpl: typeof fetch = fetch,
  baseUrl: string = DEFAULT_PLANIO_BASE_URL,
): PlanioProvider {
  return {
    async fetchAllProjects(): Promise<MappedEswProject[]> {
      const projects: MappedEswProject[] = [];
      let offset = 0;
      let total = Number.POSITIVE_INFINITY;

      while (offset < total) {
        const url = new URL(`${baseUrl}/projects.json`);
        url.searchParams.set("limit", String(DEFAULT_PAGE_SIZE));
        url.searchParams.set("offset", String(offset));

        const response = await fetchImpl(url);
        if (!response.ok) {
          throw new Error(
            `Plan.io projects request failed with status ${response.status}`,
          );
        }

        const body = (await response.json()) as PlanioProjectsResponse;
        const page = body.projects ?? [];
        total = body.total_count ?? page.length;
        projects.push(
          ...page.map((project) => mapPlanioProject(project, baseUrl)),
        );

        if (page.length === 0) {
          break;
        }

        offset += page.length;
      }

      return projects;
    },
  };
}

export const defaultPlanioProvider = createPlanioProvider();
