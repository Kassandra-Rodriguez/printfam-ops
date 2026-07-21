"use server";

import { revalidatePath } from "next/cache";
import { requireOrgContext } from "@/server/authz/session";
import { createProduct, type CreateProductResult } from "@/server/domain/products/createProduct";
import { updateProduct, type UpdateProductResult } from "@/server/domain/products/updateProduct";
import { adjustStock, type AdjustStockResult } from "@/server/domain/products/adjustStock";
import type { CreateProductInput, UpdateProductInput, AdjustStockInput } from "@/lib/validation/products";

export async function createProductAction(input: CreateProductInput): Promise<CreateProductResult> {
  const ctx = await requireOrgContext();
  const result = await createProduct(ctx.supabase, ctx.activeMembership.organization_id, ctx.userId, input);
  revalidatePath("/inventory");
  return result;
}

export async function updateProductAction(input: UpdateProductInput): Promise<UpdateProductResult> {
  const ctx = await requireOrgContext();
  const result = await updateProduct(ctx.supabase, input);
  revalidatePath(`/inventory/${input.productId}`);
  revalidatePath("/inventory");
  return result;
}

export async function adjustStockAction(input: AdjustStockInput): Promise<AdjustStockResult> {
  const ctx = await requireOrgContext();
  const result = await adjustStock(ctx.supabase, ctx.activeMembership.organization_id, ctx.userId, input);
  revalidatePath(`/inventory/${input.productId}`);
  revalidatePath("/inventory");
  return result;
}
