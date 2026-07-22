"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";
import type { OptionalModule } from "@/server/data/organizations";

export function SidebarNav({
  onNavigate,
  enabledModules,
}: {
  onNavigate?: () => void;
  enabledModules: OptionalModule[];
}) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => !item.module || enabledModules.includes(item.module));

  return (
    <nav className="flex flex-col gap-0.5 p-2">
      {visibleItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
              active
                ? "bg-secondary font-medium text-secondary-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
