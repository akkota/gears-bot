import { describe, expect, it } from "vitest";
import {
  buildProjectUrl,
  mapPlanioProject,
  truncateSummary,
} from "../src/modules/projects/services/planioProvider.js";
import {
  paginateProjects,
  projectMatches,
  tokenizeQuery,
} from "../src/modules/projects/services/projectSearchService.js";
import {
  buildProjectPageCustomId,
  parseProjectPageCustomId,
} from "../src/modules/projects/services/projectSearchUi.js";

describe("planio project mapping", () => {
  it("maps custom fields and builds a public project url", () => {
    const mapped = mapPlanioProject(
      {
        id: 194,
        identifier: "penn-state-autonomous-hydroponic-vertical-farm",
        name: "[Penn State] Autonomous Hydroponic Vertical Farm",
        description: "Short fallback description",
        custom_fields: [
          { id: 2, name: "Chapter", value: ["Pennsylvania State University"] },
          { id: 19, name: "Project Status", value: "In-progress" },
          { id: 6, name: "Project Type", value: ["Food & Water"] },
          {
            id: 15,
            name: "Project Description & Impact",
            value: "A longer impact summary about hydroponics.",
          },
        ],
        updated_on: "2024-05-15T01:06:49Z",
      },
      "https://eswprojects.plan.io",
    );

    expect(mapped.chapter).toBe("Pennsylvania State University");
    expect(mapped.status).toBe("In-progress");
    expect(mapped.projectType).toBe("Food & Water");
    expect(mapped.summary).toContain("hydroponics");
    expect(mapped.url).toBe(
      buildProjectUrl(
        "https://eswprojects.plan.io",
        "penn-state-autonomous-hydroponic-vertical-farm",
      ),
    );
  });

  it("truncates long summaries", () => {
    expect(truncateSummary("a".repeat(50), 20).endsWith("…")).toBe(true);
  });
});

describe("project search matching", () => {
  const hydro = {
    name: "Autonomous Hydroponic Vertical Farm",
    chapter: "Pennsylvania State University",
    status: "In-progress",
    projectType: "Food & Water",
    summary: "Growing strawberries with an ebb-and-flow hydroponic system.",
  };

  it("matches keyword tokens across name, chapter, type, and summary", () => {
    expect(tokenizeQuery("  Hydroponics Farm ")).toEqual(["hydroponics", "farm"]);
    expect(projectMatches(hydro, "hydroponics")).toBe(true);
    expect(projectMatches(hydro, "penn state")).toBe(true);
    expect(projectMatches(hydro, "wind turbine")).toBe(false);
  });

  it("filters by chapter name", () => {
    expect(projectMatches(hydro, "hydroponics", "Penn State")).toBe(true);
    expect(projectMatches(hydro, "hydroponics", "Cornell")).toBe(false);
  });

  it("paginates results", () => {
    const page = paginateProjects([1, 2, 3, 4, 5, 6], 1, 5);
    expect(page.items).toEqual([6]);
    expect(page.page).toBe(1);
    expect(page.totalPages).toBe(2);
  });
});

describe("project search pagination custom ids", () => {
  it("round-trips page state", () => {
    const customId = buildProjectPageCustomId(2, {
      query: "hydroponics",
      chapter: "Penn State",
    });
    expect(customId.length).toBeLessThanOrEqual(100);
    expect(parseProjectPageCustomId(customId)).toEqual({
      page: 2,
      state: { query: "hydroponics", chapter: "Penn State" },
    });
  });
});
