import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CommunicationListRow = {
  id: string;
  body: string;
  direction: string;
  occurred_at: string;
  follow_up_required: boolean;
  follow_up_date: string | null;
  conversation: {
    id: string;
    channel: string;
    related_request_id: string | null;
    related_order_id: string | null;
    related_repair_ticket_id: string | null;
    customer: { id: string; display_name: string } | null;
  } | null;
};

export async function listRecentCommunications(
  supabase: SupabaseClient,
  organizationId: string,
  limit = 100,
): Promise<CommunicationListRow[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(
      `id, body, direction, occurred_at, follow_up_required, follow_up_date,
       conversation:conversations(id, channel, related_request_id, related_order_id, related_repair_ticket_id, customer:customers(id, display_name))`,
    )
    .eq("organization_id", organizationId)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as CommunicationListRow[];
}

/**
 * Each log action creates its own conversation rather than threading into an
 * existing one — matching-and-merging conversations by customer/channel/
 * related-record is a reasonable Phase 4+ refinement, not required for the
 * inbox to be useful today (every message still lists correctly either way).
 */
export async function insertCommunication(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: {
    customerId: string;
    channel: string;
    direction: string;
    body: string;
    occurredAt?: string;
    relatedRequestId?: string;
    relatedOrderId?: string;
    relatedRepairTicketId?: string;
    followUpRequired: boolean;
    followUpDate?: string;
  },
) {
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .insert({
      organization_id: organizationId,
      customer_id: input.customerId,
      channel: input.channel,
      related_request_id: input.relatedRequestId ?? null,
      related_order_id: input.relatedOrderId ?? null,
      related_repair_ticket_id: input.relatedRepairTicketId ?? null,
    })
    .select("id")
    .single();
  if (conversationError) throw conversationError;

  const { error: messageError } = await supabase.from("messages").insert({
    conversation_id: conversation.id,
    organization_id: organizationId,
    direction: input.direction,
    body: input.body,
    occurred_at: input.occurredAt || new Date().toISOString(),
    recorded_by: userId,
    sent_by_customer: false,
    follow_up_required: input.followUpRequired,
    follow_up_date: input.followUpDate || null,
  });
  if (messageError) throw messageError;

  return { conversationId: conversation.id as string };
}
