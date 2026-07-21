import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createProductSchema, type CreateProductInput } from "@/lib/validation/products";
import { insertProduct } from "@/server/data/products";

export type CreateProductResult = { status: "created"; productId: string } | { status: "error"; error: string };

export async function createProduct(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: CreateProductInput,
): Promise<CreateProductResult> {
  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const productId = await insertProduct(supabase, organizationId, userId, parsed.data);
    return { status: "created", productId };
  } catch (err) {
    console.error("createProduct failed:", err);
    return { status: "error", error: "Could not create the product. Try again." };
  }
}
