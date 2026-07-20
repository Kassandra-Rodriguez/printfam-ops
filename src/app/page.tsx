import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listMembershipsForCurrentUser } from "@/server/data/organizations";

export default async function RootPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const memberships = await listMembershipsForCurrentUser(supabase);
  redirect(memberships.length > 0 ? "/dashboard" : "/onboarding");
}
