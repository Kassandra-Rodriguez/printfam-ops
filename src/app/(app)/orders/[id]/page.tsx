import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { AddTaskForm } from "@/components/tasks/add-task-form";
import { TaskRow } from "@/components/tasks/task-row";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { requireOrgContext } from "@/server/authz/session";
import { getOrder } from "@/server/data/orders";
import { getWorkflowStatuses } from "@/server/data/workflow";
import { listAttachmentsForOrder, getAttachmentSignedUrl } from "@/server/data/attachments";
import { resolveOrderWorkflowEntityType } from "@/server/domain/workflow/resolveOrderWorkflow";
import { StatusControl } from "./status-control";
import { RecordPaymentDialog } from "./record-payment-dialog";
import { OrderFiles, type OrderFileRow } from "./order-files";

const ORDER_TYPE_LABELS: Record<string, string> = {
  custom: "Custom",
  existing_product: "Existing product",
  bulk: "Bulk",
  service: "Service",
};

const PAYMENT_KIND_LABELS: Record<string, string> = {
  deposit: "Deposit",
  final: "Final payment",
  full: "Full payment",
  refund: "Refund",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireOrgContext();
  const organizationId = ctx.activeMembership.organization_id;

  const order = await getOrder(ctx.supabase, id);
  if (!order || order.organization_id !== organizationId) notFound();

  const entityType = resolveOrderWorkflowEntityType(order.order_type, order.requires_production);
  const [statuses, attachments] = await Promise.all([
    getWorkflowStatuses(ctx.supabase, organizationId, entityType),
    listAttachmentsForOrder(ctx.supabase, organizationId, order.id),
  ]);

  const files: OrderFileRow[] = await Promise.all(
    attachments.map(async (a) => ({
      id: a.id,
      file_name: a.file_name,
      file_type: a.file_type,
      created_at: a.created_at,
      signedUrl: await getAttachmentSignedUrl(ctx.supabase, a.storage_path),
    })),
  );

  const items = (order.order_items ?? []) as {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
  }[];
  const history = (order.order_status_history ?? []) as {
    id: string;
    changed_at: string;
    source: string;
    note: string | null;
    status: { label: string; category: "neutral" | "info" | "warning" | "danger" | "success" } | null;
  }[];
  const payments = (order.payments ?? []) as {
    id: string;
    amount: number;
    method: string;
    kind: string;
    paid_at: string;
    reference_number: string | null;
    notes: string | null;
  }[];
  const tasks = ((order.tasks ?? []) as { id: string; status: string }[])
    .filter((t) => t.status === "open")
    .map((t) => t as unknown as Parameters<typeof TaskRow>[0]["task"]);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">{order.order_number}</p>
          <h1 className="text-lg font-semibold">{order.title}</h1>
          <Link
            href={`/customers/${order.customer?.id}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            {order.customer?.display_name}
          </Link>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusControl orderId={order.id} currentStatusId={order.status_id} statuses={statuses} />
          <Badge variant="secondary">{ORDER_TYPE_LABELS[order.order_type] ?? order.order_type}</Badge>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="col-span-2 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Items</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-1.5">{item.description}</td>
                      <td className="py-1.5 text-right text-muted-foreground">
                        {item.quantity} × {formatCurrency(item.unit_price)}
                      </td>
                      <td className="py-1.5 pl-4 text-right font-medium">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex flex-col gap-1 border-t pt-3 text-sm">
                <SummaryRow label="Subtotal" value={order.subtotal} />
                {order.discount_total > 0 ? (
                  <SummaryRow label="Discount" value={-order.discount_total} />
                ) : null}
                {order.tax_total > 0 ? <SummaryRow label="Tax" value={order.tax_total} /> : null}
                {order.shipping_cost > 0 ? (
                  <SummaryRow label="Shipping" value={order.shipping_cost} />
                ) : null}
                <SummaryRow label="Total" value={order.total} bold />
                <SummaryRow label="Balance remaining" value={order.balance_remaining} highlight />
              </div>
            </CardContent>
          </Card>

          {order.notes ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Notes</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">{order.notes}</CardContent>
            </Card>
          ) : null}

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
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Dates</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <Row label="Due" value={order.promised_date ? formatDate(order.promised_date) : "—"} />
              <Row
                label="Internal deadline"
                value={order.internal_deadline ? formatDate(order.internal_deadline) : "—"}
              />
              <Row label="Created" value={formatDateTime(order.created_at)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Payments</CardTitle>
              <RecordPaymentDialog orderId={order.id} customerId={order.customer_id} />
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
              <OrderFiles orderId={order.id} organizationId={organizationId} files={files} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <AddTaskForm orderId={order.id} customerId={order.customer_id} />
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
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  highlight,
}: {
  label: string;
  value: number;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? "font-medium" : "text-muted-foreground"}>{label}</span>
      <span
        className={
          highlight && value > 0
            ? "font-medium text-amber-700 tabular-nums dark:text-amber-400"
            : bold
              ? "font-medium tabular-nums"
              : "tabular-nums"
        }
      >
        {formatCurrency(value)}
      </span>
    </div>
  );
}
