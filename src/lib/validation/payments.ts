import { z } from "zod";

/** Exactly one of orderId/repairTicketId, mirroring the payments_single_target_chk DB constraint. */
export const recordPaymentSchema = z
  .object({
    orderId: z.string().uuid().optional(),
    repairTicketId: z.string().uuid().optional(),
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
  })
  .refine((data) => Boolean(data.orderId) !== Boolean(data.repairTicketId), {
    message: "Payment must belong to exactly one record",
  });

export type RecordPaymentInput = z.input<typeof recordPaymentSchema>;
