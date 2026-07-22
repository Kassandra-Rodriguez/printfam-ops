"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendQuoteAction } from "../actions";

/** docs/user_flows.md Flow E step 2 — shows the portal link once so staff can paste it into a text/DM/email themselves (v1 has no automated email/SMS send). */
export function SendQuoteButton({ quoteId, alreadySent }: { quoteId: string; alreadySent: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [link, setLink] = useState<string | null>(null);
  const router = useRouter();

  function handleSend(forceReissue = false) {
    startTransition(async () => {
      const result = await sendQuoteAction(quoteId, forceReissue);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.portalPath) {
        setLink(`${window.location.origin}${result.portalPath}`);
      } else {
        toast.success("Customer's existing link is still active — nothing new to send.");
      }
      router.refresh();
    });
  }

  function copyLink() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    toast.success("Link copied");
  }

  if (link) {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs">
        <span className="truncate">{link}</span>
        <Button type="button" size="sm" variant="ghost" onClick={copyLink}>
          <Copy className="size-3.5" />
          Copy
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" disabled={isPending} onClick={() => handleSend(false)}>
        <Send className="size-4" />
        {alreadySent ? "Resend link" : "Send to customer"}
      </Button>
      {alreadySent ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => handleSend(true)}
          title="Generate a fresh link to copy — replaces the previous one"
        >
          <RefreshCw className="size-3.5" />
          Copy link again
        </Button>
      ) : null}
    </div>
  );
}
