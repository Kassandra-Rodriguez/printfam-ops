import "server-only";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listMembershipsForCurrentUser, type MembershipWithOrg } from "@/server/data/organizations";

export type OrgContext = {
  supabase: SupabaseClient;
  userId: string;
  email: string;
  memberships: MembershipWithOrg[];
  /**
   * The organization the current page/action operates against. v1 has no
   * org-switcher UI (docs/build_phases.md Phase 2 scope), so this is simply
   * the user's first active membership — a real "active org" selector is a
   * documented fast-follow (docs/user_roles.md #4), not a schema change.
   */
  activeMembership: MembershipWithOrg;
};

/** Redirects to /login if there is no authenticated session. */
export async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

/**
 * Redirects to /onboarding if the authenticated user has no organization yet.
 * Every (app) route calls this — it's the one place "does this user have an
 * organization" is decided, per docs/architecture.md's rule against
 * duplicating business logic across call sites.
 */
export async function requireOrgContext(): Promise<OrgContext> {
  const { supabase, user } = await requireUser();
  const memberships = await listMembershipsForCurrentUser(supabase);

  if (memberships.length === 0) {
    redirect("/onboarding");
  }

  return {
    supabase,
    userId: user.id,
    email: user.email ?? "",
    memberships,
    activeMembership: memberships[0],
  };
}
