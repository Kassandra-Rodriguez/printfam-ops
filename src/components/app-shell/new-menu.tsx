"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OptionalModule } from "@/server/data/organizations";

const NEW_ITEMS: { label: string; href: string; module?: OptionalModule }[] = [
  { label: "Order", href: "/orders/new" },
  { label: "Customer", href: "/customers/new" },
  { label: "Request", href: "/requests/new" },
  { label: "Repair", href: "/repairs/new", module: "repairs" },
  { label: "Quote", href: "/quotes/new", module: "quotes" },
  { label: "Product", href: "/inventory/new", module: "inventory" },
];

/** screens.md #1: "A persistent '+ New' button lives in the top bar" — a dropdown from that same button, not buried in navigation. */
export function NewMenu({ className, enabledModules }: { className?: string; enabledModules: OptionalModule[] }) {
  const visibleItems = NEW_ITEMS.filter((item) => !item.module || enabledModules.includes(item.module));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className={className}>
          <Plus className="size-4" />
          New
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {visibleItems.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link href={item.href}>{item.label}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
