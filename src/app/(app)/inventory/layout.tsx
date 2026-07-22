import { requireModuleEnabled } from "@/server/authz/session";

export default async function InventoryLayout({ children }: { children: React.ReactNode }) {
  await requireModuleEnabled("inventory");
  return children;
}
