import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireOrgContext } from "@/server/authz/session";
import { listOrders } from "@/server/data/orders";
import { OrdersTable } from "./orders-table";

export default async function OrdersPage() {
  const ctx = await requireOrgContext();
  const orders = await listOrders(ctx.supabase, ctx.activeMembership.organization_id);

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
        <Button asChild size="sm">
          <Link href="/orders/new">
            <Plus className="size-4" />
            New Order
          </Link>
        </Button>
      </div>

      <OrdersTable orders={orders} />
    </div>
  );
}
