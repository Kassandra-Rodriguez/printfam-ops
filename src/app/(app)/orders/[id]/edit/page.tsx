import { notFound } from "next/navigation";
import { requireOrgContext } from "@/server/authz/session";
import { getOrder } from "@/server/data/orders";
import { listCustomers } from "@/server/data/customers";
import { EditOrderForm } from "./edit-order-form";

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireOrgContext();
  const organizationId = ctx.activeMembership.organization_id;

  const [order, customers] = await Promise.all([
    getOrder(ctx.supabase, id),
    listCustomers(ctx.supabase, organizationId),
  ]);
  if (!order || order.organization_id !== organizationId) notFound();

  const items = (order.order_items ?? []) as {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    item_type: string;
  }[];

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-lg font-semibold">Edit {order.order_number}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Status changes and payments are recorded from the order page, not here.
      </p>
      <div className="mt-6">
        <EditOrderForm
          orderId={order.id}
          customers={customers.map((c) => ({ id: c.id, name: c.display_name }))}
          defaultValues={{
            customerId: order.customer_id,
            title: order.title ?? "",
            items: items.map((i) => ({
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unit_price,
              itemType: i.item_type as "catalog_product" | "custom_line_item" | "service" | "repair_charge",
            })),
            promisedDate: order.promised_date ?? "",
            internalDeadline: order.internal_deadline ?? "",
            notes: order.notes ?? "",
            discountTotal: order.discount_total,
            taxTotal: order.tax_total,
            shippingCost: order.shipping_cost,
            depositRequired: order.deposit_required,
            source: order.source ?? undefined,
          }}
        />
      </div>
    </div>
  );
}
