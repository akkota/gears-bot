import { describe, expect, it } from "vitest";
import { parseReactionRoleCustomId } from "../src/modules/reactionRoles/services/reactionRoleService.js";

describe("reaction role service helpers", () => {
  it("parses valid button custom id", () => {
    expect(parseReactionRoleCustomId("rr:toggle:panel-uuid:123456789012345678")).toEqual({
      panelId: "panel-uuid",
      roleId: "123456789012345678",
    });
  });

  it("returns null for invalid custom ids", () => {
    expect(parseReactionRoleCustomId("rr:other:panel:role")).toBeNull();
    expect(parseReactionRoleCustomId("rr:toggle:missing-role")).toBeNull();
    expect(parseReactionRoleCustomId("not-reaction-role")).toBeNull();
  });
});
