import Link from "next/link";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { QuoteListRow } from "@/server/data/quotes";

export function QuotesTable({ quotes }: { quotes: QuoteListRow[] }) {
  if (quotes.length === 0) {
    return (
      <div className="rounded-lg border">
        <EmptyState
          icon={FileText}
          title="No quotes yet"
          description="Price out custom or bulk work before committing — quotes you send will show up here."
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">Customer</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Expires</th>
            <th className="px-4 py-2 font-medium text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((quote) => (
            <tr key={quote.id} className="border-b last:border-0 hover:bg-muted/30">
              <td className="px-4 py-2.5">
                <Link href={`/quotes/${quote.id}`} className="font-medium hover:underline">
                  {quote.customer?.display_name ?? "—"}
                </Link>
                {quote.request_id ? (
                  <p className="text-xs text-muted-foreground">From request</p>
                ) : null}
              </td>
              <td className="px-4 py-2.5">
                {quote.status ? (
                  <StatusBadge label={quote.status.label} category={quote.status.category} />
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {quote.expires_at ? formatDate(quote.expires_at) : "—"}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(quote.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
