import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { AddTaskForm } from "@/components/tasks/add-task-form";
import { TaskRow } from "@/components/tasks/task-row";
import { LogCommunicationDialog } from "@/components/communications/log-communication-dialog";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { requireOrgContext } from "@/server/authz/session";
import { getRepairTicket } from "@/server/data/repairs";
import { getWorkflowStatuses } from "@/server/data/workflow";
import { listAttachmentsForRepairTicket, getAttachmentSignedUrl } from "@/server/data/attachments";
import { listProofsForRepairTicket } from "@/server/data/proofs";
import { buildProofViews } from "@/server/domain/proofs/buildProofViews";
import { ProofsSection } from "@/components/proofs/proofs-section";
import { RepairStatusControl } from "./status-control";
import { RecordRepairPaymentDialog } from "./record-payment-dialog";
import { RepairFiles, type RepairFileRow } from "./repair-files";
import { AddDiagnosticForm } from "./add-diagnostic-form";
import { RepairApprovalControl } from "./approval-control";

const PAYMENT_KIND_LABELS: Record<string, string> = {
  deposit: "Deposit",
  final: "Final payment",
  full: "Full payment",
  refund: "Refund",
};

const PART_STATUS_LABELS: Record<string, string> = {
  needed: "Needed",
  ordered: "Ordered",
  received: "Received",
  installed: "Installed",
};

export default async function RepairDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireOrgContext();
  const organizationId = ctx.activeMembership.organization_id;

  const ticket = await getRepairTicket(ctx.supabase, id);
  if (!ticket || ticket.organization_id !== organizationId) notFound();

  const [statuses, attachments, proofs] = await Promise.all([
    getWorkflowStatuses(ctx.supabase, organizationId, "repair_ticket"),
    listAttachmentsForRepairTicket(ctx.supabase, organizationId, ticket.id),
    listProofsForRepairTicket(ctx.supabase, organizationId, ticket.id).then((rows) =>
      buildProofViews(ctx.supabase, rows),
    ),
  ]);

  const files: RepairFileRow[] = await Promise.all(
    attachments.map(async (a) => ({
      id: a.id,
      file_name: a.file_name,
      file_type: a.file_type,
      description: a.description,
      created_at: a.created_at,
      signedUrl: await getAttachmentSignedUrl(ctx.supabase, a.storage_path),
    })),
  );

  const parts = (ticket.repair_parts ?? []) as {
    id: string;
    part_name: string;
    cost: number | null;
    quantity: number;
    status: string;
  }[];
  const diagnostics = (ticket.repair_diagnostics ?? []) as {
    id: string;
    notes: string | null;
    checklist: { item: string; result: string }[];
    logged_at: string;
  }[];
  const history = (ticket.repair_ticket_status_history ?? []) as {
    id: string;
    changed_at: string;
    source: string;
    note: string | null;
    status: { label: string; category: "neutral" | "info" | "warning" | "danger" | "success" } | null;
  }[];
  const payments = (ticket.payments ?? []) as {
    id: string;
    amount: number;
    method: string;
    kind: string;
    paid_at: string;
    reference_number: string | null;
    notes: string | null;
  }[];
  const tasks = ((ticket.tasks ?? []) as { id: string; status: string }[])
    .filter((t) => t.status === "open")
    .map((t) => t as unknown as Parameters<typeof TaskRow>[0]["task"]);
  const conversations = (ticket.conversations ?? []) as {
    id: string;
    channel: string;
    messages: { id: string; body: string; direction: string; occurred_at: string }[];
  }[];
  const messages = conversations
    .flatMap((c) => c.messages.map((m) => ({ ...m, channel: c.channel })))
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">{ticket.ticket_number}</p>
          <h1 className="text-lg font-semibold">{ticket.device_model}</h1>
          <Link
            href={`/customers/${ticket.customer?.id}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            {ticket.customer?.display_name}
          </Link>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <RepairStatusControl
              repairTicketId={ticket.id}
              currentStatusId={ticket.status_id}
              statuses={statuses}
            />
            <Button asChild size="sm" variant="outline">
              <Link href={`/repairs/${ticket.id}/edit`}>Edit</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="col-span-2 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Reported issue</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <p className="whitespace-pre-wrap">{ticket.reported_issue}</p>
              {ticket.error_codes ? (
                <Row label="Error codes" value={ticket.error_codes} />
              ) : null}
              {ticket.condition_at_intake ? (
                <Row label="Condition at intake" value={ticket.condition_at_intake} />
              ) : null}
              {ticket.accessories_received ? (
                <Row label="Accessories received" value={ticket.accessories_received} />
              ) : null}
              {ticket.serial_number ? <Row label="Serial number" value={ticket.serial_number} /> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Diagnosis &amp; recommendation</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {ticket.identified_problem ? (
                <Row label="Identified problem" value={ticket.identified_problem} />
              ) : null}
              {ticket.recommended_repair ? (
                <div>
                  <p className="text-muted-foreground">Recommended repair</p>
                  <p className="mt-0.5 whitespace-pre-wrap">{ticket.recommended_repair}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">No recommendation recorded yet — add one via Edit.</p>
              )}
              {ticket.recommended_repair ? (
                <RepairApprovalControl
                  repairTicketId={ticket.id}
                  customerApprovedAt={ticket.customer_approved_at}
                />
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Diagnostics &amp; testing log</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <AddDiagnosticForm repairTicketId={ticket.id} />
              {diagnostics.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
              ) : (
                diagnostics
                  .slice()
                  .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())
                  .map((d) => (
                    <div key={d.id} className="rounded-md border p-2.5 text-sm">
                      <p className="text-xs text-muted-foreground">{formatDateTime(d.logged_at)}</p>
                      {d.notes ? <p className="mt-1 whitespace-pre-wrap">{d.notes}</p> : null}
                      {d.checklist.length > 0 ? (
                        <ul className="mt-1.5 flex flex-col gap-0.5">
                          {d.checklist.map((c, i) => (
                            <li key={i} className="flex justify-between gap-2 text-xs">
                              <span>{c.item}</span>
                              <span className="text-muted-foreground">{c.result}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Parts &amp; labor</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {parts.length === 0 ? (
                <p className="text-muted-foreground">No parts added yet.</p>
              ) : (
                <table className="w-full">
                  <tbody>
                    {parts.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-1.5">{p.part_name}</td>
                        <td className="py-1.5 text-muted-foreground">
                          {PART_STATUS_LABELS[p.status] ?? p.status}
                        </td>
                        <td className="py-1.5 text-right text-muted-foreground">
                          {p.quantity} × {formatCurrency(p.cost ?? 0)}
                        </td>
                        <td className="py-1.5 pl-4 text-right font-medium">
                          {formatCurrency((p.cost ?? 0) * p.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="flex flex-col gap-1 border-t pt-3">
                {ticket.diagnostic_fee ? (
                  <SummaryRow label="Diagnostic fee" value={ticket.diagnostic_fee} />
                ) : null}
                {ticket.labor_cost ? <SummaryRow label="Labor" value={ticket.labor_cost} /> : null}
                <SummaryRow label="Balance" value={ticket.final_balance} highlight />
              </div>
              {ticket.warranty_period_days ? (
                <p className="text-xs text-muted-foreground">
                  Warranty: {ticket.warranty_period_days} days
                </p>
              ) : null}
              {ticket.completed_summary ? (
                <div className="border-t pt-3">
                  <p className="text-muted-foreground">Completion summary</p>
                  <p className="mt-0.5 whitespace-pre-wrap">{ticket.completed_summary}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <ProofsSection proofs={proofs} organizationId={organizationId} repairTicketId={ticket.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Status history</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {history
                .slice()
                .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime())
                .map((h) => (
                  <div key={h.id} className="flex items-center gap-2 text-sm">
                    <span className="w-32 shrink-0 text-xs text-muted-foreground">
                      {formatDate(h.changed_at)}
                    </span>
                    {h.status ? (
                      <StatusBadge label={h.status.label} category={h.status.category} />
                    ) : null}
                    {h.source === "manual_backfill" ? (
                      <span className="text-xs text-muted-foreground">(entered from history)</span>
                    ) : null}
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Communications</CardTitle>
              <LogCommunicationDialog customerId={ticket.customer_id} repairTicketId={ticket.id} />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="text-sm">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{m.channel.replace("_", " ")}</span>
                      <span>·</span>
                      <span>{m.direction === "incoming" ? "From customer" : "To customer"}</span>
                      <span>·</span>
                      <span>{formatDateTime(m.occurred_at)}</span>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap">{m.body}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Dates</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <Row label="Intake" value={formatDate(ticket.intake_date)} />
              <Row label="Created" value={formatDateTime(ticket.created_at)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Payments</CardTitle>
              <RecordRepairPaymentDialog repairTicketId={ticket.id} customerId={ticket.customer_id} />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
              ) : (
                payments
                  .slice()
                  .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())
                  .map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p>{PAYMENT_KIND_LABELS[p.kind] ?? p.kind}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(p.paid_at)} · {p.method.replace("_", " ")}
                        </p>
                      </div>
                      <span className="font-medium tabular-nums">{formatCurrency(p.amount)}</span>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Files</CardTitle>
            </CardHeader>
            <CardContent>
              <RepairFiles repairTicketId={ticket.id} organizationId={organizationId} files={files} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <AddTaskForm repairTicketId={ticket.id} customerId={ticket.customer_id} />
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No open tasks.</p>
              ) : (
                <div className="rounded-md border">
                  {tasks.map((t) => (
                    <TaskRow key={t.id} task={t} showOrderLink={false} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={highlight ? "font-medium" : "text-muted-foreground"}>{label}</span>
      <span
        className={
          highlight && value > 0
            ? "font-medium text-amber-700 tabular-nums dark:text-amber-400"
            : "tabular-nums"
        }
      >
        {formatCurrency(value)}
      </span>
    </div>
  );
}
