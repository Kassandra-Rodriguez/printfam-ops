import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StatusCategory } from "./workflow";

export type RepairListRow = {
  id: string;
  ticket_number: string;
  device_model: string;
  reported_issue: string;
  diagnostic_fee: number | null;
  final_balance: number;
  created_at: string;
  customer: { id: string; display_name: string } | null;
  status: { id: string; key: string; label: string; category: StatusCategory } | null;
};

const REPAIR_LIST_SELECT =
  "id, ticket_number, device_model, reported_issue, diagnostic_fee, final_balance, created_at, " +
  "customer:customers(id, display_name), status:workflow_statuses(id, key, label, category)";

export async function listRepairTickets(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<RepairListRow[]> {
  const { data, error } = await supabase
    .from("repair_tickets")
    .select(REPAIR_LIST_SELECT)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as RepairListRow[];
}

export async function listRepairTicketsForCustomer(
  supabase: SupabaseClient,
  organizationId: string,
  customerId: string,
): Promise<RepairListRow[]> {
  const { data, error } = await supabase
    .from("repair_tickets")
    .select(REPAIR_LIST_SELECT)
    .eq("organization_id", organizationId)
    .eq("customer_id", customerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as RepairListRow[];
}

export async function getRepairTicket(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("repair_tickets")
    .select(
      `*,
       customer:customers(id, display_name, phone, email),
       status:workflow_statuses(id, key, label, category),
       repair_parts(*),
       repair_diagnostics(id, notes, checklist, logged_at),
       repair_ticket_status_history(id, changed_at, source, note, status:workflow_statuses(label, category)),
       payments(id, amount, method, kind, paid_at, reference_number, notes, created_at),
       tasks(id, title, status, due_date, priority, assigned_user_id, repair_ticket_id, customer_id),
       conversations(id, channel, messages(id, body, direction, occurred_at))`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function nextRepairTicketNumber(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("next_sequence_value", {
    p_organization_id: organizationId,
    p_sequence_key: "repair",
  });
  if (error) throw error;
  return `REP-${data}`;
}

export async function updateRepairTicketStatus(
  supabase: SupabaseClient,
  repairTicketId: string,
  statusId: string,
) {
  const { error } = await supabase
    .from("repair_tickets")
    .update({ status_id: statusId })
    .eq("id", repairTicketId);
  if (error) throw error;
}

export async function updateRepairTicketApproval(
  supabase: SupabaseClient,
  repairTicketId: string,
  approved: boolean,
) {
  const { error } = await supabase
    .from("repair_tickets")
    .update({ customer_approved_at: approved ? new Date().toISOString() : null })
    .eq("id", repairTicketId);
  if (error) throw error;
}

export async function updateRepairTicketFields(
  supabase: SupabaseClient,
  repairTicketId: string,
  fields: {
    deviceModel: string;
    serialNumber?: string;
    reportedIssue: string;
    errorCodes?: string;
    conditionAtIntake?: string;
    accessoriesReceived?: string;
    diagnosticFee?: number;
    identifiedProblem?: string;
    recommendedRepair?: string;
    laborCost?: number;
    warrantyPeriodDays?: number;
    completedSummary?: string;
  },
) {
  const { error } = await supabase
    .from("repair_tickets")
    .update({
      device_model: fields.deviceModel,
      serial_number: fields.serialNumber || null,
      reported_issue: fields.reportedIssue,
      error_codes: fields.errorCodes || null,
      condition_at_intake: fields.conditionAtIntake || null,
      accessories_received: fields.accessoriesReceived || null,
      diagnostic_fee: fields.diagnosticFee ?? null,
      identified_problem: fields.identifiedProblem || null,
      recommended_repair: fields.recommendedRepair || null,
      labor_cost: fields.laborCost ?? null,
      warranty_period_days: fields.warrantyPeriodDays ?? null,
      completed_summary: fields.completedSummary || null,
    })
    .eq("id", repairTicketId);
  if (error) throw error;
}

/** Replaces every part wholesale, same reasoning as replaceOrderItems (small list, rarely huge). */
export async function replaceRepairParts(
  supabase: SupabaseClient,
  organizationId: string,
  repairTicketId: string,
  parts: { partName: string; cost: number; quantity: number; status: string }[],
) {
  const { error: deleteError } = await supabase
    .from("repair_parts")
    .delete()
    .eq("repair_ticket_id", repairTicketId);
  if (deleteError) throw deleteError;

  if (parts.length === 0) return;

  const { error: insertError } = await supabase.from("repair_parts").insert(
    parts.map((part) => ({
      repair_ticket_id: repairTicketId,
      organization_id: organizationId,
      part_name: part.partName,
      cost: part.cost,
      quantity: part.quantity,
      status: part.status,
    })),
  );
  if (insertError) throw insertError;
}

export async function insertRepairDiagnostic(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: { repairTicketId: string; notes?: string; checklist: { item: string; result: string }[] },
) {
  const { error } = await supabase.from("repair_diagnostics").insert({
    repair_ticket_id: input.repairTicketId,
    organization_id: organizationId,
    notes: input.notes || null,
    checklist: input.checklist,
    logged_by: userId,
  });
  if (error) throw error;
}
