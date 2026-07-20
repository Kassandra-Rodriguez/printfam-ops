import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createOrganizationSchema,
  type CreateOrganizationInput,
} from "@/lib/validation/organizations";
import { isSlugAvailable } from "@/server/data/organizations";

export type CreateOrganizationResult =
  | { ok: true; organization: { id: string; name: string; slug: string } }
  | { ok: false; error: string };

/**
 * The only way an organization comes into existence (docs/architecture.md,
 * docs/data_model.md "create_organization_with_owner"). This wraps the
 * database function that atomically creates the org, makes the calling user
 * its Owner, and seeds the default workflow statuses from
 * docs/product_requirements.md §9 — all three happen together or not at all.
 */
export async function createOrganization(
  supabase: SupabaseClient,
  input: CreateOrganizationInput,
): Promise<CreateOrganizationResult> {
  const parsed = createOrganizationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const available = await isSlugAvailable(supabase, parsed.data.slug);
  if (!available) {
    return { ok: false, error: "That workspace URL is already taken" };
  }

  const { data, error } = await supabase
    .rpc("create_organization_with_owner", {
      p_name: parsed.data.name,
      p_slug: parsed.data.slug,
    })
    .single();

  if (error) {
    return { ok: false, error: "Could not create the organization. Try again." };
  }

  const org = data as { id: string; name: string; slug: string };
  return { ok: true, organization: { id: org.id, name: org.name, slug: org.slug } };
}
