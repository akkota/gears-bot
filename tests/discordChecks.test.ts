import type { Guild, GuildMember, Role } from "discord.js";
import { describe, expect, it } from "vitest";
import {
  checkActorVsTargetHierarchy,
  checkBotVsTargetHierarchy,
} from "../src/shared/discordChecks.js";

function createRole(position: number): Role {
  return {
    comparePositionTo: (other: Role) => position - (other as unknown as { _pos: number })._pos,
    _pos: position,
  } as unknown as Role;
}

function createMember(id: string, highestRolePosition: number): GuildMember {
  return {
    id,
    roles: {
      highest: createRole(highestRolePosition),
    },
  } as unknown as GuildMember;
}

function createGuild(ownerId: string): Guild {
  return {
    ownerId,
  } as Guild;
}

describe("actor vs target moderation hierarchy", () => {
  it("blocks non-owner actor from moderating equal role position", () => {
    const guild = createGuild("owner-1");
    const actor = createMember("actor-1", 10);
    const target = createMember("target-1", 10);

    const result = checkActorVsTargetHierarchy({
      guild,
      actor,
      target,
      actionName: "warn",
    });

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toContain("equal or higher role");
  });

  it("blocks non-owner actor from moderating higher role position", () => {
    const guild = createGuild("owner-1");
    const actor = createMember("actor-1", 5);
    const target = createMember("target-1", 15);

    const result = checkActorVsTargetHierarchy({
      guild,
      actor,
      target,
      actionName: "mute",
    });

    expect(result.ok).toBe(false);
  });

  it("allows server owner to bypass actor-vs-target hierarchy", () => {
    const guild = createGuild("owner-1");
    const actor = createMember("owner-1", 1);
    const target = createMember("target-1", 100);

    const result = checkActorVsTargetHierarchy({
      guild,
      actor,
      target,
      actionName: "ban",
    });

    expect(result.ok).toBe(true);
  });

  it("does not allow Discord-admin-only bypass unless owner", () => {
    const guild = createGuild("owner-1");
    const actor = createMember("actor-admin-not-owner", 5);
    const target = createMember("target-1", 6);

    const result = checkActorVsTargetHierarchy({
      guild,
      actor,
      target,
      actionName: "kick",
    });

    expect(result.ok).toBe(false);
  });

  it("skips actor-vs-target hierarchy when target is ID-only (ban/massban)", () => {
    const guild = createGuild("owner-1");
    const actor = createMember("actor-1", 1);

    const result = checkActorVsTargetHierarchy({
      guild,
      actor,
      target: null,
      actionName: "ban",
      targetResolvableByIdOnly: true,
    });

    expect(result.ok).toBe(true);
  });
});

describe("bot vs target moderation hierarchy", () => {
  it("blocks bot when target is equal role position", () => {
    const guild = createGuild("owner-1");
    const botMember = createMember("bot-1", 20);
    const target = createMember("target-1", 20);

    const result = checkBotVsTargetHierarchy({
      guild,
      botMember,
      target,
      actionName: "kick",
    });

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toContain("role hierarchy");
  });

  it("allows bot when target is below bot role", () => {
    const guild = createGuild("owner-1");
    const botMember = createMember("bot-1", 50);
    const target = createMember("target-1", 10);

    const result = checkBotVsTargetHierarchy({
      guild,
      botMember,
      target,
      actionName: "mute",
    });

    expect(result.ok).toBe(true);
  });

  it("skips bot-vs-target hierarchy when target is ID-only", () => {
    const guild = createGuild("owner-1");
    const botMember = createMember("bot-1", 1);

    const result = checkBotVsTargetHierarchy({
      guild,
      botMember,
      target: null,
      actionName: "massban",
      targetResolvableByIdOnly: true,
    });

    expect(result.ok).toBe(true);
  });
});
