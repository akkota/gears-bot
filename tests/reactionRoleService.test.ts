import { describe, expect, it } from "vitest";
import { parseMessageId } from "../src/modules/reactionRoles/services/parseMessageId.js";
import { parseReactionRoleCustomId } from "../src/modules/reactionRoles/services/reactionRoleService.js";

describe("parseMessageId", () => {
  it("accepts bare Discord snowflakes of any length >= 17", () => {
    expect(parseMessageId("12345678901234567")).toBe("12345678901234567");
    expect(parseMessageId("123456789012345678")).toBe("123456789012345678");
    expect(parseMessageId("1234567890123456789")).toBe("1234567890123456789");
    // Longer than the old broken maxLength(25) slash-option cap
    expect(parseMessageId("12345678901234567890123456")).toBe(
      "12345678901234567890123456",
    );
  });

  it("trims whitespace around snowflakes", () => {
    expect(parseMessageId("  123456789012345678  ")).toBe("123456789012345678");
  });

  it("extracts the message id from Discord message links", () => {
    const messageId = "111222333444555666";
    expect(
      parseMessageId(
        `https://discord.com/channels/123456789012345678/987654321098765432/${messageId}`,
      ),
    ).toBe(messageId);
    expect(
      parseMessageId(
        `https://ptb.discord.com/channels/1/2/${messageId}`,
      ),
    ).toBe(messageId);
    expect(
      parseMessageId(
        `discord.com/channels/1/2/${messageId}`,
      ),
    ).toBe(messageId);
  });

  it("rejects invalid values", () => {
    expect(parseMessageId("")).toBeNull();
    expect(parseMessageId("12345")).toBeNull();
    expect(parseMessageId("not-an-id")).toBeNull();
    expect(parseMessageId("abc123456789012345678")).toBeNull();
  });
});

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
