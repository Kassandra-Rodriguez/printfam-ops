import { requireOrgContext } from "@/server/authz/session";
import { listCustomers } from "@/server/data/customers";
import { getWorkflowStatuses } from "@/server/data/workflow";
import { CreateOrderForm } from "./create-order-form";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ fromRequestId?: string; customerId?: string; title?: string }>;
}) {
  const { fromRequestId, customerId, title } = await searchParams;
  const ctx = await requireOrgContext();
  const orgId = ctx.activeMembership.organization_id;

  const [customers, customStatuses, existingProductStatuses, serviceStatuses] = await Promise.all([
    listCustomers(ctx.supabase, orgId),
    getWorkflowStatuses(ctx.supabase, orgId, "order_custom"),
    getWorkflowStatuses(ctx.supabase, orgId, "order_existing_product"),
    getWorkflowStatuses(ctx.supabase, orgId, "order_service"),
  ]);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-lg font-semibold">New order</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {fromRequestId
          ? "Converting a request — confirm the details below and save."
          : "Quick Entry saves an order in seconds. Switch to Detailed Entry for line items, backfilled history, and payments already collected."}
      </p>
      <div className="mt-6">
        <CreateOrderForm
          customers={customers.map((c) => ({ id: c.id, name: c.display_name }))}
          statusesByEntityType={{
            order_custom: customStatuses,
            order_existing_product: existingProductStatuses,
            order_service: serviceStatuses,
          }}
          convertedFromRequestId={fromRequestId}
          initialCustomerId={customerId}
          initialTitle={title}
        />
      </div>
    </div>
  );
}
