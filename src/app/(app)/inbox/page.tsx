import Link from "next/link";
import { Inbox as InboxIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogCommunicationDialog } from "@/components/communications/log-communication-dialog";
import { formatDateTime } from "@/lib/format";
import { requireOrgContext } from "@/server/authz/session";
import { listRecentCommunications } from "@/server/data/communications";
import { listCustomers } from "@/server/data/customers";

const CHANNEL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  text: "Text",
  tiktok_shop: "TikTok Shop",
  shopify: "Shopify",
  email: "Email",
  phone: "Phone",
  in_person: "In person",
  other: "Other",
};

export default async function InboxPage() {
  const ctx = await requireOrgContext();
  const [messages, customers] = await Promise.all([
    listRecentCommunications(ctx.supabase, ctx.activeMembership.organization_id),
    listCustomers(ctx.supabase, ctx.activeMembership.organization_id),
  ]);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every message logged from any channel, newest first.
          </p>
        </div>
        <LogCommunicationDialog customers={customers.map((c) => ({ id: c.id, name: c.display_name }))} />
      </div>

      {messages.length === 0 ? (
        <div className="rounded-lg border">
          <EmptyState
            icon={InboxIcon}
            title="No messages logged yet"
            description="Paste in a conversation from Instagram, text, email, or anywhere else — it'll show up here and can turn into a request, order, or task."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((m) => (
            <div key={m.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  {m.conversation?.customer ? (
                    <Link
                      href={`/customers/${m.conversation.customer.id}`}
                      className="font-medium hover:underline"
                    >
                      {m.conversation.customer.display_name}
                    </Link>
                  ) : (
                    <span className="font-medium">Unknown customer</span>
                  )}
                  <Badge variant="secondary">{CHANNEL_LABELS[m.conversation?.channel ?? ""] ?? m.conversation?.channel}</Badge>
                  {m.follow_up_required ? <Badge variant="outline">Needs follow-up</Badge> : null}
                </div>
                <span className="text-xs text-muted-foreground">{formatDateTime(m.occurred_at)}</span>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap">{m.body}</p>
              <div className="mt-2 flex items-center gap-3 text-xs">
                {m.conversation?.related_request_id ? (
                  <Link href={`/requests/${m.conversation.related_request_id}`} className="text-muted-foreground hover:underline">
                    View linked request
                  </Link>
                ) : m.conversation?.related_order_id ? (
                  <Link href={`/orders/${m.conversation.related_order_id}`} className="text-muted-foreground hover:underline">
                    View linked order
                  </Link>
                ) : m.conversation?.related_repair_ticket_id ? (
                  <Link href={`/repairs/${m.conversation.related_repair_ticket_id}`} className="text-muted-foreground hover:underline">
                    View linked repair
                  </Link>
                ) : m.conversation?.customer ? (
                  <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                    <Link href={`/requests/new?customerId=${m.conversation.customer.id}`}>
                      Create request from this
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
