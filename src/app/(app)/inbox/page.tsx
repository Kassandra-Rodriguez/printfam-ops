import Link from "next/link";
import { Inbox as InboxIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LogCommunicationDialog } from "@/components/communications/log-communication-dialog";
import { formatDateTime } from "@/lib/format";
import { requireOrgContext } from "@/server/authz/session";
import { listCustomersWithRecentMessage, listMessagesForCustomerThread } from "@/server/data/communications";
import { listCustomers } from "@/server/data/customers";
import { ThreadView } from "./thread-view";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { customerId } = await searchParams;
  const ctx = await requireOrgContext();
  const organizationId = ctx.activeMembership.organization_id;

  const [threadCustomers, customers] = await Promise.all([
    listCustomersWithRecentMessage(ctx.supabase, organizationId),
    listCustomers(ctx.supabase, organizationId),
  ]);

  const selectedCustomerId = customerId ?? threadCustomers[0]?.id;
  const messages = selectedCustomerId
    ? await listMessagesForCustomerThread(ctx.supabase, organizationId, selectedCustomerId)
    : [];
  const selectedCustomer = threadCustomers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="flex w-72 shrink-0 flex-col border-r">
        <div className="flex items-center justify-between border-b p-3">
          <h1 className="text-sm font-semibold">Inbox</h1>
          <LogCommunicationDialog customers={customers.map((c) => ({ id: c.id, name: c.display_name }))} />
        </div>
        {threadCustomers.length === 0 ? (
          <div className="p-3">
            <EmptyState
              icon={InboxIcon}
              title="No messages yet"
              description="Log a message from any channel and it'll show up here."
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {threadCustomers.map((c) => (
              <Link
                key={c.id}
                href={`/inbox?customerId=${c.id}`}
                className={`block border-b px-3 py-2.5 text-sm hover:bg-muted/40 ${c.id === selectedCustomerId ? "bg-muted/60" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{c.display_name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(c.lastMessageAt).split(",")[0]}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{c.lastMessage}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col">
        {selectedCustomer ? (
          <ThreadView
            key={selectedCustomer.id}
            customerId={selectedCustomer.id}
            customerName={selectedCustomer.display_name}
            initialMessages={messages}
            lastChannel={selectedCustomer.lastChannel}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a conversation, or log a new message to get started.
          </div>
        )}
      </div>
    </div>
  );
}
