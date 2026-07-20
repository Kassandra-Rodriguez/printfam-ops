import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { OrderListRow } from "@/server/data/orders";

export function DashboardOrderRow({
  order,
  emphasis,
}: {
  order: OrderListRow;
  emphasis: "date" | "balance";
}) {
  return (
    <Link
      href={`/orders/${order.id}`}
      className="flex items-center gap-3 border-b px-4 py-2.5 text-sm last:border-0 hover:bg-muted/30"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{order.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {order.customer?.display_name} · {order.order_number}
        </p>
      </div>
      {order.status ? <StatusBadge label={order.status.label} category={order.status.category} /> : null}
      <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
        {emphasis === "date"
          ? order.promised_date
            ? formatDate(order.promised_date)
            : "—"
          : formatCurrency(order.balance_remaining)}
      </span>
    </Link>
  );
}
