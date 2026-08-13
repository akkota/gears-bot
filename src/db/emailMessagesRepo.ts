import { supabase } from "./supabase.js";

export async function hasSeenEmailMessage(messageId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("email_messages_seen")
    .select("message_id")
    .eq("message_id", messageId)
    .maybeSingle<{ message_id: string }>();

  if (error) {
    throw new Error(`Failed to check seen email: ${error.message}`);
  }

  return Boolean(data);
}

export async function markEmailMessageSeen(input: {
  messageId: string;
  subject: string | null;
  fromAddress: string | null;
  receivedAt: string | null;
}): Promise<void> {
  const { error } = await supabase.from("email_messages_seen").upsert(
    {
      message_id: input.messageId,
      subject: input.subject,
      from_address: input.fromAddress,
      received_at: input.receivedAt,
    },
    { onConflict: "message_id" },
  );

  if (error) {
    throw new Error(`Failed to mark email seen: ${error.message}`);
  }
}
