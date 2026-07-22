import {
  LayoutDashboard,
  Users,
  Inbox,
  ShoppingBag,
  Wrench,
  FileText,
  CheckSquare,
  Package,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Build phase this module ships in, per docs/build_phases.md. `null` = live now. */
  phase: number | null;
  /** Set for togglable modules (organizations.enabled_modules) — omitted items are always shown. */
  module?: "repairs" | "quotes" | "inventory";
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, phase: null },
  { label: "Customers", href: "/customers", icon: Users, phase: 3 },
  { label: "Orders", href: "/orders", icon: ShoppingBag, phase: 3 },
  { label: "Requests", href: "/requests", icon: FileText, phase: 4 },
  { label: "Repairs", href: "/repairs", icon: Wrench, phase: null, module: "repairs" },
  { label: "Quotes", href: "/quotes", icon: FileText, phase: 6, module: "quotes" },
  { label: "Inbox", href: "/inbox", icon: Inbox, phase: 4 },
  { label: "Tasks", href: "/tasks", icon: CheckSquare, phase: 3 },
  { label: "Inventory", href: "/inventory", icon: Package, phase: 8, module: "inventory" },
  { label: "Reports", href: "/reports", icon: BarChart3, phase: 8 },
  { label: "Settings", href: "/settings", icon: Settings, phase: null },
];
