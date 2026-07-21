import { notFound } from "next/navigation";
import { requireOrgContext } from "@/server/authz/session";
import { getQuote } from "@/server/data/quotes";
import { listCustomers } from "@/server/data/customers";
import { EditQuoteForm } from "./edit-quote-form";

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireOrgContext();
  const organizationId = ctx.activeMembership.organization_id;

  const [quote, customers] = await Promise.all([
    getQuote(ctx.supabase, id),
    listCustomers(ctx.supabase, organizationId),
  ]);
  if (!quote || quote.organization_id !== organizationId) notFound();

  const items = (quote.quote_items ?? []) as {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    item_type: string;
  }[];

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-lg font-semibold">Edit quote</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Status changes and payments are recorded from the quote page, not here.
      </p>
      <div className="mt-6">
        <EditQuoteForm
          quoteId={quote.id}
          customers={customers.map((c) => ({ id: c.id, name: c.display_name }))}
          defaultValues={{
            customerId: quote.customer_id,
            requestId: quote.request_id ?? undefined,
            items: items.map((i) => ({
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unit_price,
              itemType: i.item_type as "product" | "labor" | "material" | "custom",
            })),
            discountTotal: quote.discount_total,
            taxTotal: quote.tax_total,
            shippingCost: quote.shipping_cost,
            depositAmount: quote.deposit_amount,
            expiresAt: quote.expires_at ?? "",
            terms: quote.terms ?? "",
            customerNotes: quote.customer_notes ?? "",
          }}
        />
      </div>
    </div>
  );
}
