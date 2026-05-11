import type { Guild, TextBasedChannel, User } from "discord.js";
import {
  createReactionRoleMessage,
  getReactionRoleMessage,
} from "../../../db/reactionRolesRepo.js";
export { parseMessageId } from "./validateMessageId.js";

export interface SetupReactionRoleInput {
  guild: Guild;
  channel: TextBasedChannel & { id: string };
  messageId: string;
  title: string | null;
  actor: User;
}

export type SetupReactionRoleResult =
  | { ok: true; recordId: string }
  | { ok: false; errorMessage: string };

export async function setupReactionRoleMessage(
  input: SetupReactionRoleInput,
): Promise<SetupReactionRoleResult> {
  const existing = await getReactionRoleMessage(
    input.guild.id,
    input.messageId,
  );

  if (existing) {
    return {
      ok: false,
      errorMessage:
        "That message is already registered as a reaction role panel in this server.",
    };
  }

  const record = await createReactionRoleMessage({
    guildId: input.guild.id,
    channelId: input.channel.id,
    messageId: input.messageId,
    title: input.title,
    createdByUserId: input.actor.id,
  });

  return { ok: true, recordId: record.id };
}
