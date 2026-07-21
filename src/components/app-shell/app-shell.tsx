"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";
import { NotificationsBell } from "./notifications-bell";
import { GlobalSearch } from "./global-search";
import type { NotificationRow } from "@/server/data/notifications";

export function AppShell({
  organizationName,
  userEmail,
  notifications,
  unreadCount,
  children,
}: {
  organizationName: string;
  userEmail: string;
  notifications: NotificationRow[];
  unreadCount: number;
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-svh">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-background md:flex">
        <div className="flex h-14 items-center border-b px-4">
          <span className="truncate text-sm font-semibold">{organizationName}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" aria-label="Open navigation">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="h-14 justify-center border-b px-4">
                <SheetTitle className="truncate text-sm">{organizationName}</SheetTitle>
              </SheetHeader>
              <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
            </SheetContent>
          </Sheet>

          <Link href="/dashboard" className="text-sm font-semibold md:hidden">
            PrintFam Ops
          </Link>

          <GlobalSearch />

          <Button
            size="sm"
            disabled
            className="ml-auto md:ml-0"
            title="Manual entry ships in Phase 3 (docs/build_phases.md)"
          >
            <Plus className="size-4" />
            New
          </Button>

          <NotificationsBell notifications={notifications} unreadCount={unreadCount} />
          <UserMenu email={userEmail} />
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
