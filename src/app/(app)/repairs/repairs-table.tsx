import Link from "next/link";
import { Wrench } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency } from "@/lib/format";
import type { RepairListRow } from "@/server/data/repairs";

export function RepairsTable({ repairs }: { repairs: RepairListRow[] }) {
  if (repairs.length === 0) {
    return (
      <div className="rounded-lg border">
        <EmptyState
          icon={Wrench}
          title="No repairs yet"
          description="Repair tickets you create will show up here — including devices already mid repair."
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">Device</th>
            <th className="px-4 py-2 font-medium">Customer</th>
            <th className="px-4 py-2 font-medium">Reported issue</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium text-right">Diagnostic fee</th>
            <th className="px-4 py-2 font-medium text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {repairs.map((repair) => (
            <tr key={repair.id} className="border-b last:border-0 hover:bg-muted/30">
              <td className="px-4 py-2.5">
                <Link href={`/repairs/${repair.id}`} className="font-medium hover:underline">
                  {repair.ticket_number}
                </Link>
                <p className="text-xs text-muted-foreground">{repair.device_model}</p>
              </td>
              <td className="px-4 py-2.5">
                {repair.customer ? (
                  <Link href={`/customers/${repair.customer.id}`} className="hover:underline">
                    {repair.customer.display_name}
                  </Link>
                ) : (
                  "—"
                )}
              </td>
              <td className="max-w-xs truncate px-4 py-2.5 text-muted-foreground">
                {repair.reported_issue}
              </td>
              <td className="px-4 py-2.5">
                {repair.status ? (
                  <div className="flex items-center gap-1.5">
                    <StatusBadge label={repair.status.label} category={repair.status.category} />
                    {repair.status.key === "waiting_for_parts" ? (
                      <span className="text-xs text-amber-700 dark:text-amber-400">
                        (parts)
                      </span>
                    ) : null}
                  </div>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {repair.diagnostic_fee ? formatCurrency(repair.diagnostic_fee) : "—"}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {repair.final_balance > 0 ? (
                  <span className="font-medium text-amber-700 dark:text-amber-400">
                    {formatCurrency(repair.final_balance)}
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
