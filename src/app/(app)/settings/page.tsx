import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/server/authz/session";

type MemberRow = {
  user_id: string;
  status: string;
  role: { key: string; label: string } | null;
  user: { email: string; full_name: string | null } | null;
};

export default async function SettingsPage() {
  const ctx = await requireOrgContext();
  const supabase = await createServerSupabaseClient();

  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id, status, role:roles(key, label), user:users(email, full_name)")
    .eq("organization_id", ctx.activeMembership.organization_id);

  const org = ctx.activeMembership.organization;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-lg font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Custom statuses, branding, and payment settings ship in Phase 8 (docs/build_phases.md).
        For now, this shows what Phase 2 set up.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Organization</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <span className="text-muted-foreground">Name</span>
          <span>{org.name}</span>
          <span className="text-muted-foreground">Workspace URL</span>
          <span>{org.slug}</span>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Team members</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {((members ?? []) as unknown as MemberRow[]).map((m) => (
            <div key={m.user_id} className="flex items-center justify-between text-sm">
              <div>
                <p>{m.user?.full_name || m.user?.email}</p>
                <p className="text-xs text-muted-foreground">{m.user?.email}</p>
              </div>
              <Badge variant="secondary">{m.role?.label ?? "—"}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
