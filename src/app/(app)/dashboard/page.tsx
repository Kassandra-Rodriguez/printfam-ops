import { ListChecks } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        What needs your attention, ranked by urgency — before anything else.
      </p>

      <div className="mt-4 rounded-lg border">
        <EmptyState
          icon={ListChecks}
          title="Nothing needs your attention yet"
          description="Once you start adding orders, tasks, and payments in Phase 3, anything overdue, waiting on a customer, or due soon will show up here first — see docs/screens.md #1."
        />
      </div>
    </div>
  );
}
