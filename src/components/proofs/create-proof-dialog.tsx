"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProofAction } from "@/app/(app)/proofs/actions";

export function CreateProofDialog({ orderId, repairTicketId }: { orderId?: string; repairTicketId?: string }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    const result = await createProofAction({
      orderId,
      repairTicketId,
      title: formData.get("title") as string,
      approvalRequired: formData.get("approvalRequired") === "on",
      visibility: formData.get("visibility") === "on" ? "customer_visible" : "internal_only",
    });
    setSubmitting(false);

    if (result.status === "error") {
      toast.error(result.error);
      return;
    }
    toast.success("Proof created");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-4" />
          New proof
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New proof</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" placeholder="e.g. Logo mockup" required />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="approvalRequired" defaultChecked />
            Approval required to unlock production
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="visibility" />
            Customer-visible (uncheck for an internal-only draft)
          </label>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create proof"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
