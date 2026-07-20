import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MembershipWithOrg = {
  organization_id: string;
  status: string;
  role: { key: string; label: string };
  organization: { id: string; name: string; slug: string };
};

/**
 * Every function here takes an already-authenticated Supabase client and never
 * accepts an organizationId as a "trust me" parameter without it being scoped
 * through a relationship to the authenticated user — see docs/architecture.md
 * #3 on why organization scoping is never inferred from client input alone.
 */
export async function listMembershipsForCurrentUser(
  supabase: SupabaseClient,
): Promise<MembershipWithOrg[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select(
      "organization_id, status, role:roles(key, label), organization:organizations(id, name, slug)",
    )
    .eq("status", "active");

  if (error) throw error;
  return (data ?? []) as unknown as MembershipWithOrg[];
}

export async function isSlugAvailable(
  supabase: SupabaseClient,
  slug: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data === null;
}
