import { notFound } from "next/navigation";
import { requireOrgContext } from "@/server/authz/session";
import { getRepairTicket } from "@/server/data/repairs";
import { EditRepairForm } from "./edit-repair-form";

export default async function EditRepairPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireOrgContext();
  const organizationId = ctx.activeMembership.organization_id;

  const ticket = await getRepairTicket(ctx.supabase, id);
  if (!ticket || ticket.organization_id !== organizationId) notFound();

  const parts = (ticket.repair_parts ?? []) as {
    id: string;
    part_name: string;
    cost: number | null;
    quantity: number;
    status: string;
  }[];

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-lg font-semibold">Edit {ticket.ticket_number}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Status changes and payments are recorded from the repair page, not here.
      </p>
      <div className="mt-6">
        <EditRepairForm
          repairTicketId={ticket.id}
          defaultValues={{
            deviceModel: ticket.device_model,
            serialNumber: ticket.serial_number ?? "",
            reportedIssue: ticket.reported_issue,
            errorCodes: ticket.error_codes ?? "",
            conditionAtIntake: ticket.condition_at_intake ?? "",
            accessoriesReceived: ticket.accessories_received ?? "",
            diagnosticFee: ticket.diagnostic_fee ?? undefined,
            identifiedProblem: ticket.identified_problem ?? "",
            recommendedRepair: ticket.recommended_repair ?? "",
            laborCost: ticket.labor_cost ?? undefined,
            warrantyPeriodDays: ticket.warranty_period_days ?? undefined,
            completedSummary: ticket.completed_summary ?? "",
            parts: parts.map((p) => ({
              partName: p.part_name,
              cost: p.cost ?? 0,
              quantity: p.quantity,
              status: p.status as "needed" | "ordered" | "received" | "installed",
            })),
          }}
        />
      </div>
    </div>
  );
}
