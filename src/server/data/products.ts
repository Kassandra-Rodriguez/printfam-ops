import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ProductListRow = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  selling_price: number;
  cost: number | null;
  available_quantity: number;
  reserved_quantity: number;
  reorder_level: number;
  is_active: boolean;
};

const BASE_PRODUCT_COLUMNS =
  "id, name, sku, category, selling_price, available_quantity, reserved_quantity, reorder_level, is_active";

/**
 * `includeCost` must only ever be true for an Owner/Manager caller —
 * docs/security.md #3: "Cost and profit fields... excluded from any query
 * path reachable by Team Member or Customer," enforced here at the one
 * place products get listed, not left to callers to remember.
 */
export async function listProducts(
  supabase: SupabaseClient,
  organizationId: string,
  includeCost: boolean,
): Promise<ProductListRow[]> {
  const { data, error } = await supabase
    .from("products")
    .select(includeCost ? `${BASE_PRODUCT_COLUMNS}, cost` : BASE_PRODUCT_COLUMNS)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as ProductListRow[]).map((p) => ({ ...p, cost: includeCost ? (p.cost ?? null) : null }));
}

export type ProductTransactionRow = {
  id: string;
  quantity_delta: number;
  reason: string;
  note: string | null;
  order: { id: string; order_number: string } | null;
  created_at: string;
};

export async function getProduct(
  supabase: SupabaseClient,
  organizationId: string,
  productId: string,
  includeCost: boolean,
): Promise<(ProductListRow & { description: string | null; production_notes: string | null }) | null> {
  const { data, error } = await supabase
    .from("products")
    .select(
      `${BASE_PRODUCT_COLUMNS}, description, production_notes${includeCost ? ", cost" : ""}`,
    )
    .eq("id", productId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as ProductListRow & { description: string | null; production_notes: string | null };
  return { ...row, cost: includeCost ? (row.cost ?? null) : null };
}

export async function listTransactionsForProduct(
  supabase: SupabaseClient,
  organizationId: string,
  productId: string,
): Promise<ProductTransactionRow[]> {
  const { data, error } = await supabase
    .from("inventory_transactions")
    .select("id, quantity_delta, reason, note, created_at, order:orders(id, order_number)")
    .eq("organization_id", organizationId)
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ProductTransactionRow[];
}

export async function insertProduct(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: {
    name: string;
    description?: string;
    category?: string;
    sku?: string;
    sellingPrice: number;
    cost?: number;
    availableQuantity: number;
    reorderLevel: number;
    productionNotes?: string;
  },
): Promise<string> {
  const { data, error } = await supabase
    .from("products")
    .insert({
      organization_id: organizationId,
      name: input.name,
      description: input.description || null,
      category: input.category || null,
      sku: input.sku || null,
      selling_price: input.sellingPrice,
      cost: input.cost ?? null,
      available_quantity: input.availableQuantity,
      reorder_level: input.reorderLevel,
      production_notes: input.productionNotes || null,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateProductFields(
  supabase: SupabaseClient,
  productId: string,
  input: {
    name: string;
    description?: string;
    category?: string;
    sku?: string;
    sellingPrice: number;
    cost?: number;
    reorderLevel: number;
    productionNotes?: string;
    isActive: boolean;
  },
) {
  const { error } = await supabase
    .from("products")
    .update({
      name: input.name,
      description: input.description || null,
      category: input.category || null,
      sku: input.sku || null,
      selling_price: input.sellingPrice,
      cost: input.cost ?? null,
      reorder_level: input.reorderLevel,
      production_notes: input.productionNotes || null,
      is_active: input.isActive,
    })
    .eq("id", productId);
  if (error) throw error;
}

/**
 * The one place available_quantity changes and an inventory_transactions row
 * is written together — manual adjustments (screens.md #20 popover) and
 * order-status-triggered movements (server/domain/orders/applyInventoryTrigger.ts)
 * both call this, so "every stock change is auditable" holds by construction.
 */
export async function recordInventoryTransaction(
  supabase: SupabaseClient,
  organizationId: string,
  input: {
    productId: string;
    orderId?: string;
    quantityDelta: number;
    reason: "order_fulfillment" | "manual_adjustment" | "restock" | "correction";
    note?: string;
    createdBy?: string;
  },
) {
  const { error: txError } = await supabase.from("inventory_transactions").insert({
    organization_id: organizationId,
    product_id: input.productId,
    order_id: input.orderId ?? null,
    quantity_delta: input.quantityDelta,
    reason: input.reason,
    note: input.note || null,
    created_by: input.createdBy ?? null,
  });
  if (txError) throw txError;

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("available_quantity")
    .eq("id", input.productId)
    .single();
  if (productError) throw productError;

  const { error: updateError } = await supabase
    .from("products")
    .update({ available_quantity: product.available_quantity + input.quantityDelta })
    .eq("id", input.productId);
  if (updateError) throw updateError;
}

/** Idempotency guard for order-status-triggered movements (applyInventoryTrigger.ts) — a status re-visited (e.g. corrected back and forth) must not double-count. */
export async function hasInventoryTransactionForOrder(
  supabase: SupabaseClient,
  organizationId: string,
  orderId: string,
  productId: string,
  reason: "order_fulfillment" | "restock",
): Promise<boolean> {
  const { data, error } = await supabase
    .from("inventory_transactions")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("order_id", orderId)
    .eq("product_id", productId)
    .eq("reason", reason)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
