"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { recordQuoteResponseAction } from "../actions";

/** Flow E step 4's staff-relayed path — the portal-token self-serve version is Flow J, handled by the customer portal itself. */
export function QuoteResponseControl({
  quoteId,
  approvedAt,
  declinedAt,
}: {
  quoteId: string;
  approvedAt: string | null;
  declinedAt: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const router = useRouter();

  function respond(response: "approved" | "declined") {
    startTransition(async () => {
      const result = await recordQuoteResponseAction(quoteId, response, response === "declined" ? reason : undefined);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDeclining(false);
      setReason("");
      router.refresh();
    });
  }

  if (approvedAt) {
    return (
      <p className="text-sm text-emerald-700 dark:text-emerald-400">
        Customer approved {formatDateTime(approvedAt)}
      </p>
    );
  }
  if (declinedAt) {
    return <p className="text-sm text-red-700 dark:text-red-400">Customer declined {formatDateTime(declinedAt)}</p>;
  }

  if (declining) {
    return (
      <div className="flex flex-col gap-2">
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          rows={2}
        />
        <div className="flex gap-2">
          <Button size="sm" variant="destructive" disabled={isPending} onClick={() => respond("declined")}>
            Confirm decline
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDeclining(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={isPending} onClick={() => respond("approved")}>
        <Check className="size-4" />
        Record approval
      </Button>
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => setDeclining(true)}>
        <X className="size-4" />
        Record decline
      </Button>
    </div>
  );
}
