"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { issuePortalLinkAction } from "@/app/(app)/portal-links/actions";
import type { PortalScopeType } from "@/server/domain/portal/issuePortalToken";

export function SharePortalLinkButton({
  scopeType,
  scopeId,
  customerId,
}: {
  scopeType: PortalScopeType;
  scopeId: string;
  customerId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [link, setLink] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      const result = await issuePortalLinkAction(scopeType, scopeId, customerId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.portalPath) {
        setLink(`${window.location.origin}${result.portalPath}`);
      } else {
        toast.success("An active link already exists for this — nothing new to send.");
      }
    });
  }

  if (link) {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs">
        <span className="max-w-56 truncate">{link}</span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            navigator.clipboard.writeText(link);
            toast.success("Link copied");
          }}
        >
          <Copy className="size-3.5" />
          Copy
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" variant="outline" disabled={isPending} onClick={handleClick}>
      <LinkIcon className="size-4" />
      Share portal link
    </Button>
  );
}
