"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logCommunicationAction } from "@/app/(app)/inbox/actions";

const CHANNELS = [
  { value: "instagram", label: "Instagram" },
  { value: "text", label: "Text" },
  { value: "tiktok_shop", label: "TikTok Shop" },
  { value: "shopify", label: "Shopify" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "in_person", label: "In person" },
  { value: "other", label: "Other" },
] as const;

export function LogCommunicationDialog({
  customerId,
  requestId,
  orderId,
  repairTicketId,
  customers,
}: {
  customerId?: string;
  requestId?: string;
  orderId?: string;
  repairTicketId?: string;
  customers?: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    const resolvedCustomerId = customerId ?? (formData.get("customerId") as string);
    if (!resolvedCustomerId) {
      toast.error("Select a customer");
      return;
    }

    setSubmitting(true);
    const result = await logCommunicationAction({
      customerId: resolvedCustomerId,
      channel: formData.get("channel") as (typeof CHANNELS)[number]["value"],
      direction: formData.get("direction") as "incoming" | "outgoing",
      body: formData.get("body") as string,
      relatedRequestId: requestId,
      relatedOrderId: orderId,
      relatedRepairTicketId: repairTicketId,
      followUpRequired,
      followUpDate: (formData.get("followUpDate") as string) || undefined,
    });
    setSubmitting(false);

    if (result.status === "error") {
      toast.error(result.error);
      return;
    }
    toast.success("Message logged");
    setOpen(false);
    setFollowUpRequired(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <MessageSquarePlus className="size-4" />
          Log message
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a communication</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          {!customerId && customers ? (
            <div className="flex flex-col gap-2">
              <Label>Customer</Label>
              <Select name="customerId" required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Channel</Label>
              <Select name="channel" defaultValue="text">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Direction</Label>
              <Select name="direction" defaultValue="incoming">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incoming">From customer</SelectItem>
                  <SelectItem value="outgoing">To customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="body">Message</Label>
            <Textarea id="body" name="body" rows={4} required placeholder="Paste or type the message…" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={followUpRequired}
                onChange={(e) => setFollowUpRequired(e.target.checked)}
              />
              Needs a follow-up
            </label>
            {followUpRequired ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="followUpDate">Follow up on</Label>
                <input
                  id="followUpDate"
                  name="followUpDate"
                  type="date"
                  className="h-9 rounded-md border px-3 text-sm"
                />
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Log message"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
