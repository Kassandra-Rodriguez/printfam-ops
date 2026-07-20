import Link from "next/link";
import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { RequestListRow } from "@/server/data/requests";

const SOURCE_LABELS: Record<string, string> = {
  instagram: "Instagram",
  text: "Text",
  shopify: "Shopify",
  tiktok: "TikTok Shop",
  email: "Email",
  phone: "Phone",
  in_person: "In person",
  returning_customer: "Returning customer",
  other: "Other",
};

export function RequestsTable({ requests }: { requests: RequestListRow[] }) {
  if (requests.length === 0) {
    return (
      <div className="rounded-lg border">
        <EmptyState
          icon={Inbox}
          title="No requests yet"
          description="Inquiries and leads you log — or that come in from a communication — will show up here before they become orders."
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">Request</th>
            <th className="px-4 py-2 font-medium">Customer</th>
            <th className="px-4 py-2 font-medium">Source</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Follow up</th>
            <th className="px-4 py-2 font-medium text-right">Est. value</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
              <td className="px-4 py-2.5">
                <Link href={`/requests/${r.id}`} className="font-medium hover:underline">
                  {r.title}
                </Link>
              </td>
              <td className="px-4 py-2.5">
                {r.customer ? (
                  <Link href={`/customers/${r.customer.id}`} className="hover:underline">
                    {r.customer.display_name}
                  </Link>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {SOURCE_LABELS[r.source] ?? r.source}
              </td>
              <td className="px-4 py-2.5">
                {r.status ? <StatusBadge label={r.status.label} category={r.status.category} /> : "—"}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {r.follow_up_date ? formatDate(r.follow_up_date) : "—"}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {r.estimated_value ? formatCurrency(r.estimated_value) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
