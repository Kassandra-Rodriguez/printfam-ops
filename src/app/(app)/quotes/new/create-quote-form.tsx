"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import { createQuoteSchema, type CreateQuoteInput } from "@/lib/validation/quotes";
import { createQuoteAction } from "../actions";

const ITEM_TYPES: { value: CreateQuoteInput["items"][number]["itemType"]; label: string }[] = [
  { value: "product", label: "Product" },
  { value: "labor", label: "Labor" },
  { value: "material", label: "Material" },
  { value: "custom", label: "Custom" },
];

export function CreateQuoteForm({
  customers,
  requestId,
  initialCustomerId,
}: {
  customers: { id: string; name: string }[];
  requestId?: string;
  initialCustomerId?: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CreateQuoteInput>({
    resolver: zodResolver(createQuoteSchema),
    defaultValues: {
      customerId: initialCustomerId ?? "",
      requestId,
      items: [{ description: "", quantity: 1, unitPrice: 0, itemType: "custom" }],
      discountTotal: 0,
      taxTotal: 0,
      shippingCost: 0,
      depositAmount: 0,
      expiresAt: "",
      terms: "",
      customerNotes: "",
    },
  });

  const itemsArray = useFieldArray({ control: form.control, name: "items" });
  const items = form.watch("items") ?? [];
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0,
  );
  const discountTotal = Number(form.watch("discountTotal") ?? 0);
  const taxTotal = Number(form.watch("taxTotal") ?? 0);
  const shippingCost = Number(form.watch("shippingCost") ?? 0);
  const depositAmount = Number(form.watch("depositAmount") ?? 0);
  const total = subtotal - discountTotal + taxTotal + shippingCost;

  async function onSubmit(values: CreateQuoteInput) {
    setSubmitting(true);
    const result = await createQuoteAction(values);
    setSubmitting(false);

    if (result.status === "error") {
      toast.error(result.error);
      return;
    }
    toast.success("Quote saved as draft");
    router.push(`/quotes/${result.quoteId}`);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-col gap-2">
            <Label>Customer</Label>
            <Select
              value={form.watch("customerId")}
              onValueChange={(v: string) => form.setValue("customerId", v, { shouldValidate: true })}
            >
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
            {customers.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No customers yet —{" "}
                <Link href="/customers/new" className="underline">
                  create one first
                </Link>
                .
              </p>
            ) : null}
            <FieldError message={form.formState.errors.customerId?.message} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="expiresAt">Expires</Label>
            <Input id="expiresAt" type="date" {...form.register("expiresAt")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <div className="flex items-center justify-between">
            <Label>Line items</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                itemsArray.append({ description: "", quantity: 1, unitPrice: 0, itemType: "custom" })
              }
            >
              <Plus className="size-4" />
              Add item
            </Button>
          </div>
          <FieldError message={form.formState.errors.items?.message} />
          {itemsArray.fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-[1fr_5rem_6rem_8rem_auto] items-end gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Description</Label>
                <Input {...form.register(`items.${index}.description` as const)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Qty</Label>
                <Input type="number" step="1" min="1" {...form.register(`items.${index}.quantity` as const)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Unit price</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register(`items.${index}.unitPrice` as const)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Type</Label>
                <Select
                  value={form.watch(`items.${index}.itemType`)}
                  onValueChange={(v: string) =>
                    form.setValue(`items.${index}.itemType`, v as CreateQuoteInput["items"][number]["itemType"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => itemsArray.remove(index)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}

          <div className="grid grid-cols-4 gap-3 border-t pt-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Discount</Label>
              <Input type="number" step="0.01" min="0" {...form.register("discountTotal")} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Tax</Label>
              <Input type="number" step="0.01" min="0" {...form.register("taxTotal")} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Shipping</Label>
              <Input type="number" step="0.01" min="0" {...form.register("shippingCost")} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Deposit</Label>
              <Input type="number" step="0.01" min="0" {...form.register("depositAmount")} />
            </div>
          </div>

          <div className="flex flex-col gap-1 border-t pt-3 text-sm">
            <SummaryRow label="Subtotal" value={subtotal} />
            {discountTotal > 0 ? <SummaryRow label="Discount" value={-discountTotal} /> : null}
            {taxTotal > 0 ? <SummaryRow label="Tax" value={taxTotal} /> : null}
            {shippingCost > 0 ? <SummaryRow label="Shipping" value={shippingCost} /> : null}
            <SummaryRow label="Total" value={total} highlight />
            {depositAmount > 0 ? <SummaryRow label="Deposit required" value={depositAmount} /> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="terms">Terms</Label>
            <Textarea id="terms" rows={2} {...form.register("terms")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="customerNotes">Notes to customer</Label>
            <Textarea id="customerNotes" rows={2} {...form.register("customerNotes")} />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={submitting} className="self-start">
        {submitting ? "Saving…" : "Save draft"}
      </Button>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function SummaryRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={highlight ? "font-medium" : "text-muted-foreground"}>{label}</span>
      <span className={highlight ? "font-medium tabular-nums" : "tabular-nums"}>{formatCurrency(value)}</span>
    </div>
  );
}
