import { requireModuleEnabled } from "@/server/authz/session";

export default async function QuotesLayout({ children }: { children: React.ReactNode }) {
  await requireModuleEnabled("quotes");
  return children;
}
