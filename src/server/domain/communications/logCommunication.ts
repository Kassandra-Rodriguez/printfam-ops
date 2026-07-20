import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logCommunicationSchema, type LogCommunicationInput } from "@/lib/validation/communications";
import { insertCommunication } from "@/server/data/communications";
import { insertTask } from "@/server/data/tasks";

export type LogCommunicationResult =
  | { status: "logged"; conversationId: string }
  | { status: "error"; error: string };

/**
 * docs/user_flows.md Flow H. `followUpRequired` generates a real, editable
 * task (docs/product_requirements.md §7.8) rather than a dashboard reminder
 * that isn't backed by an actual record — the coding standard against
 * placeholder actions that do nothing applies to "suggested" tasks too.
 */
export async function logCommunication(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: LogCommunicationInput,
): Promise<LogCommunicationResult> {
  const parsed = logCommunicationSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const { conversationId } = await insertCommunication(supabase, organizationId, userId, parsed.data);

    if (parsed.data.followUpRequired) {
      await insertTask(supabase, organizationId, userId, {
        title: `Follow up on ${parsed.data.channel.replace("_", " ")} message`,
        dueDate: parsed.data.followUpDate,
        priority: "normal",
        customerId: parsed.data.customerId,
        orderId: parsed.data.relatedOrderId,
        requestId: parsed.data.relatedRequestId,
        repairTicketId: parsed.data.relatedRepairTicketId,
      });
    }

    return { status: "logged", conversationId };
  } catch (err) {
    console.error("logCommunication failed:", err);
    return { status: "error", error: "Could not save the message. Try again." };
  }
}
