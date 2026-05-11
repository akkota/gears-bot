import { describe, expect, it } from "vitest";
import {
  canPersistRoleConfigurationAfterSync,
  getUnsetGuildSettingsUpdate,
  resolveStaffRoleStrategy,
  validateSetRoleInputs,
} from "../src/modules/admin/services/guildSettingsService.js";

describe("staff role setup strategy", () => {
  it("uses selected role when explicitly provided", () => {
    expect(
      resolveStaffRoleStrategy({
        selectedRoleId: "role-selected",
        customNameRoleId: "role-custom-name",
        configuredRoleId: "role-configured",
        fallbackNamedRoleId: "role-named",
      }),
    ).toEqual({
      action: "use-selected",
      roleId: "role-selected",
    });
  });

  it("reuses custom-name role before configured role", () => {
    expect(
      resolveStaffRoleStrategy({
        customNameRoleId: "role-custom-name",
        configuredRoleId: "role-configured",
        fallbackNamedRoleId: "role-named",
      }),
    ).toEqual({
      action: "use-custom-name",
      roleId: "role-custom-name",
    });
  });

  it("reuses configured role before fallback name", () => {
    expect(
      resolveStaffRoleStrategy({
        configuredRoleId: "role-configured",
        fallbackNamedRoleId: "role-named",
      }),
    ).toEqual({
      action: "use-configured",
      roleId: "role-configured",
    });
  });

  it("reuses default-name role instead of creating a duplicate", () => {
    expect(
      resolveStaffRoleStrategy({
        selectedRoleId: null,
        customNameRoleId: null,
        configuredRoleId: null,
        fallbackNamedRoleId: "role-named",
      }),
    ).toEqual({
      action: "use-fallback-name",
      roleId: "role-named",
    });
  });

  it("creates default role only when no selected/configured/named role exists", () => {
    expect(
      resolveStaffRoleStrategy({
        selectedRoleId: null,
        customNameRoleId: null,
        configuredRoleId: null,
        fallbackNamedRoleId: null,
      }),
    ).toEqual({
      action: "create-with-name",
      roleId: null,
    });
  });
});

describe("set role input validation", () => {
  it("rejects when both role and name are provided", () => {
    expect(
      validateSetRoleInputs({
        selectedRoleId: "role-1",
        customName: "Custom",
      }),
    ).toEqual({
      ok: false,
      normalizedName: null,
      errorMessage: "Provide either role or name, not both.",
    });
  });

  it("rejects empty custom name", () => {
    expect(
      validateSetRoleInputs({
        customName: "    ",
      }),
    ).toEqual({
      ok: false,
      normalizedName: null,
      errorMessage: "Role name cannot be empty.",
    });
  });

  it("rejects names over Discord length limit", () => {
    expect(
      validateSetRoleInputs({
        customName: "a".repeat(101),
      }),
    ).toEqual({
      ok: false,
      normalizedName: null,
      errorMessage: "Role name must be 100 characters or fewer.",
    });
  });

  it("accepts and trims custom name", () => {
    expect(
      validateSetRoleInputs({
        customName: "  Student Mod Team  ",
      }),
    ).toEqual({
      ok: true,
      normalizedName: "Student Mod Team",
    });
  });

  it("accepts null name when role is provided", () => {
    expect(
      validateSetRoleInputs({
        selectedRoleId: "role-1",
        customName: null,
      }),
    ).toEqual({
      ok: true,
      normalizedName: null,
    });
  });
});

describe("sync gating", () => {
  it("allows persistence only when permission sync succeeds", () => {
    expect(canPersistRoleConfigurationAfterSync(true)).toBe(true);
    expect(canPersistRoleConfigurationAfterSync(false)).toBe(false);
  });
});

describe("staff role unset payloads", () => {
  it("clears only admin setting when unsetting admin", () => {
    expect(getUnsetGuildSettingsUpdate("admin")).toEqual({
      adminRoleId: null,
    });
  });

  it("clears only srmod setting when unsetting srmod", () => {
    expect(getUnsetGuildSettingsUpdate("srmod")).toEqual({
      srmodRoleId: null,
    });
  });

  it("clears only mod setting when unsetting mod", () => {
    expect(getUnsetGuildSettingsUpdate("mod")).toEqual({
      modRoleId: null,
    });
  });
});
