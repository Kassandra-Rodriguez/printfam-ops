import { requireModuleEnabled } from "@/server/authz/session";

export default async function RepairsLayout({ children }: { children: React.ReactNode }) {
  await requireModuleEnabled("repairs");
  return children;
}
