"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addRepairDiagnosticAction } from "../actions";

type ChecklistRow = { item: string; result: string };

/**
 * Logs one diagnostic/testing entry (docs/data_model.md repair_diagnostics) —
 * an append-only timeline covering both the diagnosis stage's findings and
 * the later testing checklist, per docs/screens.md #12.
 */
export function AddDiagnosticForm({ repairTicketId }: { repairTicketId: string }) {
  const [notes, setNotes] = useState("");
  const [checklist, setChecklist] = useState<ChecklistRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanedChecklist = checklist.filter((c) => c.item.trim() && c.result.trim());
    if (!notes.trim() && cleanedChecklist.length === 0) return;

    setSubmitting(true);
    const result = await addRepairDiagnosticAction({
      repairTicketId,
      notes: notes.trim() || undefined,
      checklist: cleanedChecklist,
    });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setNotes("");
    setChecklist([]);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-md border p-3">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Diagnostic notes or testing findings…"
        rows={2}
      />

      {checklist.map((row, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={row.item}
            onChange={(e) =>
              setChecklist((rows) =>
                rows.map((r, i) => (i === index ? { ...r, item: e.target.value } : r)),
              )
            }
            placeholder="Checklist item"
            className="h-8"
          />
          <Input
            value={row.result}
            onChange={(e) =>
              setChecklist((rows) =>
                rows.map((r, i) => (i === index ? { ...r, result: e.target.value } : r)),
              )
            }
            placeholder="Result"
            className="h-8"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setChecklist((rows) => rows.filter((_, i) => i !== index))}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setChecklist((rows) => [...rows, { item: "", result: "" }])}
        >
          <Plus className="size-4" />
          Add checklist item
        </Button>
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Saving…" : "Log entry"}
        </Button>
      </div>
    </form>
  );
}
