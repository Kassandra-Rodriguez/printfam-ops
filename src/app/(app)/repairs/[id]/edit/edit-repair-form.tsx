"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateRepairTicketSchema, type UpdateRepairTicketInput } from "@/lib/validation/repairs";
import { updateRepairTicketAction } from "../../actions";

const PART_STATUSES = ["needed", "ordered", "received", "installed"] as const;

export function EditRepairForm({
  repairTicketId,
  defaultValues,
}: {
  repairTicketId: string;
  defaultValues: Omit<UpdateRepairTicketInput, "repairTicketId">;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<UpdateRepairTicketInput>({
    resolver: zodResolver(updateRepairTicketSchema),
    defaultValues: { repairTicketId, ...defaultValues },
  });

  const partsArray = useFieldArray({ control: form.control, name: "parts" });

  async function onSubmit(values: UpdateRepairTicketInput) {
    setSubmitting(true);
    const result = await updateRepairTicketAction(values);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Repair updated");
    router.push(`/repairs/${repairTicketId}`);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="deviceModel">Device / model</Label>
              <Input id="deviceModel" {...form.register("deviceModel")} />
              {form.formState.errors.deviceModel ? (
                <p className="text-xs text-destructive">{form.formState.errors.deviceModel.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="serialNumber">Serial number</Label>
              <Input id="serialNumber" {...form.register("serialNumber")} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reportedIssue">Reported issue</Label>
            <Textarea id="reportedIssue" rows={3} {...form.register("reportedIssue")} />
            {form.formState.errors.reportedIssue ? (
              <p className="text-xs text-destructive">{form.formState.errors.reportedIssue.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="errorCodes">Error codes</Label>
            <Input id="errorCodes" {...form.register("errorCodes")} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="conditionAtIntake">Condition at intake</Label>
            <Textarea id="conditionAtIntake" rows={2} {...form.register("conditionAtIntake")} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="accessoriesReceived">Accessories received</Label>
            <Input id="accessoriesReceived" {...form.register("accessoriesReceived")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="identifiedProblem">Identified problem</Label>
            <Textarea id="identifiedProblem" rows={2} {...form.register("identifiedProblem")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="recommendedRepair">Recommended repair</Label>
            <Textarea id="recommendedRepair" rows={2} {...form.register("recommendedRepair")} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="diagnosticFee">Diagnostic fee</Label>
              <Input id="diagnosticFee" type="number" step="0.01" min="0" {...form.register("diagnosticFee")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="laborCost">Labor cost</Label>
              <Input id="laborCost" type="number" step="0.01" min="0" {...form.register("laborCost")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="warrantyPeriodDays">Warranty (days)</Label>
              <Input
                id="warrantyPeriodDays"
                type="number"
                step="1"
                min="0"
                {...form.register("warrantyPeriodDays")}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="completedSummary">Completion summary</Label>
            <Textarea id="completedSummary" rows={2} {...form.register("completedSummary")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <div className="flex items-center justify-between">
            <Label>Parts</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                partsArray.append({ partName: "", cost: 0, quantity: 1, status: "needed" })
              }
            >
              <Plus className="size-4" />
              Add part
            </Button>
          </div>
          {partsArray.fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No parts added yet.</p>
          ) : null}
          {partsArray.fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-[1fr_5rem_6rem_8rem_auto] items-end gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Part</Label>
                <Input {...form.register(`parts.${index}.partName` as const)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Qty</Label>
                <Input type="number" step="1" min="1" {...form.register(`parts.${index}.quantity` as const)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Cost</Label>
                <Input type="number" step="0.01" min="0" {...form.register(`parts.${index}.cost` as const)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Status</Label>
                <Select
                  value={form.watch(`parts.${index}.status`)}
                  onValueChange={(v: string) =>
                    form.setValue(`parts.${index}.status`, v as (typeof PART_STATUSES)[number])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PART_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => partsArray.remove(index)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button type="submit" disabled={submitting} className="self-start">
        {submitting ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
