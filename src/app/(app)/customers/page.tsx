import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { requireOrgContext } from "@/server/authz/session";
import { listCustomers } from "@/server/data/customers";
import { formatCurrency } from "@/lib/format";

export default async function CustomersPage() {
  const ctx = await requireOrgContext();
  const customers = await listCustomers(ctx.supabase, ctx.activeMembership.organization_id);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every person or business you&apos;ve worked with, in one profile.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/customers/new">
            <Plus className="size-4" />
            New Customer
          </Link>
        </Button>
      </div>

      {customers.length === 0 ? (
        <div className="rounded-lg border">
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="Add your first customer to start creating orders, requests, and repairs for them."
            action={
              <Button asChild size="sm">
                <Link href="/customers/new">Create your first customer</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium text-right">Outstanding balance</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2.5">
                    <Link href={`/customers/${c.id}`} className="font-medium hover:underline">
                      {c.display_name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.phone || "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.email || "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {c.outstanding_balance > 0 ? (
                      <span className="font-medium text-amber-700 dark:text-amber-400">
                        {formatCurrency(c.outstanding_balance)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
