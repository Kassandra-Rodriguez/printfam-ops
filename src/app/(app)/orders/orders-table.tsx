import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { OrderListRow } from "@/server/data/orders";

const ORDER_TYPE_LABELS: Record<string, string> = {
  custom: "Custom",
  existing_product: "Existing product",
  bulk: "Bulk",
  service: "Service",
};

export function OrdersTable({ orders }: { orders: OrderListRow[] }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-lg border">
        <EmptyState
          icon={ShoppingBag}
          title="No orders yet"
          description="Orders you create will show up here — including ones already in progress."
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">Order</th>
            <th className="px-4 py-2 font-medium">Customer</th>
            <th className="px-4 py-2 font-medium">Type</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Due</th>
            <th className="px-4 py-2 font-medium text-right">Total</th>
            <th className="px-4 py-2 font-medium text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30">
              <td className="px-4 py-2.5">
                <Link href={`/orders/${order.id}`} className="font-medium hover:underline">
                  {order.order_number}
                </Link>
                <p className="text-xs text-muted-foreground">{order.title}</p>
              </td>
              <td className="px-4 py-2.5">
                {order.customer ? (
                  <Link href={`/customers/${order.customer.id}`} className="hover:underline">
                    {order.customer.display_name}
                  </Link>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {ORDER_TYPE_LABELS[order.order_type] ?? order.order_type}
              </td>
              <td className="px-4 py-2.5">
                {order.status ? (
                  <StatusBadge label={order.status.label} category={order.status.category} />
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {order.promised_date ? formatDate(order.promised_date) : "—"}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {formatCurrency(order.total)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {order.balance_remaining > 0 ? (
                  <span className="font-medium text-amber-700 dark:text-amber-400">
                    {formatCurrency(order.balance_remaining)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Paid</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
