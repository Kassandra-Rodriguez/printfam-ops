import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireOrgContext } from "@/server/authz/session";
import { listProducts } from "@/server/data/products";
import { InventoryTable } from "./inventory-table";

export default async function InventoryPage() {
  const ctx = await requireOrgContext();
  // docs/security.md #3: cost/profit excluded from any Team Member-reachable query.
  const showCost = ctx.activeMembership.role.key !== "team_member";
  const products = await listProducts(ctx.supabase, ctx.activeMembership.organization_id, showCost);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">Product catalog and stock levels.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/inventory/new">
            <Plus className="size-4" />
            New Product
          </Link>
        </Button>
      </div>

      <InventoryTable products={products} showCost={showCost} />
    </div>
  );
}
