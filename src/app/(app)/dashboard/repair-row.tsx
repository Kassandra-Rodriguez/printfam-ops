import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency } from "@/lib/format";
import type { RepairListRow } from "@/server/data/repairs";

export function DashboardRepairRow({ repair }: { repair: RepairListRow }) {
  return (
    <Link
      href={`/repairs/${repair.id}`}
      className="flex items-center gap-3 border-b px-4 py-2.5 text-sm last:border-0 hover:bg-muted/30"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{repair.device_model}</p>
        <p className="truncate text-xs text-muted-foreground">
          {repair.customer?.display_name} · {repair.ticket_number}
        </p>
      </div>
      {repair.status ? <StatusBadge label={repair.status.label} category={repair.status.category} /> : null}
      <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
        {repair.final_balance > 0 ? formatCurrency(repair.final_balance) : "—"}
      </span>
    </Link>
  );
}
