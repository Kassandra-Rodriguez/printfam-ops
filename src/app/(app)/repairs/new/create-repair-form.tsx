"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { createRepairTicketSchema, type CreateRepairTicketInput } from "@/lib/validation/repairs";
import type { WorkflowStatus } from "@/server/data/workflow";
import { createRepairTicketAction } from "../actions";

const DRAFT_KEY = "printfam-repair-draft";

const PAYMENT_METHODS = [
  "cash",
  "cash_app",
  "zelle",
  "card",
  "shopify",
  "tiktok_shop",
  "square",
  "bank_transfer",
  "other",
] as const;

function buildDefaultValues(initialCustomerId?: string, defaultStatusId?: string): CreateRepairTicketInput {
  return {
    customerId: initialCustomerId ?? "",
    deviceModel: "",
    serialNumber: "",
    reportedIssue: "",
    errorCodes: "",
    intakeDate: new Date().toISOString().slice(0, 10),
    conditionAtIntake: "",
    accessoriesReceived: "",
    statusId: defaultStatusId ?? "",
    diagnosticFee: undefined,
    backfillStatuses: [],
    backfillPayments: [],
  };
}

export function CreateRepairForm({
  customers,
  statuses,
  initialCustomerId,
}: {
  customers: { id: string; name: string }[];
  statuses: WorkflowStatus[];
  initialCustomerId?: string;
}) {
  const router = useRouter();
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CreateRepairTicketInput>({
    resolver: zodResolver(createRepairTicketSchema),
    defaultValues: buildDefaultValues(initialCustomerId, statuses[0]?.id),
  });

  const backfillStatusesArray = useFieldArray({ control: form.control, name: "backfillStatuses" });
  const backfillPaymentsArray = useFieldArray({ control: form.control, name: "backfillPayments" });

  // Draft persistence, same reasoning as create-order-form.tsx.
  useEffect(() => {
    const saved = window.localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        form.reset(JSON.parse(saved));
        setRestoredDraft(true);
      } catch {
        window.localStorage.removeItem(DRAFT_KEY);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const subscription = form.watch((values) => {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  function discardDraft() {
    window.localStorage.removeItem(DRAFT_KEY);
    form.reset(buildDefaultValues(initialCustomerId, statuses[0]?.id));
    setRestoredDraft(false);
  }

  async function onSubmit(values: CreateRepairTicketInput) {
    setSubmitting(true);
    const result = await createRepairTicketAction(values);
    setSubmitting(false);

    if (result.status === "error") {
      toast.error(result.error);
      return;
    }

    window.localStorage.removeItem(DRAFT_KEY);
    toast.success(`${result.ticketNumber} created`);
    router.push(`/repairs/${result.repairTicketId}`);
  }

  const isMidWorkflow = statuses.length > 0 && statuses[0]?.id !== form.watch("statusId");

  return (
    <div className="flex flex-col gap-4">
      {restoredDraft ? (
        <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <span>Restored your unsaved draft.</span>
          <Button type="button" variant="ghost" size="sm" onClick={discardDraft}>
            Discard draft
          </Button>
        </div>
      ) : null}

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex flex-col gap-2">
              <Label>Customer</Label>
              <Select
                value={form.watch("customerId")}
                onValueChange={(v: string) => form.setValue("customerId", v, { shouldValidate: true })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {customers.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No customers yet —{" "}
                  <Link href="/customers/new" className="underline">
                    create one first
                  </Link>
                  .
                </p>
              ) : null}
              <FieldError message={form.formState.errors.customerId?.message} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="deviceModel">Device / model</Label>
                <Input
                  id="deviceModel"
                  {...form.register("deviceModel")}
                  placeholder="e.g. Ender 3 V2"
                />
                <FieldError message={form.formState.errors.deviceModel?.message} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="serialNumber">Serial number</Label>
                <Input id="serialNumber" {...form.register("serialNumber")} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="reportedIssue">Reported issue</Label>
              <Textarea id="reportedIssue" rows={3} {...form.register("reportedIssue")} />
              <FieldError message={form.formState.errors.reportedIssue?.message} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="errorCodes">Error codes</Label>
              <Input id="errorCodes" {...form.register("errorCodes")} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="intakeDate">Intake date</Label>
                <Input id="intakeDate" type="date" {...form.register("intakeDate")} />
                <FieldError message={form.formState.errors.intakeDate?.message} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Current status</Label>
                <Select
                  value={form.watch("statusId")}
                  onValueChange={(v: string) => form.setValue("statusId", v, { shouldValidate: true })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={form.formState.errors.statusId?.message} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="conditionAtIntake">Condition at intake</Label>
              <Textarea id="conditionAtIntake" rows={2} {...form.register("conditionAtIntake")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="accessoriesReceived">Accessories received</Label>
              <Input id="accessoriesReceived" {...form.register("accessoriesReceived")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="diagnosticFee">Diagnostic fee</Label>
              <Input
                id="diagnosticFee"
                type="number"
                step="0.01"
                min="0"
                {...form.register("diagnosticFee")}
              />
            </div>
          </CardContent>
        </Card>

        {isMidWorkflow ? (
          <Card className="border-amber-300 dark:border-amber-900">
            <CardContent className="flex flex-col gap-4 pt-6">
              <div>
                <p className="text-sm font-medium">This device isn&apos;t starting fresh</p>
                <p className="text-sm text-muted-foreground">
                  Add the statuses and payments it already passed through, with their real
                  dates, so its history isn&apos;t a lie.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label>Prior statuses</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      backfillStatusesArray.append({
                        statusId: statuses[0]?.id ?? "",
                        changedAt: new Date().toISOString().slice(0, 10),
                        note: "",
                      })
                    }
                  >
                    <Plus className="size-4" />
                    Add earlier status
                  </Button>
                </div>
                {backfillStatusesArray.fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-[1fr_9rem_auto] items-end gap-2">
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Status</Label>
                      <Select
                        value={form.watch(`backfillStatuses.${index}.statusId`)}
                        onValueChange={(v: string) =>
                          form.setValue(`backfillStatuses.${index}.statusId`, v)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Date</Label>
                      <Input
                        type="date"
                        {...form.register(`backfillStatuses.${index}.changedAt` as const)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => backfillStatusesArray.remove(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label>Payments already collected</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      backfillPaymentsArray.append({
                        amount: 0,
                        method: "cash",
                        kind: "deposit",
                        paidAt: new Date().toISOString().slice(0, 10),
                        referenceNumber: "",
                        notes: "",
                      })
                    }
                  >
                    <Plus className="size-4" />
                    Add payment
                  </Button>
                </div>
                {backfillPaymentsArray.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-[6rem_8rem_7rem_8rem_auto] items-end gap-2"
                  >
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...form.register(`backfillPayments.${index}.amount` as const)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Method</Label>
                      <Select
                        value={form.watch(`backfillPayments.${index}.method`)}
                        onValueChange={(v: string) =>
                          form.setValue(
                            `backfillPayments.${index}.method`,
                            v as (typeof PAYMENT_METHODS)[number],
                          )
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Kind</Label>
                      <Select
                        value={form.watch(`backfillPayments.${index}.kind`)}
                        onValueChange={(v: string) =>
                          form.setValue(
                            `backfillPayments.${index}.kind`,
                            v as "deposit" | "final" | "full" | "refund",
                          )
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deposit">Deposit</SelectItem>
                          <SelectItem value="final">Final</SelectItem>
                          <SelectItem value="full">Full</SelectItem>
                          <SelectItem value="refund">Refund</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Date</Label>
                      <Input
                        type="date"
                        {...form.register(`backfillPayments.${index}.paidAt` as const)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => backfillPaymentsArray.remove(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Button type="submit" disabled={submitting} className="self-start">
          {submitting ? "Saving…" : "Save repair"}
        </Button>
      </form>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}
