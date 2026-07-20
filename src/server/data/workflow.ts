import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type StatusCategory = "neutral" | "info" | "warning" | "danger" | "success";

export type WorkflowStatus = {
  id: string;
  key: string;
  label: string;
  sortOrder: number;
  category: StatusCategory;
};

export type WorkflowEntityType =
  | "request"
  | "order_custom"
  | "order_existing_product"
  | "order_service"
  | "repair_ticket"
  | "quote";

/**
 * The one place the app reads a status list from. Every status dropdown, board
 * column, and badge in the product goes through this — never a hardcoded array
 * of strings (docs/architecture.md #5, docs/data_model.md "workflow_statuses").
 */
export async function getWorkflowStatuses(
  supabase: SupabaseClient,
  organizationId: string,
  entityType: WorkflowEntityType,
): Promise<WorkflowStatus[]> {
  const { data, error } = await supabase
    .from("workflow_statuses")
    .select("id, key, label, sort_order, category, workflow_definitions!inner(entity_type)")
    .eq("organization_id", organizationId)
    .eq("workflow_definitions.entity_type", entityType)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id as string,
    key: row.key as string,
    label: row.label as string,
    sortOrder: row.sort_order as number,
    category: row.category as StatusCategory,
  }));
}

export async function getStatusById(
  supabase: SupabaseClient,
  statusId: string,
): Promise<WorkflowStatus | null> {
  const { data, error } = await supabase
    .from("workflow_statuses")
    .select("id, key, label, sort_order, category")
    .eq("id", statusId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    key: data.key,
    label: data.label,
    sortOrder: data.sort_order,
    category: data.category,
  };
}
