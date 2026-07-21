import { z } from "zod";

export const quoteItemSchema = z.object({
  description: z.string().trim().min(1, "Item description is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Price can't be negative"),
  itemType: z.enum(["product", "labor", "material", "custom"]).default("custom"),
});

/** Quote builder (docs/screens.md #14) — always the full line-item form, unlike orders' Quick/Detailed split, since pricing precision is the entire point of a quote. */
export const createQuoteSchema = z.object({
  customerId: z.string().uuid("Select a customer"),
  requestId: z.string().uuid().optional(),
  items: z.array(quoteItemSchema).min(1, "Add at least one line item"),
  discountTotal: z.coerce.number().min(0).default(0),
  taxTotal: z.coerce.number().min(0).default(0),
  shippingCost: z.coerce.number().min(0).default(0),
  depositAmount: z.coerce.number().min(0).default(0),
  expiresAt: z.string().optional(),
  terms: z.string().trim().optional(),
  customerNotes: z.string().trim().optional(),
});

export type CreateQuoteInput = z.input<typeof createQuoteSchema>;

export const updateQuoteSchema = createQuoteSchema.extend({
  quoteId: z.string().uuid(),
});

export type UpdateQuoteInput = z.input<typeof updateQuoteSchema>;

/** docs/user_flows.md Flow E step 4 — decline requires a reason to be useful later, but only as an optional note (staff relaying a verbal "no" shouldn't be blocked). */
export const recordQuoteResponseSchema = z.object({
  quoteId: z.string().uuid(),
  response: z.enum(["approved", "declined"]),
  declineReason: z.string().trim().optional(),
});

export type RecordQuoteResponseInput = z.input<typeof recordQuoteResponseSchema>;
