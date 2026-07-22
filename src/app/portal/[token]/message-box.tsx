"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import type { PortalMessageView } from "@/server/data/portalViews";

/** Async, not real-time — polls so a staff reply shows up without the customer manually reloading (docs/architecture.md #9: no Supabase Realtime wired up). */
const POLL_INTERVAL_MS = 8000;

/** docs/user_flows.md Flow J step 2 — shared across every portal scope type (screens.md #23's "message box"). */
export function PortalMessageBox({ token, messages }: { token: string; messages: PortalMessageView[] }) {
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [router]);

  function send() {
    if (!body.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/portal/${token}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not send. Try again.");
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Messages</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((m) => (
              <div
                key={m.id}
                className={m.sent_by_customer ? "self-end rounded-md bg-primary/10 px-3 py-2 text-sm" : "rounded-md border px-3 py-2 text-sm"}
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(m.occurred_at)}</p>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Send a message…" />
          <Button size="sm" className="self-start" disabled={isPending || !body.trim()} onClick={send}>
            Send
          </Button>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
