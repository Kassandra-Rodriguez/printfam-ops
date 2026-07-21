import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SavedFilterRow = {
  id: string;
  name: string;
  filter_params: Record<string, string>;
};

export async function listSavedFilters(supabase: SupabaseClient, entityType: string): Promise<SavedFilterRow[]> {
  const { data, error } = await supabase
    .from("saved_filters")
    .select("id, name, filter_params")
    .eq("entity_type", entityType)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as SavedFilterRow[];
}

export async function createSavedFilter(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: { entityType: string; name: string; filterParams: Record<string, string> },
) {
  const { error } = await supabase.from("saved_filters").insert({
    organization_id: organizationId,
    user_id: userId,
    entity_type: input.entityType,
    name: input.name,
    filter_params: input.filterParams,
  });
  if (error) throw error;
}

export async function deleteSavedFilter(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("saved_filters").delete().eq("id", id);
  if (error) throw error;
}
