import { requireOrgContext } from "@/server/authz/session";
import { listCustomers } from "@/server/data/customers";
import { CreateQuoteForm } from "./create-quote-form";

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ fromRequestId?: string; customerId?: string }>;
}) {
  const { fromRequestId, customerId } = await searchParams;
  const ctx = await requireOrgContext();
  const customers = await listCustomers(ctx.supabase, ctx.activeMembership.organization_id);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-lg font-semibold">New quote</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Price out custom or bulk work before committing — saves as a draft until sent.
      </p>
      <div className="mt-6">
        <CreateQuoteForm
          customers={customers.map((c) => ({ id: c.id, name: c.display_name }))}
          requestId={fromRequestId}
          initialCustomerId={customerId}
        />
      </div>
    </div>
  );
}
