import { AppShell } from "@/components/app-shell/app-shell";
import { requireOrgContext } from "@/server/authz/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireOrgContext();

  return (
    <AppShell
      organizationName={ctx.activeMembership.organization.name}
      userEmail={ctx.email}
    >
      {children}
    </AppShell>
  );
}
