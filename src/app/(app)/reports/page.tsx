import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { BarChart3 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { requireOrgContext } from "@/server/authz/session";
import { getReportsSummary } from "@/server/data/reports";

const ORDER_TYPE_LABELS: Record<string, string> = {
  custom: "Custom",
  existing_product: "Existing product",
  bulk: "Bulk",
  service: "Service",
};

/** docs/screens.md #21: a separate secondary area, deliberately not the attention-dashboard pattern — numbers/tables, not a live triage list. */
export default async function ReportsPage() {
  const ctx = await requireOrgContext();
  // docs/user_roles.md: Reports & analytics — Owner F, Manager R (no cost/profit), Team Member —.
  if (ctx.activeMembership.role.key === "team_member") {
    return (
      <div className="p-6">
        <EmptyState icon={BarChart3} title="Reports aren't available for your role" description="Ask an Owner or Manager." />
      </div>
    );
  }

  const summary = await getReportsSummary(ctx.supabase, ctx.activeMembership.organization_id);

  return (
    <div className="p-6">
      <h1 className="mb-4 text-lg font-semibold">Reports</h1>

      <div className="grid grid-cols-4 gap-3">
        <Stat label="Average order value" value={formatCurrency(summary.averageOrderValue)} />
        <Stat label="Outstanding balance" value={formatCurrency(summary.outstandingBalance)} />
        <Stat label="Overdue orders" value={String(summary.overdueOrderCount)} />
        <Stat label="Conversion rate" value={`${Math.round(summary.conversionRate * 100)}%`} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Revenue by month</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm">
            {summary.revenueByMonth.length === 0 ? (
              <p className="text-muted-foreground">No payments recorded yet.</p>
            ) : (
              summary.revenueByMonth.map((m) => (
                <div key={m.month} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{m.month}</span>
                  <span className="tabular-nums font-medium">{formatCurrency(m.amount)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Revenue split</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Orders</span>
              <span className="tabular-nums font-medium">{formatCurrency(summary.orderRevenue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Repairs</span>
              <span className="tabular-nums font-medium">{formatCurrency(summary.repairRevenue)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Orders by type</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm">
            {summary.ordersByType.map((o) => (
              <div key={o.type} className="flex items-center justify-between">
                <span className="text-muted-foreground">{ORDER_TYPE_LABELS[o.type] ?? o.type}</span>
                <span className="tabular-nums font-medium">{o.count}</span>
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between border-t pt-1.5">
              <span className="text-muted-foreground">Completed</span>
              <span className="tabular-nums font-medium">{summary.completedCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Cancelled</span>
              <span className="tabular-nums font-medium">{summary.cancelledCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Requests by source</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm">
            {summary.requestsBySource.length === 0 ? (
              <p className="text-muted-foreground">No requests logged yet.</p>
            ) : (
              summary.requestsBySource.map((r) => (
                <div key={r.source} className="flex items-center justify-between">
                  <span className="text-muted-foreground capitalize">{r.source.replace("_", " ")}</span>
                  <span className="tabular-nums font-medium">{r.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Popular products</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm">
            {summary.popularProducts.length === 0 ? (
              <p className="text-muted-foreground">No catalog-linked sales yet.</p>
            ) : (
              summary.popularProducts.map((p) => (
                <div key={p.name} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{p.name}</span>
                  <span className="tabular-nums font-medium">{p.quantitySold}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="tabular-nums font-medium">{summary.totalCustomerCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Repeat (2+ orders)</span>
              <span className="tabular-nums font-medium">{summary.repeatCustomerCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Average completion time isn&apos;t computed yet — deferred, see docs/build_phases.md Phase 8.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
