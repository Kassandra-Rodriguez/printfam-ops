"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { setRepairApprovalAction } from "../actions";

/**
 * Records the customer's decision on the recommended repair by staff relaying
 * it (docs/user_flows.md Flow D step 3) — the portal-token self-serve version
 * of this ships in Phase 7 per docs/build_phases.md.
 */
export function RepairApprovalControl({
  repairTicketId,
  customerApprovedAt,
}: {
  repairTicketId: string;
  customerApprovedAt: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function setApproval(approved: boolean) {
    startTransition(async () => {
      const result = await setRepairApprovalAction(repairTicketId, approved);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (customerApprovedAt) {
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-emerald-700 dark:text-emerald-400">
          Customer approved {formatDateTime(customerApprovedAt)}
        </span>
        <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setApproval(false)}>
          Undo
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button size="sm" disabled={isPending} onClick={() => setApproval(true)}>
        <Check className="size-4" />
        Mark customer approved
      </Button>
      <p className="text-xs text-muted-foreground">
        If declined, move status to Closed/Cancelled below instead.
      </p>
    </div>
  );
}
