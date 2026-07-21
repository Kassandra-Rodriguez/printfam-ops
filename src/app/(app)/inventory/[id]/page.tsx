import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { requireOrgContext } from "@/server/authz/session";
import { getProduct, listTransactionsForProduct } from "@/server/data/products";
import { AdjustStockPopover } from "../adjust-stock-popover";
import { EditProductForm } from "./edit-product-form";

const REASON_LABELS: Record<string, string> = {
  order_fulfillment: "Order fulfillment",
  manual_adjustment: "Manual adjustment",
  restock: "Restock",
  correction: "Correction",
};

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireOrgContext();
  const organizationId = ctx.activeMembership.organization_id;
  const showCost = ctx.activeMembership.role.key !== "team_member";

  const [product, transactions] = await Promise.all([
    getProduct(ctx.supabase, organizationId, id, showCost),
    listTransactionsForProduct(ctx.supabase, organizationId, id),
  ]);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">{product.sku ?? "No SKU"}</p>
          <h1 className="text-lg font-semibold">{product.name}</h1>
        </div>
        <AdjustStockPopover productId={product.id} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <Stat label="Available" value={product.available_quantity} />
        <Stat label="Reserved" value={product.reserved_quantity} />
        <Stat label="On hand" value={product.available_quantity + product.reserved_quantity} />
      </div>

      <div className="mt-6">
        <EditProductForm
          productId={product.id}
          showCost={showCost}
          defaultValues={{
            name: product.name,
            description: product.description ?? "",
            category: product.category ?? "",
            sku: product.sku ?? "",
            sellingPrice: product.selling_price,
            cost: product.cost ?? undefined,
            availableQuantity: product.available_quantity,
            reorderLevel: product.reorder_level,
            productionNotes: product.production_notes ?? "",
            isActive: product.is_active,
          }}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Stock history</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stock movements yet.</p>
          ) : (
            transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm">
                <div>
                  <p>
                    {REASON_LABELS[t.reason] ?? t.reason}
                    {t.order ? (
                      <>
                        {" · "}
                        <Link href={`/orders/${t.order.id}`} className="text-muted-foreground hover:underline">
                          {t.order.order_number}
                        </Link>
                      </>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(t.created_at)}
                    {t.note ? ` — ${t.note}` : ""}
                  </p>
                </div>
                <span className={t.quantity_delta > 0 ? "font-medium tabular-nums text-emerald-700 dark:text-emerald-400" : "font-medium tabular-nums text-amber-700 dark:text-amber-400"}>
                  {t.quantity_delta > 0 ? "+" : ""}
                  {t.quantity_delta}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
