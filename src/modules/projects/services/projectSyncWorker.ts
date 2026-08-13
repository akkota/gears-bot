import { env } from "../../../env.js";
import { startIntervalWorker } from "../../../shared/intervalWorker.js";
import { createPlanioProvider } from "./planioProvider.js";
import { syncEswProjects } from "./projectSearchService.js";

const PROJECT_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

let stopHandle: (() => void) | null = null;
let running = false;

async function tick(): Promise<void> {
  if (running) {
    return;
  }

  running = true;
  try {
    const count = await syncEswProjects(
      createPlanioProvider(fetch, env.PLANIO_BASE_URL),
    );
    console.log(`Synced ${count} ESW projects from Plan.io.`);
  } catch (error) {
    console.error("ESW project sync failed:", error);
  } finally {
    running = false;
  }
}

export function startProjectSyncWorker(): void {
  if (stopHandle) {
    return;
  }

  stopHandle = startIntervalWorker(tick, PROJECT_SYNC_INTERVAL_MS);
}

export function stopProjectSyncWorker(): void {
  stopHandle?.();
  stopHandle = null;
}
