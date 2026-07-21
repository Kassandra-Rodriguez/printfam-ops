"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProductSchema, type UpdateProductInput } from "@/lib/validation/products";
import { updateProductAction } from "../actions";

export function EditProductForm({
  productId,
  defaultValues,
  showCost,
}: {
  productId: string;
  defaultValues: Omit<UpdateProductInput, "productId">;
  showCost: boolean;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<UpdateProductInput>({
    resolver: zodResolver(updateProductSchema),
    defaultValues: { productId, ...defaultValues },
  });

  async function onSubmit(values: UpdateProductInput) {
    setSubmitting(true);
    const result = await updateProductAction(values);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Product updated");
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...form.register("sku")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" {...form.register("category")} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={2} {...form.register("description")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sellingPrice">Selling price</Label>
              <Input id="sellingPrice" type="number" step="0.01" min="0" {...form.register("sellingPrice")} />
            </div>
            {showCost ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="cost">Cost</Label>
                <Input id="cost" type="number" step="0.01" min="0" {...form.register("cost")} />
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reorderLevel">Reorder level</Label>
            <Input id="reorderLevel" type="number" step="1" min="0" {...form.register("reorderLevel")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="productionNotes">Production notes</Label>
            <Textarea id="productionNotes" rows={2} {...form.register("productionNotes")} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register("isActive")} />
            Active
          </label>
        </CardContent>
      </Card>

      <Button type="submit" disabled={submitting} className="self-start">
        {submitting ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
