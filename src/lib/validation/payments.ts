import { z } from "zod";

export const recordPaymentSchema = z.object({
  orderId: z.string().uuid(),
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

export type RecordPaymentInput = z.input<typeof recordPaymentSchema>;
