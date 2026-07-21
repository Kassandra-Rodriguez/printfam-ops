"use client";

import { useState } from "react";
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
import { updateOrderSchema, type UpdateOrderInput } from "@/lib/validation/orders";
import { updateOrderAction } from "../../actions";

const SOURCES = [
  { value: "instagram", label: "Instagram" },
  { value: "text", label: "Text" },
  { value: "shopify", label: "Shopify" },
  { value: "tiktok", label: "TikTok Shop" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "in_person", label: "In person" },
  { value: "returning_customer", label: "Returning customer" },
  { value: "other", label: "Other" },
] as const;

export function EditOrderForm({
  orderId,
  customers,
  defaultValues,
  products = [],
}: {
  orderId: string;
  customers: { id: string; name: string }[];
  defaultValues: Omit<UpdateOrderInput, "orderId">;
  products?: { id: string; name: string; availableQuantity: number }[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<UpdateOrderInput>({
    resolver: zodResolver(updateOrderSchema),
    defaultValues: { orderId, ...defaultValues },
  });

  const itemsArray = useFieldArray({ control: form.control, name: "items" });

  async function onSubmit(values: UpdateOrderInput) {
    setSubmitting(true);
    const result = await updateOrderAction(values);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Order updated");
    router.push(`/orders/${orderId}`);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="grid grid-cols-2 gap-3">
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
            </div>
            <div className="flex flex-col gap-2">
              <Label>Source</Label>
              <Select
                value={form.watch("source") ?? ""}
                onValueChange={(v: string) =>
                  form.setValue("source", v as UpdateOrderInput["source"])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Order title</Label>
            <Input id="title" {...form.register("title")} />
            {form.formState.errors.title ? (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="promisedDate">Due date</Label>
              <Input id="promisedDate" type="date" {...form.register("promisedDate")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="internalDeadline">Internal deadline</Label>
              <Input id="internalDeadline" type="date" {...form.register("internalDeadline")} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} {...form.register("notes")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <div className="flex items-center justify-between">
            <Label>Items</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                itemsArray.append({
                  description: "",
                  quantity: 1,
                  unitPrice: 0,
                  itemType: "custom_line_item",
                })
              }
            >
              <Plus className="size-4" />
              Add item
            </Button>
          </div>
          {form.formState.errors.items?.message ? (
            <p className="text-xs text-destructive">{form.formState.errors.items.message}</p>
          ) : null}
          {itemsArray.fields.map((field, index) => (
            <div key={field.id} className="flex flex-col gap-2 rounded-md border p-2">
              <div className="grid grid-cols-[1fr_5rem_6rem_auto] items-end gap-2">
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => itemsArray.remove(index)}
                  disabled={itemsArray.fields.length === 1}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              {products.length > 0 ? (
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Link to product (optional — enables inventory tracking)</Label>
                  <Select
                    value={form.watch(`items.${index}.productId`) ?? "none"}
                    onValueChange={(v: string) => {
                      if (v === "none") {
                        form.setValue(`items.${index}.productId`, undefined);
                        form.setValue(`items.${index}.itemType`, "custom_line_item");
                        return;
                      }
                      const product = products.find((p) => p.id === v);
                      form.setValue(`items.${index}.productId`, v);
                      form.setValue(`items.${index}.itemType`, "catalog_product");
                      if (product && !form.getValues(`items.${index}.description`)) {
                        form.setValue(`items.${index}.description`, product.name);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Not linked" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not linked</SelectItem>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.availableQuantity} available)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
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
              <Label className="text-xs">Deposit required</Label>
              <Input type="number" step="0.01" min="0" {...form.register("depositRequired")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={submitting} className="self-start">
        {submitting ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
