import Link from "next/link";
import { Package } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency } from "@/lib/format";
import type { ProductListRow } from "@/server/data/products";
import { AdjustStockPopover } from "./adjust-stock-popover";

export function InventoryTable({ products, showCost }: { products: ProductListRow[]; showCost: boolean }) {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border">
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Add products you sell so orders can link to real stock levels."
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">Product</th>
            <th className="px-4 py-2 font-medium">SKU</th>
            <th className="px-4 py-2 font-medium text-right">Available</th>
            <th className="px-4 py-2 font-medium text-right">Reserved</th>
            <th className="px-4 py-2 font-medium text-right">On hand</th>
            {showCost ? <th className="px-4 py-2 font-medium text-right">Cost</th> : null}
            <th className="px-4 py-2 font-medium text-right">Price</th>
            <th className="px-4 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const lowStock = p.available_quantity <= p.reorder_level;
            return (
              <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2.5">
                  <Link href={`/inventory/${p.id}`} className="font-medium hover:underline">
                    {p.name}
                  </Link>
                  {!p.is_active ? <span className="ml-2 text-xs text-muted-foreground">(inactive)</span> : null}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{p.sku ?? "—"}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  <div className="flex items-center justify-end gap-1.5">
                    {p.available_quantity}
                    {lowStock ? <StatusBadge label="Low stock" category="warning" /> : null}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{p.reserved_quantity}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{p.available_quantity + p.reserved_quantity}</td>
                {showCost ? (
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                    {p.cost != null ? formatCurrency(p.cost) : "—"}
                  </td>
                ) : null}
                <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(p.selling_price)}</td>
                <td className="px-4 py-2.5 text-right">
                  <AdjustStockPopover productId={p.id} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
