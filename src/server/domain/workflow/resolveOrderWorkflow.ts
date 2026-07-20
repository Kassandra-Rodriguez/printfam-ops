export type OrderType = "custom" | "existing_product" | "bulk" | "service";

/**
 * Mirrors supabase/migrations/0003_workflow.sql's resolve_order_workflow_entity_type()
 * SQL function. Kept as a small pure client-side function too so the order form can
 * pick the right status list without a network round trip while typing — the SQL
 * function remains the source of truth the domain layer calls when actually writing
 * the row. If these two ever disagree, the SQL function wins (docs/architecture.md #5).
 */
export function resolveOrderWorkflowEntityType(
  orderType: OrderType,
  requiresProduction: boolean,
): "order_custom" | "order_existing_product" | "order_service" {
  if (orderType === "custom") return "order_custom";
  if (orderType === "existing_product") return "order_existing_product";
  if (orderType === "service") return "order_service";
  return requiresProduction ? "order_custom" : "order_existing_product";
}
