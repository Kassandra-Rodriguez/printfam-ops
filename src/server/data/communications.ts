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

export type ThreadCustomerRow = {
  id: string;
  display_name: string;
  lastMessage: string;
  lastMessageAt: string;
  lastChannel: string;
};

/**
 * Groups every message by customer for the chat-style inbox — the schema
 * has no "conversation thread" concept spanning channels, so this is
 * computed here rather than queried directly, same "small team, small
 * table" reasoning as server/data/reports.ts.
 */
export async function listCustomersWithRecentMessage(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<ThreadCustomerRow[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("body, occurred_at, conversation:conversations!inner(channel, customer:customers(id, display_name))")
    .eq("organization_id", organizationId)
    .order("occurred_at", { ascending: false });
  if (error) throw error;

  const byCustomer = new Map<string, ThreadCustomerRow>();
  for (const row of (data ?? []) as unknown as {
    body: string;
    occurred_at: string;
    conversation: { channel: string; customer: { id: string; display_name: string } | null } | null;
  }[]) {
    const customer = row.conversation?.customer;
    if (!customer || byCustomer.has(customer.id)) continue;
    byCustomer.set(customer.id, {
      id: customer.id,
      display_name: customer.display_name,
      lastMessage: row.body,
      lastMessageAt: row.occurred_at,
      lastChannel: row.conversation?.channel ?? "other",
    });
  }
  return [...byCustomer.values()];
}

export type ThreadMessageRow = {
  id: string;
  body: string;
  direction: string;
  occurred_at: string;
  sent_by_customer: boolean;
  channel: string;
};

export async function listMessagesForCustomerThread(
  supabase: SupabaseClient,
  organizationId: string,
  customerId: string,
): Promise<ThreadMessageRow[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("channel, messages(id, body, direction, occurred_at, sent_by_customer)")
    .eq("organization_id", organizationId)
    .eq("customer_id", customerId);
  if (error) throw error;

  return ((data ?? []) as unknown as { channel: string; messages: Omit<ThreadMessageRow, "channel">[] }[])
    .flatMap((c) => c.messages.map((m) => ({ ...m, channel: c.channel })))
    .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
}

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

/**
 * docs/user_flows.md Flow J: a message the customer typed in the portal.
 * `channel: 'other'` — the channel enum models external channels
 * (Instagram/text/email/...); the portal itself isn't one of those, and the
 * source spec doesn't define a dedicated value for it. `recorded_by` stays
 * null and `sent_by_customer: true` is the actor tag activity_logs-style
 * code elsewhere uses (docs/security.md #4.6).
 */
export async function insertPortalMessage(
  supabase: SupabaseClient,
  organizationId: string,
  input: {
    customerId: string;
    body: string;
    relatedOrderId?: string;
    relatedRepairTicketId?: string;
  },
) {
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .insert({
      organization_id: organizationId,
      customer_id: input.customerId,
      channel: "other",
      related_order_id: input.relatedOrderId ?? null,
      related_repair_ticket_id: input.relatedRepairTicketId ?? null,
    })
    .select("id")
    .single();
  if (conversationError) throw conversationError;

  const { error: messageError } = await supabase.from("messages").insert({
    conversation_id: conversation.id,
    organization_id: organizationId,
    direction: "incoming",
    body: input.body,
    occurred_at: new Date().toISOString(),
    recorded_by: null,
    sent_by_customer: true,
    follow_up_required: false,
  });
  if (messageError) throw messageError;
}
