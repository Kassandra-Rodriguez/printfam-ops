import { z } from "zod";

export const repairPartSchema = z.object({
  partName: z.string().trim().min(1, "Part name is required"),
  cost: z.coerce.number().min(0).default(0),
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0").default(1),
  status: z.enum(["needed", "ordered", "received", "installed"]).default("needed"),
});

export const repairBackfillStatusEntrySchema = z.object({
  statusId: z.string().uuid(),
  changedAt: z.string().min(1, "Date is required"),
  note: z.string().trim().optional(),
});

export const repairBackfillPaymentEntrySchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  method: z.enum([
    "cash",
    "cash_app",
    "zelle",
    "card",
    "shopify",
    "tiktok_shop",
    "square",
    "bank_transfer",
    "other",
  ]),
  kind: z.enum(["deposit", "final", "full", "refund"]),
  paidAt: z.string().min(1, "Date is required"),
  referenceNumber: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

/**
 * Repair intake form (docs/screens.md #11, docs/user_flows.md Flow D): a device
 * can enter the system already in-hand and mid-repair, same backfill principle
 * as orders' Flow B — see server/domain/repairs/createRepairTicket.ts.
 */
export const createRepairTicketSchema = z.object({
  customerId: z.string().uuid("Select a customer"),
  deviceModel: z.string().trim().min(1, "Device/model is required"),
  serialNumber: z.string().trim().optional(),
  reportedIssue: z.string().trim().min(1, "Reported issue is required"),
  errorCodes: z.string().trim().optional(),
  intakeDate: z.string().min(1, "Intake date is required"),
  conditionAtIntake: z.string().trim().optional(),
  accessoriesReceived: z.string().trim().optional(),
  statusId: z.string().uuid("Select a status"),
  /** Defaults to now in the domain layer when omitted. */
  currentStatusReachedAt: z.string().optional(),
  diagnosticFee: z.coerce.number().min(0).optional(),
  /** Prior statuses only, same convention as createOrderSchema.backfillStatuses. */
  backfillStatuses: z.array(repairBackfillStatusEntrySchema).optional(),
  backfillPayments: z.array(repairBackfillPaymentEntrySchema).optional(),
});

export type CreateRepairTicketInput = z.input<typeof createRepairTicketSchema>;

/**
 * Editing a ticket deliberately excludes statusId/backfill (the status control
 * on the detail page is the only path that writes
 * repair_ticket_status_history) and payments (recordRepairPayment.ts is the
 * only way money gets recorded) — same split as updateOrderSchema.
 */
export const updateRepairTicketSchema = z.object({
  repairTicketId: z.string().uuid(),
  deviceModel: z.string().trim().min(1, "Device/model is required"),
  serialNumber: z.string().trim().optional(),
  reportedIssue: z.string().trim().min(1, "Reported issue is required"),
  errorCodes: z.string().trim().optional(),
  conditionAtIntake: z.string().trim().optional(),
  accessoriesReceived: z.string().trim().optional(),
  diagnosticFee: z.coerce.number().min(0).optional(),
  identifiedProblem: z.string().trim().optional(),
  recommendedRepair: z.string().trim().optional(),
  laborCost: z.coerce.number().min(0).optional(),
  warrantyPeriodDays: z.coerce.number().int().min(0).optional(),
  completedSummary: z.string().trim().optional(),
  parts: z.array(repairPartSchema).default([]),
});

export type UpdateRepairTicketInput = z.input<typeof updateRepairTicketSchema>;

/** Diagnostic/testing log entry (docs/data_model.md repair_diagnostics) — an append-only timeline, not an edited record. */
export const addRepairDiagnosticSchema = z.object({
  repairTicketId: z.string().uuid(),
  notes: z.string().trim().optional(),
  checklist: z
    .array(z.object({ item: z.string().trim().min(1), result: z.string().trim().min(1) }))
    .default([]),
});

export type AddRepairDiagnosticInput = z.input<typeof addRepairDiagnosticSchema>;
