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
import { createOrderSchema, type CreateOrderInput } from "@/lib/validation/orders";
import { resolveOrderWorkflowEntityType } from "@/server/domain/workflow/resolveOrderWorkflow";
import type { WorkflowStatus } from "@/server/data/workflow";
import { createOrderAction } from "../actions";

const DRAFT_KEY = "printfam-order-draft";

const ORDER_TYPE_OPTIONS: { value: CreateOrderInput["orderType"]; label: string }[] = [
  { value: "custom", label: "Custom order" },
  { value: "existing_product", label: "Existing product order" },
  { value: "bulk", label: "Bulk order" },
  { value: "service", label: "General service order" },
];

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
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

type EntityType = "order_custom" | "order_existing_product" | "order_service";

function buildDefaultValues(
  initialCustomerId?: string,
  initialTitle?: string,
  initialItems?: CreateOrderInput["items"],
  initialPricing?: {
    discountTotal: number;
    taxTotal: number;
    shippingCost: number;
    depositRequired: number;
  },
): CreateOrderInput {
  return {
    customerId: initialCustomerId ?? "",
    title: initialTitle ?? "",
    orderType: "custom",
    requiresProduction: true,
    statusId: "",
    totalAmount: undefined,
    items: initialItems ?? [],
    promisedDate: "",
    internalDeadline: "",
    notes: "",
    discountTotal: initialPricing?.discountTotal ?? 0,
    taxTotal: initialPricing?.taxTotal ?? 0,
    shippingCost: initialPricing?.shippingCost ?? 0,
    depositRequired: initialPricing?.depositRequired ?? 0,
    backfillStatuses: [],
    backfillPayments: [],
  };
}

export function CreateOrderForm({
  customers,
  statusesByEntityType,
  convertedFromRequestId,
  convertedFromQuoteId,
  initialCustomerId,
  initialTitle,
  initialItems,
  initialPricing,
  products = [],
}: {
  customers: { id: string; name: string }[];
  statusesByEntityType: Record<EntityType, WorkflowStatus[]>;
  convertedFromRequestId?: string;
  convertedFromQuoteId?: string;
  initialCustomerId?: string;
  initialTitle?: string;
  initialItems?: CreateOrderInput["items"];
  initialPricing?: {
    discountTotal: number;
    taxTotal: number;
    shippingCost: number;
    depositRequired: number;
  };
  products?: { id: string; name: string; sellingPrice: number; availableQuantity: number }[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"quick" | "detailed">(initialItems && initialItems.length > 0 ? "detailed" : "quick");
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: buildDefaultValues(initialCustomerId, initialTitle, initialItems, initialPricing),
  });

  const itemsArray = useFieldArray({ control: form.control, name: "items" });
  const backfillStatusesArray = useFieldArray({ control: form.control, name: "backfillStatuses" });
  const backfillPaymentsArray = useFieldArray({ control: form.control, name: "backfillPayments" });

  const orderType = form.watch("orderType");
  const requiresProduction = form.watch("requiresProduction") ?? true;
  const entityType = resolveOrderWorkflowEntityType(orderType, requiresProduction);
  const statuses = statusesByEntityType[entityType] ?? [];

  // Set a sensible default status whenever the relevant workflow changes,
  // without stomping a value the user already picked for the same list.
  useEffect(() => {
    const currentId = form.getValues("statusId");
    if (!statuses.some((s) => s.id === currentId)) {
      form.setValue("statusId", statuses[0]?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType]);

  // Draft persistence (docs/product_requirements.md §8: "Allow drafts so
  // unfinished order entry is not lost") — restore once on mount. Skipped when
  // converting a request: that prefill should win over an unrelated old draft.
  useEffect(() => {
    if (convertedFromRequestId || convertedFromQuoteId) return;
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
    form.reset(buildDefaultValues(initialCustomerId, initialTitle));
    setRestoredDraft(false);
  }

  async function onSubmit(values: CreateOrderInput) {
    setSubmitting(true);
    const payload: CreateOrderInput = {
      ...(mode === "quick" ? { ...values, items: [], backfillStatuses: [], backfillPayments: [] } : values),
      convertedFromRequestId,
      convertedFromQuoteId,
    };

    const result = await createOrderAction(payload);
    setSubmitting(false);

    if (result.status === "error") {
      toast.error(result.error);
      return;
    }

    window.localStorage.removeItem(DRAFT_KEY);
    toast.success(`${result.orderNumber} created`);
    router.push(`/orders/${result.orderId}`);
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

      <div className="flex items-center gap-1 rounded-md border p-1 w-fit">
        <Button
          type="button"
          size="sm"
          variant={mode === "quick" ? "default" : "ghost"}
          onClick={() => setMode("quick")}
        >
          Quick entry
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "detailed" ? "default" : "ghost"}
          onClick={() => setMode("detailed")}
        >
          Detailed entry
        </Button>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="grid grid-cols-2 gap-3">
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
              <div className="flex flex-col gap-2">
                <Label>Order type</Label>
                <Select
                  value={orderType}
                  onValueChange={(v: string) =>
                    form.setValue("orderType", v as CreateOrderInput["orderType"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {orderType === "bulk" ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register("requiresProduction")} />
                This bulk order requires production (otherwise it follows the
                existing product workflow)
              </label>
            ) : null}

            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Order title</Label>
              <Input
                id="title"
                {...form.register("title")}
                placeholder="e.g. Custom MiniBits — 20 units"
              />
              <FieldError message={form.formState.errors.title?.message} />
            </div>

            <div className="grid grid-cols-2 gap-3">
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
              <div className="flex flex-col gap-2">
                <Label htmlFor="promisedDate">Due date</Label>
                <Input id="promisedDate" type="date" {...form.register("promisedDate")} />
              </div>
            </div>

            {mode === "quick" ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="totalAmount">Total amount</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("totalAmount")}
                />
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={3} {...form.register("notes")} />
            </div>
          </CardContent>
        </Card>

        {mode === "detailed" ? (
          <>
            <Card>
              <CardContent className="flex flex-col gap-3 pt-6">
                <div className="flex items-center justify-between">
                  <Label>Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      itemsArray.append({
                        description: "",
                        quantity: 1,
                        unitPrice: 0,
                        itemType: "custom_line_item",
                      })
                    }
                  >
                    <Plus className="size-4" />
                    Add item
                  </Button>
                </div>
                {itemsArray.fields.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No items added — the order title and total will be used as a single
                    line item.
                  </p>
                ) : null}
                {itemsArray.fields.map((field, index) => (
                  <div key={field.id} className="flex flex-col gap-2 rounded-md border p-2">
                    <div className="grid grid-cols-[1fr_5rem_6rem_auto] items-end gap-2">
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Description</Label>
                        <Input {...form.register(`items.${index}.description` as const)} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Qty</Label>
                        <Input
                          type="number"
                          step="1"
                          min="1"
                          {...form.register(`items.${index}.quantity` as const)}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Unit price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...form.register(`items.${index}.unitPrice` as const)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => itemsArray.remove(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    {products.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Link to product (optional — enables inventory tracking)</Label>
                        <Select
                          value={form.watch(`items.${index}.productId`) ?? "none"}
                          onValueChange={(v: string) => {
                            if (v === "none") {
                              form.setValue(`items.${index}.productId`, undefined);
                              form.setValue(`items.${index}.itemType`, "custom_line_item");
                              return;
                            }
                            const product = products.find((p) => p.id === v);
                            form.setValue(`items.${index}.productId`, v);
                            form.setValue(`items.${index}.itemType`, "catalog_product");
                            if (product) {
                              form.setValue(`items.${index}.unitPrice`, product.sellingPrice);
                              if (!form.getValues(`items.${index}.description`)) {
                                form.setValue(`items.${index}.description`, product.name);
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Not linked" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Not linked</SelectItem>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} ({p.availableQuantity} available)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                  </div>
                ))}

                <div className="grid grid-cols-4 gap-3 border-t pt-3">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Discount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...form.register("discountTotal")}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Tax</Label>
                    <Input type="number" step="0.01" min="0" {...form.register("taxTotal")} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Shipping</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...form.register("shippingCost")}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Deposit required</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...form.register("depositRequired")}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="internalDeadline">Internal deadline</Label>
                  <Input id="internalDeadline" type="date" {...form.register("internalDeadline")} />
                </div>
              </CardContent>
            </Card>

            {isMidWorkflow ? (
              <Card className="border-amber-300 dark:border-amber-900">
                <CardContent className="flex flex-col gap-4 pt-6">
                  <div>
                    <p className="text-sm font-medium">This order isn&apos;t starting fresh</p>
                    <p className="text-sm text-muted-foreground">
                      Add the statuses and payments it already passed through, with their
                      real dates, so its history isn&apos;t a lie.
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
                                v as PaymentMethod,
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
          </>
        ) : null}

        <Button type="submit" disabled={submitting} className="self-start">
          {submitting ? "Saving…" : "Save order"}
        </Button>
      </form>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}
