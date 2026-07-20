import { ListChecks } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { TaskRow } from "@/components/tasks/task-row";
import { requireOrgContext } from "@/server/authz/session";
import { getDashboardData } from "@/server/data/dashboard";
import { DashboardOrderRow } from "./order-row";

export default async function DashboardPage() {
  const ctx = await requireOrgContext();
  const data = await getDashboardData(ctx.supabase, ctx.activeMembership.organization_id);

  const nothingToShow =
    data.overdueOrders.length === 0 &&
    data.dueSoonOrders.length === 0 &&
    data.waitingForPaymentOrders.length === 0 &&
    data.overdueTasks.length === 0 &&
    data.todayTasks.length === 0;

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        What needs your attention, ranked by urgency — before anything else.
      </p>

      {nothingToShow ? (
        <div className="mt-4 rounded-lg border">
          <EmptyState
            icon={ListChecks}
            title="Nothing needs your attention yet"
            description="Overdue orders, unpaid balances, and due tasks will show up here first, as soon as you have some."
          />
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-6">
          <Section title="Overdue orders" count={data.overdueOrders.length}>
            {data.overdueOrders.map((o) => (
              <DashboardOrderRow key={o.id} order={o} emphasis="date" />
            ))}
          </Section>

          <Section title="Overdue tasks" count={data.overdueTasks.length}>
            {data.overdueTasks.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </Section>

          <Section title="Due today" count={data.todayTasks.length}>
            {data.todayTasks.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </Section>

          <Section title="Waiting for payment" count={data.waitingForPaymentOrders.length}>
            {data.waitingForPaymentOrders.map((o) => (
              <DashboardOrderRow key={o.id} order={o} emphasis="balance" />
            ))}
          </Section>

          <Section title="Due soon (next 7 days)" count={data.dueSoonOrders.length}>
            {data.dueSoonOrders.map((o) => (
              <DashboardOrderRow key={o.id} order={o} emphasis="date" />
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div>
      <h2 className="mb-2 text-xs font-medium text-muted-foreground uppercase">
        {title} ({count})
      </h2>
      <div className="rounded-lg border">{children}</div>
    </div>
  );
}
