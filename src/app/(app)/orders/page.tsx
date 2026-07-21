import Link from "next/link";
import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireOrgContext } from "@/server/authz/session";
import { listOrders } from "@/server/data/orders";
import { listSavedFilters } from "@/server/data/savedFilters";
import { OrdersTable } from "./orders-table";
import { OrderFilters } from "./order-filters";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ orderType?: string; statusCategory?: string; source?: string }>;
}) {
  const { orderType, statusCategory, source } = await searchParams;
  const ctx = await requireOrgContext();
  const [orders, savedFilters] = await Promise.all([
    listOrders(ctx.supabase, ctx.activeMembership.organization_id, { orderType, statusCategory, source }),
    listSavedFilters(ctx.supabase, "orders"),
  ]);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Custom, existing-product, bulk, and service orders — including ones already
            in progress.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/orders/calendar">
              <Calendar className="size-4" />
              Calendar view
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/orders/new">
              <Plus className="size-4" />
              New Order
            </Link>
          </Button>
        </div>
      </div>

      <OrderFilters savedFilters={savedFilters} />
      <OrdersTable orders={orders} />
    </div>
  );
}
