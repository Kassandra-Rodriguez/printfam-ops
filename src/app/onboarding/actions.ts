"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/server/authz/session";
import { createOrganization } from "@/server/domain/organizations/createOrganization";

export type OnboardingActionState = { error: string | null };

export async function createOrganizationAction(
  _prevState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const { supabase } = await requireUser();

  const result = await createOrganization(supabase, {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
  });

  if (!result.ok) {
    return { error: result.error };
  }

  redirect("/dashboard");
}
