import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/server/authz/session";
import { getWorkflowStatuses, type WorkflowEntityType } from "@/server/data/workflow";
import { WorkflowEditor } from "./workflow-editor";

type MemberRow = {
  user_id: string;
  status: string;
  role: { key: string; label: string } | null;
  user: { email: string; full_name: string | null } | null;
};

const VALID_ENTITY_TYPES: WorkflowEntityType[] = [
  "request",
  "order_custom",
  "order_existing_product",
  "order_service",
  "repair_ticket",
  "quote",
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ workflowEntity?: string }>;
}) {
  const { workflowEntity } = await searchParams;
  const ctx = await requireOrgContext();
  const supabase = await createServerSupabaseClient();
  const isOwner = ctx.activeMembership.role.key === "owner";

  const entityType: WorkflowEntityType = VALID_ENTITY_TYPES.includes(workflowEntity as WorkflowEntityType)
    ? (workflowEntity as WorkflowEntityType)
    : "order_custom";
  const statuses = isOwner
    ? await getWorkflowStatuses(ctx.supabase, ctx.activeMembership.organization_id, entityType)
    : [];

  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id, status, role:roles(key, label), user:users(email, full_name)")
    .eq("organization_id", ctx.activeMembership.organization_id);

  const org = ctx.activeMembership.organization;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-lg font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Payment settings, notification settings, and portal branding aren&apos;t built yet (docs/build_phases.md
        Phase 8). This page covers organization info, team members, and custom statuses/workflow.
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

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Custom statuses &amp; workflow</CardTitle>
        </CardHeader>
        <CardContent>
          {isOwner ? (
            <WorkflowEditor entityType={entityType} statuses={statuses} />
          ) : (
            <p className="text-sm text-muted-foreground">Only an Owner can edit statuses and workflow.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
