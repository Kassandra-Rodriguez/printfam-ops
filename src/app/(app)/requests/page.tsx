import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireOrgContext } from "@/server/authz/session";
import { listRequests } from "@/server/data/requests";
import { RequestsTable } from "./requests-table";

export default async function RequestsPage() {
  const ctx = await requireOrgContext();
  const requests = await listRequests(ctx.supabase, ctx.activeMembership.organization_id);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Inquiries and leads — not yet committed work. Convert one to an order once
            it&apos;s ready.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/requests/new">
            <Plus className="size-4" />
            New Request
          </Link>
        </Button>
      </div>

      <RequestsTable requests={requests} />
    </div>
  );
}
