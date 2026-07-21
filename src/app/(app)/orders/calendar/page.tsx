import Link from "next/link";
import { ChevronLeft, ChevronRight, List } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isToday,
  parse,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { requireOrgContext } from "@/server/authz/session";
import { listOrdersForCalendar } from "@/server/data/orders";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function OrdersCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const ctx = await requireOrgContext();

  const anchorDate = month ? parse(month, "yyyy-MM", new Date()) : new Date();
  const monthStart = startOfMonth(anchorDate);
  const monthEnd = endOfMonth(anchorDate);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const orders = await listOrdersForCalendar(
    ctx.supabase,
    ctx.activeMembership.organization_id,
    format(gridStart, "yyyy-MM-dd"),
    format(gridEnd, "yyyy-MM-dd"),
  );

  const ordersByDay = new Map<string, typeof orders>();
  for (const order of orders) {
    const key = order.promised_date;
    ordersByDay.set(key, [...(ordersByDay.get(key) ?? []), order]);
  }

  const prevMonth = format(subMonths(monthStart, 1), "yyyy-MM");
  const nextMonth = format(addMonths(monthStart, 1), "yyyy-MM");

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Orders — {format(monthStart, "MMMM yyyy")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Due dates across the month.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/orders/calendar?month=${prevMonth}`}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/orders/calendar?month=${nextMonth}`}>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/orders">
              <List className="size-4" />
              List view
            </Link>
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="grid grid-cols-7 border-b bg-muted/40 text-xs text-muted-foreground">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="px-2 py-1.5 font-medium">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayOrders = ordersByDay.get(key) ?? [];
            const inMonth = isSameMonth(day, monthStart);
            return (
              <div
                key={key}
                className={`min-h-24 border-r border-b p-1.5 last:border-r-0 ${inMonth ? "" : "bg-muted/20"}`}
              >
                <span
                  className={`text-xs ${isToday(day) ? "flex size-5 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground" : "text-muted-foreground"}`}
                >
                  {format(day, "d")}
                </span>
                <div className="mt-1 flex flex-col gap-1">
                  {dayOrders.map((o) => (
                    <Link
                      key={o.id}
                      href={`/orders/${o.id}`}
                      className="block truncate rounded px-1 py-0.5 text-xs hover:bg-muted"
                      title={`${o.order_number} — ${o.customer?.display_name ?? ""}`}
                    >
                      <StatusBadge
                        label={o.title ?? o.order_number}
                        category={(o.status?.category as "neutral" | "info" | "warning" | "danger" | "success") ?? "neutral"}
                        className="max-w-full truncate"
                      />
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
