"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";
import { logCommunicationAction } from "./actions";
import type { ThreadMessageRow } from "@/server/data/communications";
import type { LogCommunicationInput } from "@/lib/validation/communications";

const CHANNEL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  text: "Text",
  tiktok_shop: "TikTok Shop",
  shopify: "Shopify",
  email: "Email",
  phone: "Phone",
  in_person: "In person",
  other: "Other",
};
const CHANNELS = Object.keys(CHANNEL_LABELS);

/** Async, not real-time (no Supabase Realtime wired up — see docs/architecture.md #9), but polls often enough to feel like a live thread without that infrastructure. */
const POLL_INTERVAL_MS = 6000;

export function ThreadView({
  customerId,
  customerName,
  initialMessages,
  lastChannel,
}: {
  customerId: string;
  customerName: string;
  initialMessages: ThreadMessageRow[];
  lastChannel: string;
}) {
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState(lastChannel);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [initialMessages.length]);

  function send() {
    if (!body.trim()) return;
    startTransition(async () => {
      const result = await logCommunicationAction({
        customerId,
        channel: channel as LogCommunicationInput["channel"],
        direction: "outgoing",
        body,
        followUpRequired: false,
      });
      if (result.status === "error") {
        toast.error(result.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b p-3">
        <span className="text-sm font-semibold">{customerName}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-2">
          {initialMessages.map((m) => (
            <div key={m.id} className={m.direction === "outgoing" ? "self-end" : "self-start"}>
              <div
                className={
                  m.direction === "outgoing"
                    ? "max-w-md rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "max-w-md rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm"
                }
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {CHANNEL_LABELS[m.channel] ?? m.channel} · {formatDateTime(m.occurred_at)}
                {m.sent_by_customer ? " · via portal" : ""}
              </p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t p-3">
        <div className="flex items-center gap-2">
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="h-7 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNELS.map((c) => (
                <SelectItem key={c} value={c}>
                  {CHANNEL_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder="Type a message…"
            className="flex-1"
          />
          <Button size="sm" disabled={isPending || !body.trim()} onClick={send}>
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
