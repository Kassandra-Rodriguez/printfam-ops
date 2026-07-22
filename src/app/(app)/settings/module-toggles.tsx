"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { setEnabledModulesAction } from "./actions";
import type { OptionalModule } from "@/server/data/organizations";

const MODULES: { key: OptionalModule; label: string; description: string }[] = [
  { key: "repairs", label: "Repairs", description: "Intake, diagnostics, parts and labor, repair approvals." },
  { key: "quotes", label: "Quotes", description: "Price out work before committing, send for approval, convert to an order." },
  { key: "inventory", label: "Inventory", description: "Product catalog and stock tracking, tied to order line items." },
];

/** Not every business using this product needs every module — an Owner can turn off what they don't use. */
export function ModuleToggles({ enabledModules }: { enabledModules: OptionalModule[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(module: OptionalModule, checked: boolean) {
    const next = checked ? [...enabledModules, module] : enabledModules.filter((m) => m !== module);
    startTransition(async () => {
      const result = await setEnabledModulesAction(next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {MODULES.map((m) => {
        const checked = enabledModules.includes(m.key);
        return (
          <Card key={m.key}>
            <CardContent className="flex items-center justify-between gap-4 pt-6">
              <div>
                <p className="text-sm font-medium">{m.label}</p>
                <p className="text-sm text-muted-foreground">{m.description}</p>
              </div>
              <label className="flex shrink-0 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isPending}
                  onChange={(e) => toggle(m.key, e.target.checked)}
                  className="size-4"
                />
                {checked ? "On" : "Off"}
              </label>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
