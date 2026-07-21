import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddTaskForm } from "@/components/tasks/add-task-form";
import { TaskRow } from "@/components/tasks/task-row";
import { LogCommunicationDialog } from "@/components/communications/log-communication-dialog";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { requireOrgContext } from "@/server/authz/session";
import { getRequest } from "@/server/data/requests";
import { getWorkflowStatuses } from "@/server/data/workflow";
import { RequestStatusControl } from "./status-control";

const SOURCE_LABELS: Record<string, string> = {
  instagram: "Instagram",
  text: "Text",
  shopify: "Shopify",
  tiktok: "TikTok Shop",
  email: "Email",
  phone: "Phone",
  in_person: "In person",
  returning_customer: "Returning customer",
  other: "Other",
};

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireOrgContext();
  const organizationId = ctx.activeMembership.organization_id;

  const request = await getRequest(ctx.supabase, id);
  if (!request || request.organization_id !== organizationId) notFound();

  const statuses = await getWorkflowStatuses(ctx.supabase, organizationId, "request");

  const tasks = ((request.tasks ?? []) as { id: string; status: string }[])
    .filter((t) => t.status === "open")
    .map((t) => t as unknown as Parameters<typeof TaskRow>[0]["task"]);
  const attachments = (request.attachments ?? []) as { id: string; file_name: string; created_at: string }[];
  const conversations = (request.conversations ?? []) as {
    id: string;
    channel: string;
    messages: { id: string; body: string; direction: string; occurred_at: string }[];
  }[];
  const allMessages = conversations
    .flatMap((c) => c.messages.map((m) => ({ ...m, channel: c.channel })))
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

  const isConverted = Boolean(request.converted_order_id);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">{request.title}</h1>
          <Link
            href={`/customers/${request.customer?.id}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            {request.customer?.display_name}
          </Link>
        </div>
        <div className="flex flex-col items-end gap-2">
          <RequestStatusControl requestId={request.id} currentStatusId={request.status_id} statuses={statuses} />
          <Badge variant="secondary">{SOURCE_LABELS[request.source] ?? request.source}</Badge>
        </div>
      </div>

      {isConverted && request.converted_order ? (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-900 dark:bg-emerald-950">
          <span>Converted to order</span>
          <Link
            href={`/orders/${request.converted_order.id}`}
            className="font-medium text-emerald-800 hover:underline dark:text-emerald-300"
          >
            {request.converted_order.order_number}
          </Link>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2">
          <Button asChild size="sm">
            <Link
              href={`/orders/new?fromRequestId=${request.id}&customerId=${request.customer?.id}&title=${encodeURIComponent(request.title)}`}
            >
              Convert to Order
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/quotes/new?fromRequestId=${request.id}&customerId=${request.customer?.id}`}>
              Create Quote
            </Link>
          </Button>
        </div>
      )}

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="col-span-2 flex flex-col gap-4">
          {request.description ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Description</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">{request.description}</CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Communications</CardTitle>
              <LogCommunicationDialog customerId={request.customer_id} requestId={request.id} />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {allMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
              ) : (
                allMessages.map((m) => (
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
              <CardTitle className="text-sm font-medium">Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <Row label="Estimated value" value={request.estimated_value ? formatCurrency(request.estimated_value) : "—"} />
              <Row label="Follow up" value={request.follow_up_date ? formatDate(request.follow_up_date) : "—"} />
              <Row label="Created" value={formatDateTime(request.created_at)} />
            </CardContent>
          </Card>

          {attachments.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Files</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5">
                {attachments.map((a) => (
                  <p key={a.id} className="truncate text-sm">
                    {a.file_name}
                  </p>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <AddTaskForm customerId={request.customer_id} requestId={request.id} />
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
