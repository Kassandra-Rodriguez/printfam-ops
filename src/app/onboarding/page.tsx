import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listMembershipsForCurrentUser } from "@/server/data/organizations";
import { requireUser } from "@/server/authz/session";
import { CreateOrganizationForm } from "./create-organization-form";

export default async function OnboardingPage() {
  const { user } = await requireUser();

  // A user with an organization already has nowhere to go here — send them
  // straight to the dashboard rather than letting them create a second org
  // through this screen (v1 has no org-switcher UI, docs/user_roles.md #4).
  const supabase = await createServerSupabaseClient();
  const memberships = await listMembershipsForCurrentUser(supabase);
  if (memberships.length > 0) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold">Set up your business</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user.email}, let&apos;s create your workspace
          </p>
        </div>
        <CreateOrganizationForm />
      </div>
    </div>
  );
}
