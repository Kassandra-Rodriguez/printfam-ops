import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createRepairTicketSchema, type CreateRepairTicketInput } from "@/lib/validation/repairs";
import { nextRepairTicketNumber } from "@/server/data/repairs";
import { insertPayment, recomputeRepairBalance } from "@/server/data/payments";

export type CreateRepairTicketResult =
  | { status: "created"; repairTicketId: string; ticketNumber: string }
  | { status: "error"; error: string };

/**
 * Backs the repair intake form (docs/screens.md #11) and the mid-lifecycle
 * "device already in the shop" entry path (docs/user_flows.md Flow D, same
 * backfill principle as orders' Flow B) — see createOrder.ts for why this
 * isn't wrapped in a DB transaction.
 */
export async function createRepairTicket(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: CreateRepairTicketInput,
): Promise<CreateRepairTicketResult> {
  const parsed = createRepairTicketSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const hasBackfill = Boolean(data.backfillStatuses && data.backfillStatuses.length > 0);
  const statusEntries = [
    ...(data.backfillStatuses ?? []),
    {
      statusId: data.statusId,
      changedAt: data.currentStatusReachedAt || new Date().toISOString(),
      note: undefined as string | undefined,
    },
  ];
  const historySource = hasBackfill || data.currentStatusReachedAt ? "manual_backfill" : "live";

  try {
    const ticketNumber = await nextRepairTicketNumber(supabase, organizationId);

    const { data: ticket, error: ticketError } = await supabase
      .from("repair_tickets")
      .insert({
        organization_id: organizationId,
        ticket_number: ticketNumber,
        customer_id: data.customerId,
        device_model: data.deviceModel,
        serial_number: data.serialNumber || null,
        reported_issue: data.reportedIssue,
        error_codes: data.errorCodes || null,
        intake_date: data.intakeDate,
        condition_at_intake: data.conditionAtIntake || null,
        accessories_received: data.accessoriesReceived || null,
        status_id: data.statusId,
        diagnostic_fee: data.diagnosticFee ?? null,
        final_balance: data.diagnosticFee ?? 0,
        created_by: userId,
      })
      .select("id, ticket_number")
      .single();

    if (ticketError || !ticket) {
      console.error("createRepairTicket: ticket insert failed:", ticketError);
      return { status: "error", error: "Could not create the repair ticket. Try again." };
    }

    const { error: historyError } = await supabase.from("repair_ticket_status_history").insert(
      statusEntries.map((entry) => ({
        repair_ticket_id: ticket.id,
        organization_id: organizationId,
        status_id: entry.statusId,
        changed_at: entry.changedAt,
        changed_by: userId,
        source: historySource,
        note: entry.note || null,
      })),
    );
    if (historyError) {
      console.error("createRepairTicket: status history insert failed:", historyError);
      return { status: "error", error: "Ticket was created, but its status history failed to save." };
    }

    if (data.backfillPayments && data.backfillPayments.length > 0) {
      for (const payment of data.backfillPayments) {
        await insertPayment(supabase, {
          organizationId,
          customerId: data.customerId,
          repairTicketId: ticket.id,
          amount: payment.amount,
          method: payment.method,
          kind: payment.kind,
          paidAt: payment.paidAt,
          referenceNumber: payment.referenceNumber,
          notes: payment.notes,
        });
      }
      await recomputeRepairBalance(supabase, ticket.id);
    }

    return { status: "created", repairTicketId: ticket.id, ticketNumber: ticket.ticket_number };
  } catch (err) {
    console.error("createRepairTicket failed:", err);
    return { status: "error", error: "Could not create the repair ticket. Try again." };
  }
}
