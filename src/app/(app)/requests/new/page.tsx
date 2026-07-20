import { requireOrgContext } from "@/server/authz/session";
import { listCustomers } from "@/server/data/customers";
import { CreateRequestForm } from "./create-request-form";

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { customerId } = await searchParams;
  const ctx = await requireOrgContext();
  const customers = await listCustomers(ctx.supabase, ctx.activeMembership.organization_id);

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="text-lg font-semibold">New request</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        An inquiry or lead — convert it to an order once it&apos;s ready.
      </p>
      <div className="mt-6">
        <CreateRequestForm
          customers={customers.map((c) => ({ id: c.id, name: c.display_name }))}
          defaultCustomerId={customerId}
        />
      </div>
    </div>
  );
}
