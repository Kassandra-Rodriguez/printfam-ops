import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgContext } from "@/server/authz/session";
import { getWorkflowStatuses, type WorkflowEntityType } from "@/server/data/workflow";
import { WorkflowEditor } from "./workflow-editor";
import { ModuleToggles } from "./module-toggles";

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

const TABS = [
  { key: "general", label: "General" },
  { key: "modules", label: "Modules" },
  { key: "workflow", label: "Statuses & workflow" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; workflowEntity?: string }>;
}) {
  const { tab, workflowEntity } = await searchParams;
  const ctx = await requireOrgContext();
  const isOwner = ctx.activeMembership.role.key === "owner";
  const activeTab: TabKey = TABS.some((t) => t.key === tab) ? (tab as TabKey) : "general";

  const org = ctx.activeMembership.organization;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-lg font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Payment settings, notification settings, and portal branding aren&apos;t built yet.
      </p>

      <div className="mt-6 flex gap-1 border-b">
        {TABS.map((t) => (
          <Button key={t.key} asChild size="sm" variant={activeTab === t.key ? "secondary" : "ghost"}>
            <Link href={`/settings?tab=${t.key}`}>{t.label}</Link>
          </Button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === "general" ? (
          <GeneralTab
            supabase={ctx.supabase}
            organizationId={ctx.activeMembership.organization_id}
            orgName={org.name}
            orgSlug={org.slug}
          />
        ) : null}

        {activeTab === "modules" ? (
          isOwner ? (
            <ModuleToggles enabledModules={org.enabled_modules} />
          ) : (
            <p className="text-sm text-muted-foreground">Only an Owner can turn modules on or off.</p>
          )
        ) : null}

        {activeTab === "workflow" ? (
          isOwner ? (
            <WorkflowTab
              supabase={ctx.supabase}
              organizationId={ctx.activeMembership.organization_id}
              workflowEntity={workflowEntity}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Only an Owner can edit statuses and workflow.</p>
          )
        ) : null}
      </div>
    </div>
  );
}

async function GeneralTab({
  supabase,
  organizationId,
  orgName,
  orgSlug,
}: {
  supabase: Awaited<ReturnType<typeof requireOrgContext>>["supabase"];
  organizationId: string;
  orgName: string;
  orgSlug: string;
}) {
  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id, status, role:roles(key, label), user:users(email, full_name)")
    .eq("organization_id", organizationId);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Organization</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <span className="text-muted-foreground">Name</span>
          <span>{orgName}</span>
          <span className="text-muted-foreground">Workspace URL</span>
          <span>{orgSlug}</span>
        </CardContent>
      </Card>

      <Card>
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

async function WorkflowTab({
  supabase,
  organizationId,
  workflowEntity,
}: {
  supabase: Awaited<ReturnType<typeof requireOrgContext>>["supabase"];
  organizationId: string;
  workflowEntity?: string;
}) {
  const entityType: WorkflowEntityType = VALID_ENTITY_TYPES.includes(workflowEntity as WorkflowEntityType)
    ? (workflowEntity as WorkflowEntityType)
    : "order_custom";
  const statuses = await getWorkflowStatuses(supabase, organizationId, entityType);

  return <WorkflowEditor entityType={entityType} statuses={statuses} />;
}
