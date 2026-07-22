import { requireOrgContext } from "@/server/authz/session";
import { listCustomers } from "@/server/data/customers";
import { getWorkflowStatuses } from "@/server/data/workflow";
import { CreateRepairForm } from "./create-repair-form";

export default async function NewRepairPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { customerId } = await searchParams;
  const ctx = await requireOrgContext();
  const orgId = ctx.activeMembership.organization_id;

  const [customers, statuses] = await Promise.all([
    listCustomers(ctx.supabase, orgId),
    getWorkflowStatuses(ctx.supabase, orgId, "repair_ticket"),
  ]);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-lg font-semibold">New repair</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Capture the intake details — a device already mid repair can be entered with its
        real history instead of starting fresh.
      </p>
      <div className="mt-6">
        <CreateRepairForm
          customers={customers.map((c) => ({ id: c.id, name: c.display_name }))}
          statuses={statuses}
          initialCustomerId={customerId}
        />
      </div>
    </div>
  );
}
