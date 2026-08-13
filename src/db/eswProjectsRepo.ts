import { supabase } from "./supabase.js";

export interface EswProjectRecord {
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

interface EswProjectRow {
  planio_id: number;
  identifier: string;
  name: string;
  chapter: string;
  status: string;
  project_type: string;
  summary: string;
  url: string;
  updated_on: string | null;
}

function mapRow(row: EswProjectRow): EswProjectRecord {
  return {
    planioId: row.planio_id,
    identifier: row.identifier,
    name: row.name,
    chapter: row.chapter,
    status: row.status,
    projectType: row.project_type,
    summary: row.summary,
    url: row.url,
    updatedOn: row.updated_on,
  };
}

export async function upsertEswProjects(
  projects: EswProjectRecord[],
): Promise<void> {
  if (projects.length === 0) {
    return;
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("esw_projects").upsert(
    projects.map((project) => ({
      planio_id: project.planioId,
      identifier: project.identifier,
      name: project.name,
      chapter: project.chapter,
      status: project.status,
      project_type: project.projectType,
      summary: project.summary,
      url: project.url,
      updated_on: project.updatedOn,
      synced_at: now,
    })),
    { onConflict: "planio_id" },
  );

  if (error) {
    throw new Error(`Failed to upsert ESW projects: ${error.message}`);
  }
}

export async function listEswProjects(): Promise<EswProjectRecord[]> {
  const { data, error } = await supabase
    .from("esw_projects")
    .select(
      "planio_id,identifier,name,chapter,status,project_type,summary,url,updated_on",
    )
    .order("name", { ascending: true })
    .returns<EswProjectRow[]>();

  if (error) {
    throw new Error(`Failed to list ESW projects: ${error.message}`);
  }

  return (data ?? []).map(mapRow);
}

export async function countEswProjects(): Promise<number> {
  const { count, error } = await supabase
    .from("esw_projects")
    .select("planio_id", { count: "exact", head: true });

  if (error) {
    throw new Error(`Failed to count ESW projects: ${error.message}`);
  }

  return count ?? 0;
}
