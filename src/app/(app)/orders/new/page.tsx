import { requireOrgContext } from "@/server/authz/session";
import { listCustomers } from "@/server/data/customers";
import { getWorkflowStatuses } from "@/server/data/workflow";
import { getQuote } from "@/server/data/quotes";
import { CreateOrderForm } from "./create-order-form";

/** Flow E step 5: quote_items' item_type vocabulary doesn't match orders' — map to the closest order line-item type rather than adding a fifth type just for carried-over quotes. */
const QUOTE_ITEM_TYPE_TO_ORDER_ITEM_TYPE: Record<string, "catalog_product" | "custom_line_item" | "service"> = {
  product: "catalog_product",
  labor: "service",
  material: "custom_line_item",
  custom: "custom_line_item",
};

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ fromRequestId?: string; fromQuoteId?: string; customerId?: string; title?: string }>;
}) {
  const { fromRequestId, fromQuoteId, customerId, title } = await searchParams;
  const ctx = await requireOrgContext();
  const orgId = ctx.activeMembership.organization_id;

  const [customers, customStatuses, existingProductStatuses, serviceStatuses, quote] = await Promise.all([
    listCustomers(ctx.supabase, orgId),
    getWorkflowStatuses(ctx.supabase, orgId, "order_custom"),
    getWorkflowStatuses(ctx.supabase, orgId, "order_existing_product"),
    getWorkflowStatuses(ctx.supabase, orgId, "order_service"),
    fromQuoteId ? getQuote(ctx.supabase, fromQuoteId) : Promise.resolve(null),
  ]);

  const quoteItems = (quote?.quote_items ?? []) as {
    description: string;
    quantity: number;
    unit_price: number;
    item_type: string;
  }[];

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-lg font-semibold">New order</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {fromRequestId || fromQuoteId
          ? "Converting — confirm the details below and save."
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
          convertedFromQuoteId={fromQuoteId}
          initialCustomerId={customerId}
          initialTitle={title}
          initialItems={
            quote
              ? quoteItems.map((i) => ({
                  description: i.description,
                  quantity: i.quantity,
                  unitPrice: i.unit_price,
                  itemType: QUOTE_ITEM_TYPE_TO_ORDER_ITEM_TYPE[i.item_type] ?? "custom_line_item",
                }))
              : undefined
          }
          initialPricing={
            quote
              ? {
                  discountTotal: quote.discount_total,
                  taxTotal: quote.tax_total,
                  shippingCost: quote.shipping_cost,
                  depositRequired: quote.deposit_amount,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
