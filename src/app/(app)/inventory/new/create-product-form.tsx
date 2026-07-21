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
import { createProductSchema, type CreateProductInput } from "@/lib/validation/products";
import { createProductAction } from "../actions";

export function CreateProductForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      sku: "",
      sellingPrice: 0,
      cost: undefined,
      availableQuantity: 0,
      reorderLevel: 0,
      productionNotes: "",
    },
  });

  async function onSubmit(values: CreateProductInput) {
    setSubmitting(true);
    const result = await createProductAction(values);
    setSubmitting(false);

    if (result.status === "error") {
      toast.error(result.error);
      return;
    }
    toast.success("Product created");
    router.push(`/inventory/${result.productId}`);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...form.register("name")} placeholder="e.g. CardKit — Standard" />
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="cost">Cost</Label>
              <Input id="cost" type="number" step="0.01" min="0" {...form.register("cost")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="availableQuantity">Starting quantity</Label>
              <Input
                id="availableQuantity"
                type="number"
                step="1"
                min="0"
                {...form.register("availableQuantity")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="reorderLevel">Reorder level</Label>
              <Input id="reorderLevel" type="number" step="1" min="0" {...form.register("reorderLevel")} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="productionNotes">Production notes</Label>
            <Textarea id="productionNotes" rows={2} {...form.register("productionNotes")} />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={submitting} className="self-start">
        {submitting ? "Saving…" : "Create product"}
      </Button>
    </form>
  );
}
