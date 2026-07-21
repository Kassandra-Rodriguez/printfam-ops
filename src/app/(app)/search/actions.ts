"use server";

import { requireOrgContext } from "@/server/authz/session";
import { globalSearch, type SearchResultGroup } from "@/server/data/search";

export async function globalSearchAction(query: string): Promise<SearchResultGroup[]> {
  const ctx = await requireOrgContext();
  return globalSearch(ctx.supabase, ctx.activeMembership.organization_id, query);
}
