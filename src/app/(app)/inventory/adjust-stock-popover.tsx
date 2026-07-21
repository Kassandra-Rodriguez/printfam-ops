"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adjustStockAction } from "./actions";

/** docs/screens.md #20: "Adjust stock (popover: amount + reason, not a full modal)." */
export function AdjustStockPopover({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    const result = await adjustStockAction({
      productId,
      quantityDelta: formData.get("quantityDelta") as string,
      reason: formData.get("reason") as "manual_adjustment" | "restock" | "correction",
      note: (formData.get("note") as string) || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Stock adjusted");
    setOpen(false);
    router.refresh();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">
          <PackagePlus className="size-4" />
          Adjust stock
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <form action={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quantityDelta">Amount</Label>
            <Input
              id="quantityDelta"
              name="quantityDelta"
              type="number"
              step="1"
              placeholder="e.g. 10 or -3"
              required
            />
            <p className="text-xs text-muted-foreground">Positive to add, negative to remove.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Select name="reason" defaultValue="restock">
              <SelectTrigger id="reason" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="restock">Restock</SelectItem>
                <SelectItem value="correction">Correction</SelectItem>
                <SelectItem value="manual_adjustment">Manual adjustment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">Note</Label>
            <Input id="note" name="note" placeholder="Optional" />
          </div>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? "Saving…" : "Save adjustment"}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
