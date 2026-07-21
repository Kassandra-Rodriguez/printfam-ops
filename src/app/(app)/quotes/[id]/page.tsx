import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { AddTaskForm } from "@/components/tasks/add-task-form";
import { TaskRow } from "@/components/tasks/task-row";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { requireOrgContext } from "@/server/authz/session";
import { getQuote } from "@/server/data/quotes";
import { getWorkflowStatuses } from "@/server/data/workflow";
import { listAttachmentsForQuote, getAttachmentSignedUrl } from "@/server/data/attachments";
import { QuoteStatusControl } from "./status-control";
import { SendQuoteButton } from "./send-quote-button";
import { QuoteResponseControl } from "./response-control";
import { RecordQuotePaymentDialog } from "./record-payment-dialog";
import { QuoteFiles, type QuoteFileRow } from "./quote-files";

const ITEM_TYPE_LABELS: Record<string, string> = {
  product: "Product",
  labor: "Labor",
  material: "Material",
  custom: "Custom",
};

const PAYMENT_KIND_LABELS: Record<string, string> = {
  deposit: "Deposit",
  final: "Final payment",
  full: "Full payment",
  refund: "Refund",
};

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireOrgContext();
  const organizationId = ctx.activeMembership.organization_id;

  const quote = await getQuote(ctx.supabase, id);
  if (!quote || quote.organization_id !== organizationId) notFound();

  const [statuses, attachments] = await Promise.all([
    getWorkflowStatuses(ctx.supabase, organizationId, "quote"),
    listAttachmentsForQuote(ctx.supabase, organizationId, quote.id),
  ]);

  const files: QuoteFileRow[] = await Promise.all(
    attachments.map(async (a) => ({
      id: a.id,
      file_name: a.file_name,
      file_type: a.file_type,
      created_at: a.created_at,
      signedUrl: await getAttachmentSignedUrl(ctx.supabase, a.storage_path),
    })),
  );

  const items = (quote.quote_items ?? []) as {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    item_type: string;
  }[];
  const history = (quote.quote_status_history ?? []) as {
    id: string;
    changed_at: string;
    source: string;
    note: string | null;
    status: { label: string; category: "neutral" | "info" | "warning" | "danger" | "success" } | null;
  }[];
  const payments = (quote.payments ?? []) as {
    id: string;
    amount: number;
    method: string;
    kind: string;
    paid_at: string;
    reference_number: string | null;
    notes: string | null;
  }[];
  const tasks = ((quote.tasks ?? []) as { id: string; status: string }[])
    .filter((t) => t.status === "open")
    .map((t) => t as unknown as Parameters<typeof TaskRow>[0]["task"]);

  const statusKey = (quote.status as { key?: string } | null)?.key;
  const canConvert = statusKey === "approved" && !quote.converted_order_id;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Quote</p>
          <Link
            href={`/customers/${quote.customer?.id}`}
            className="text-lg font-semibold hover:underline"
          >
            {quote.customer?.display_name}
          </Link>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <QuoteStatusControl quoteId={quote.id} currentStatusId={quote.status_id} statuses={statuses} />
            {!quote.sent_at ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/quotes/${quote.id}/edit`}>Edit</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="col-span-2 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Line items</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <table className="w-full">
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-1.5">
                        {item.description}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {ITEM_TYPE_LABELS[item.item_type] ?? item.item_type}
                        </span>
                      </td>
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
              <div className="flex flex-col gap-1 border-t pt-3">
                <SummaryRow label="Subtotal" value={quote.subtotal} />
                {quote.discount_total > 0 ? <SummaryRow label="Discount" value={-quote.discount_total} /> : null}
                {quote.tax_total > 0 ? <SummaryRow label="Tax" value={quote.tax_total} /> : null}
                {quote.shipping_cost > 0 ? <SummaryRow label="Shipping" value={quote.shipping_cost} /> : null}
                <SummaryRow label="Total" value={quote.total} highlight />
                {quote.deposit_amount > 0 ? (
                  <SummaryRow label="Deposit required" value={quote.deposit_amount} />
                ) : null}
              </div>
              {quote.terms ? (
                <div className="border-t pt-3">
                  <p className="text-muted-foreground">Terms</p>
                  <p className="mt-0.5 whitespace-pre-wrap">{quote.terms}</p>
                </div>
              ) : null}
              {quote.customer_notes ? (
                <div className="border-t pt-3">
                  <p className="text-muted-foreground">Notes to customer</p>
                  <p className="mt-0.5 whitespace-pre-wrap">{quote.customer_notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Customer response</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {quote.converted_order_id ? (
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  Converted to{" "}
                  <Link href={`/orders/${quote.converted_order_id}`} className="underline">
                    order
                  </Link>
                </p>
              ) : (
                <>
                  <SendQuoteButton quoteId={quote.id} alreadySent={Boolean(quote.sent_at)} />
                  <QuoteResponseControl
                    quoteId={quote.id}
                    approvedAt={quote.approved_at}
                    declinedAt={quote.declined_at}
                  />
                  {canConvert ? (
                    <Button asChild size="sm" className="self-start">
                      <Link
                        href={`/orders/new?fromQuoteId=${quote.id}&customerId=${quote.customer?.id}`}
                      >
                        Convert to Order
                      </Link>
                    </Button>
                  ) : null}
                </>
              )}
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
                    {h.status ? <StatusBadge label={h.status.label} category={h.status.category} /> : null}
                    {h.note ? <span className="text-xs text-muted-foreground">— {h.note}</span> : null}
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
              {quote.expires_at ? <Row label="Expires" value={formatDate(quote.expires_at)} /> : null}
              {quote.sent_at ? <Row label="Sent" value={formatDateTime(quote.sent_at)} /> : null}
              {quote.viewed_at ? <Row label="Viewed" value={formatDateTime(quote.viewed_at)} /> : null}
              <Row label="Created" value={formatDateTime(quote.created_at)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Payments</CardTitle>
              <RecordQuotePaymentDialog quoteId={quote.id} customerId={quote.customer_id} />
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
              <QuoteFiles quoteId={quote.id} organizationId={organizationId} files={files} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <AddTaskForm quoteId={quote.id} customerId={quote.customer_id} />
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

function SummaryRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={highlight ? "font-medium" : "text-muted-foreground"}>{label}</span>
      <span className={highlight ? "font-medium tabular-nums" : "tabular-nums"}>{formatCurrency(value)}</span>
    </div>
  );
}
