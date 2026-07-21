import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireOrgContext } from "@/server/authz/session";
import { listQuotes } from "@/server/data/quotes";
import { QuotesTable } from "./quotes-table";

export default async function QuotesPage() {
  const ctx = await requireOrgContext();
  const quotes = await listQuotes(ctx.supabase, ctx.activeMembership.organization_id);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Quotes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Price out custom or bulk work before committing to an order.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/quotes/new">
            <Plus className="size-4" />
            New Quote
          </Link>
        </Button>
      </div>

      <QuotesTable quotes={quotes} />
    </div>
  );
}
