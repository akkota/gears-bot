import type { Guild, GuildMember } from "discord.js";
import { describe, expect, it } from "vitest";
import {
  getHigherPermissionLevel,
  getMemberPermissionLevel,
  getPermissionRank,
  hasConfiguredAdminRole,
  hasLevel,
  hasRequiredPermissionLevel,
  isServerOwnerForAdminRoleConfig,
  isOwnerOrConfiguredAdmin,
  type PermissionLevel,
} from "../src/shared/permissions.js";

describe("permission ranking", () => {
  const orderedLevels: PermissionLevel[] = [
    "everyone",
    "mod",
    "srmod",
    "admin",
    "discord_admin",
  ];

  it("assigns increasing rank based on hierarchy order", () => {
    orderedLevels.forEach((level, index) => {
      expect(getPermissionRank(level)).toBe(index);
    });
  });

  it("returns true when actual level meets required level", () => {
    expect(hasLevel("admin", "mod")).toBe(true);
    expect(hasLevel("discord_admin", "admin")).toBe(true);
    expect(hasLevel("srmod", "srmod")).toBe(true);
  });

  it("returns false when actual level is below requirement", () => {
    expect(hasLevel("mod", "admin")).toBe(false);
    expect(hasLevel("everyone", "mod")).toBe(false);
  });

  it("keeps backward compatibility alias for hasRequiredPermissionLevel", () => {
    expect(hasRequiredPermissionLevel("admin", "mod")).toBe(true);
    expect(hasRequiredPermissionLevel("mod", "admin")).toBe(false);
  });

  it("returns the higher permission level between two levels", () => {
    expect(getHigherPermissionLevel("admin", "srmod")).toBe("admin");
    expect(getHigherPermissionLevel("mod", "discord_admin")).toBe(
      "discord_admin",
    );
  });

  function createMockMember(
    options: { id?: string; isDiscordAdmin: boolean; roleIds: string[] },
  ): GuildMember {
    const roleSet = new Set(options.roleIds);
    return {
      id: options.id ?? "member-1",
      permissions: {
        has: () => options.isDiscordAdmin,
      },
      roles: {
        cache: {
          has: (roleId: string) => roleSet.has(roleId),
          keys: () => options.roleIds.values(),
        },
      },
    } as unknown as GuildMember;
  }

  const settings = {
    adminRoleId: "role-admin",
    srmodRoleId: "role-srmod",
    modRoleId: "role-mod",
  };

  it("maps Discord administrator to discord_admin", () => {
    const member = createMockMember({
      isDiscordAdmin: true,
      roleIds: [],
    });

    expect(getMemberPermissionLevel(member, settings)).toBe("discord_admin");
  });

  it("resolves the highest configured matching role", () => {
    const member = createMockMember({
      isDiscordAdmin: false,
      roleIds: ["role-mod", "role-srmod"],
    });

    expect(getMemberPermissionLevel(member, settings)).toBe("srmod");
  });

  it("resolves everyone when no configured roles match", () => {
    const member = createMockMember({
      isDiscordAdmin: false,
      roleIds: ["role-random"],
    });

    expect(getMemberPermissionLevel(member, settings)).toBe("everyone");
  });

  it("handles missing guild settings as everyone for non-admin users", () => {
    const member = createMockMember({
      isDiscordAdmin: false,
      roleIds: ["role-admin"],
    });

    expect(getMemberPermissionLevel(member, null)).toBe("everyone");
  });

  it("matches configured admin role explicitly", () => {
    const member = createMockMember({
      isDiscordAdmin: false,
      roleIds: ["role-admin"],
    });

    expect(hasConfiguredAdminRole(member, settings)).toBe(true);
  });

  it("does not treat Discord administrator alone as configured admin role", () => {
    const member = createMockMember({
      isDiscordAdmin: true,
      roleIds: [],
    });

    expect(hasConfiguredAdminRole(member, settings)).toBe(false);
  });

  it("allows server owner in owner-or-configured-admin check", () => {
    const member = createMockMember({
      id: "owner-1",
      isDiscordAdmin: false,
      roleIds: [],
    });

    const guild = {
      ownerId: "owner-1",
    } as Guild;

    expect(isOwnerOrConfiguredAdmin(guild, member, settings)).toBe(true);
  });

  it("allows server owner for admin role configure/delete", () => {
    const member = createMockMember({
      id: "owner-1",
      isDiscordAdmin: false,
      roleIds: [],
    });

    const guild = {
      ownerId: "owner-1",
    } as Guild;

    expect(isServerOwnerForAdminRoleConfig(guild, member)).toBe(true);
  });

  it("allows configured admin role in owner-or-configured-admin check", () => {
    const member = createMockMember({
      id: "member-2",
      isDiscordAdmin: false,
      roleIds: ["role-admin"],
    });

    const guild = {
      ownerId: "owner-1",
    } as Guild;

    expect(isOwnerOrConfiguredAdmin(guild, member, settings)).toBe(true);
  });

  it("rejects non-owner without configured admin role", () => {
    const member = createMockMember({
      id: "member-3",
      isDiscordAdmin: true,
      roleIds: ["random-role"],
    });

    const guild = {
      ownerId: "owner-1",
    } as Guild;

    expect(isOwnerOrConfiguredAdmin(guild, member, settings)).toBe(false);
  });

  it("rejects non-owner for admin role configure/delete", () => {
    const member = createMockMember({
      id: "member-4",
      isDiscordAdmin: true,
      roleIds: ["role-admin"],
    });

    const guild = {
      ownerId: "owner-1",
    } as Guild;

    expect(isServerOwnerForAdminRoleConfig(guild, member)).toBe(false);
  });
});
