"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { WorkflowEntityType, WorkflowStatus } from "@/server/data/workflow";
import { renameStatusAction, moveStatusAction, setStatusInventoryTriggerAction } from "./actions";

const ENTITY_TYPE_LABELS: Record<WorkflowEntityType, string> = {
  request: "Requests",
  order_custom: "Custom orders",
  order_existing_product: "Existing product orders",
  order_service: "Service orders",
  repair_ticket: "Repair tickets",
  quote: "Quotes",
};

const ENTITY_TYPES_WITH_INVENTORY = new Set<WorkflowEntityType>(["order_custom", "order_existing_product"]);

/** docs/build_phases.md Phase 8 acceptance criterion: rename/reorder here shows up everywhere that status renders, with zero code changes — every status list already reads through getWorkflowStatuses(). */
export function WorkflowEditor({
  entityType,
  statuses,
}: {
  entityType: WorkflowEntityType;
  statuses: WorkflowStatus[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function saveLabel(statusId: string, label: string, previousLabel: string) {
    if (!label.trim() || label === previousLabel) return;
    startTransition(async () => {
      const result = await renameStatusAction(statusId, label);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function move(statusId: string, direction: "up" | "down") {
    startTransition(async () => {
      const result = await moveStatusAction(entityType, statusId, direction);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function setTrigger(statusId: string, trigger: "decrement" | "restock" | "none") {
    startTransition(async () => {
      const result = await setStatusInventoryTriggerAction(statusId, trigger);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Applies to</p>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(ENTITY_TYPE_LABELS) as WorkflowEntityType[]).map((et) => (
            <Button key={et} asChild size="sm" variant={et === entityType ? "default" : "outline"}>
              <Link href={`/settings?tab=workflow&workflowEntity=${et}`}>{ENTITY_TYPE_LABELS[et]}</Link>
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {statuses.map((status, index) => (
          <div key={status.id} className="flex items-center gap-3 rounded-md border p-2.5">
            <div className="flex flex-col gap-0.5">
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                disabled={index === 0 || isPending}
                onClick={() => move(status.id, "up")}
                aria-label="Move up"
              >
                <ArrowUp className="size-3" />
              </Button>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                disabled={index === statuses.length - 1 || isPending}
                onClick={() => move(status.id, "down")}
                aria-label="Move down"
              >
                <ArrowDown className="size-3" />
              </Button>
            </div>

            <Input
              defaultValue={status.label}
              key={status.label}
              onBlur={(e) => saveLabel(status.id, e.target.value, status.label)}
              className="h-8 flex-1"
            />

            {ENTITY_TYPES_WITH_INVENTORY.has(entityType) ? (
              <Select
                value={status.inventoryTrigger ?? "none"}
                onValueChange={(v: string) => setTrigger(status.id, v as "decrement" | "restock" | "none")}
              >
                <SelectTrigger className="h-8 w-44 shrink-0 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No inventory effect</SelectItem>
                  <SelectItem value="decrement">Decrement stock</SelectItem>
                  <SelectItem value="restock">Restock</SelectItem>
                </SelectContent>
              </Select>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
