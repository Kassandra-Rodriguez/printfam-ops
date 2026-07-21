import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adjustStockSchema, type AdjustStockInput } from "@/lib/validation/products";
import { recordInventoryTransaction } from "@/server/data/products";

export type AdjustStockResult = { ok: true } | { ok: false; error: string };

/** docs/screens.md #20's "Adjust stock" popover. */
export async function adjustStock(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: AdjustStockInput,
): Promise<AdjustStockResult> {
  const parsed = adjustStockSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await recordInventoryTransaction(supabase, organizationId, {
      productId: parsed.data.productId,
      quantityDelta: parsed.data.quantityDelta,
      reason: parsed.data.reason,
      note: parsed.data.note,
      createdBy: userId,
    });
    return { ok: true };
  } catch (err) {
    console.error("adjustStock failed:", err);
    return { ok: false, error: "Could not adjust stock. Try again." };
  }
}
