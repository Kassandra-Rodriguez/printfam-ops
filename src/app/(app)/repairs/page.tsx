import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireOrgContext } from "@/server/authz/session";
import { listRepairTickets } from "@/server/data/repairs";
import { RepairsTable } from "./repairs-table";

export default async function RepairsPage() {
  const ctx = await requireOrgContext();
  const repairs = await listRepairTickets(ctx.supabase, ctx.activeMembership.organization_id);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Repairs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Devices in for repair, from intake through pickup — including ones already
            in progress.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/repairs/new">
            <Plus className="size-4" />
            New Repair
          </Link>
        </Button>
      </div>

      <RepairsTable repairs={repairs} />
    </div>
  );
}
