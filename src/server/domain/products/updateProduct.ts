import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateProductSchema, type UpdateProductInput } from "@/lib/validation/products";
import { updateProductFields } from "@/server/data/products";

export type UpdateProductResult = { ok: true } | { ok: false; error: string };

/** Stock quantity isn't editable here — recordInventoryTransaction (via adjustStock.ts or an order-status trigger) is the only path that changes available_quantity, so every change stays auditable. */
export async function updateProduct(
  supabase: SupabaseClient,
  input: UpdateProductInput,
): Promise<UpdateProductResult> {
  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await updateProductFields(supabase, parsed.data.productId, parsed.data);
    return { ok: true };
  } catch (err) {
    console.error("updateProduct failed:", err);
    return { ok: false, error: "Could not update the product. Try again." };
  }
}
