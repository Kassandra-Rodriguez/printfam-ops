import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StatusCategory } from "./workflow";

export type RequestListRow = {
  id: string;
  title: string;
  source: string;
  estimated_value: number | null;
  follow_up_date: string | null;
  created_at: string;
  customer: { id: string; display_name: string } | null;
  status: { id: string; key: string; label: string; category: StatusCategory } | null;
};

const REQUEST_LIST_SELECT =
  "id, title, source, estimated_value, follow_up_date, created_at, " +
  "customer:customers(id, display_name), status:workflow_statuses(id, key, label, category)";

export async function listRequests(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<RequestListRow[]> {
  const { data, error } = await supabase
    .from("requests")
    .select(REQUEST_LIST_SELECT)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as RequestListRow[];
}

export async function getRequest(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("requests")
    .select(
      `*,
       customer:customers(id, display_name, phone, email),
       status:workflow_statuses(id, key, label, category),
       converted_order:orders!requests_converted_order_id_fkey(id, order_number),
       attachments(id, file_name, created_at),
       tasks(id, title, status, due_date, priority, order_id, customer_id),
       conversations(id, channel, messages(id, body, direction, occurred_at))`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function insertRequest(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  statusId: string,
  input: {
    customerId: string;
    title: string;
    description?: string;
    source: string;
    estimatedValue?: number;
    followUpDate?: string;
  },
) {
  const { data, error } = await supabase
    .from("requests")
    .insert({
      organization_id: organizationId,
      customer_id: input.customerId,
      title: input.title,
      description: input.description || null,
      source: input.source,
      estimated_value: input.estimatedValue ?? null,
      follow_up_date: input.followUpDate || null,
      status_id: statusId,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data as { id: string };
}

export async function updateRequestStatus(
  supabase: SupabaseClient,
  requestId: string,
  statusId: string,
) {
  const { error } = await supabase.from("requests").update({ status_id: statusId }).eq("id", requestId);
  if (error) throw error;
}
