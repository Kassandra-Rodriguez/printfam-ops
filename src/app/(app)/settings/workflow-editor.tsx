"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { WorkflowEntityType, WorkflowStatus } from "@/server/data/workflow";
import { renameStatusAction, moveStatusAction, setStatusInventoryTriggerAction } from "./actions";

const ENTITY_TYPE_LABELS: Record<WorkflowEntityType, string> = {
  request: "Requests",
  order_custom: "Custom orders",
  order_existing_product: "Existing-product orders",
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState("");

  function saveLabel(statusId: string) {
    if (!labelDraft.trim()) return;
    startTransition(async () => {
      const result = await renameStatusAction(statusId, labelDraft);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setEditingId(null);
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
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(ENTITY_TYPE_LABELS) as WorkflowEntityType[]).map((et) => (
          <Button key={et} asChild size="sm" variant={et === entityType ? "default" : "outline"}>
            <Link href={`/settings?workflowEntity=${et}`}>{ENTITY_TYPE_LABELS[et]}</Link>
          </Button>
        ))}
      </div>

      <div className="rounded-md border">
        {statuses.map((status, index) => (
          <div key={status.id} className="flex items-center gap-2 border-b px-3 py-2 text-sm last:border-0">
            <div className="flex flex-col">
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                disabled={index === 0 || isPending}
                onClick={() => move(status.id, "up")}
              >
                <ArrowUp className="size-3" />
              </Button>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                disabled={index === statuses.length - 1 || isPending}
                onClick={() => move(status.id, "down")}
              >
                <ArrowDown className="size-3" />
              </Button>
            </div>

            <StatusBadge label={status.label} category={status.category} />

            <div className="flex flex-1 items-center gap-2">
              {editingId === status.id ? (
                <>
                  <Input
                    value={labelDraft}
                    onChange={(e) => setLabelDraft(e.target.value)}
                    className="h-7 max-w-56"
                    autoFocus
                  />
                  <Button size="icon-xs" variant="ghost" disabled={isPending} onClick={() => saveLabel(status.id)}>
                    <Check className="size-3.5" />
                  </Button>
                </>
              ) : (
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setEditingId(status.id);
                    setLabelDraft(status.label);
                  }}
                >
                  <Pencil className="size-3" />
                  Rename
                </button>
              )}
            </div>

            {ENTITY_TYPES_WITH_INVENTORY.has(entityType) ? (
              <Select
                value={status.inventoryTrigger ?? "none"}
                onValueChange={(v: string) => setTrigger(status.id, v as "decrement" | "restock" | "none")}
              >
                <SelectTrigger className="h-7 w-40 text-xs">
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
