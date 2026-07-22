import { AppShell } from "@/components/app-shell/app-shell";
import { requireOrgContext } from "@/server/authz/session";
import { listNotificationsForCurrentUser, countUnreadNotifications } from "@/server/data/notifications";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireOrgContext();
  const [notifications, unreadCount] = await Promise.all([
    listNotificationsForCurrentUser(ctx.supabase),
    countUnreadNotifications(ctx.supabase),
  ]);

  return (
    <AppShell
      organizationName={ctx.activeMembership.organization.name}
      userEmail={ctx.email}
      notifications={notifications}
      unreadCount={unreadCount}
      enabledModules={ctx.activeMembership.organization.enabled_modules}
    >
      {children}
    </AppShell>
  );
}
