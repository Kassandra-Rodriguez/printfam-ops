import { z } from "zod";

export const orderTypeSchema = z.enum(["custom", "existing_product", "bulk", "service"]);

export const orderSourceSchema = z.enum([
  "instagram",
  "text",
  "shopify",
  "tiktok",
  "email",
  "phone",
  "in_person",
  "returning_customer",
  "other",
]);

export const orderLineItemSchema = z.object({
  description: z.string().trim().min(1, "Item description is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Price can't be negative"),
  itemType: z
    .enum(["catalog_product", "custom_line_item", "service", "repair_charge"])
    .default("custom_line_item"),
});

export const backfillStatusEntrySchema = z.object({
  statusId: z.string().uuid(),
  changedAt: z.string().min(1, "Date is required"),
  note: z.string().trim().optional(),
});

export const backfillPaymentEntrySchema = z.object({
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
 * One schema for both Quick Entry and Detailed Entry (docs/product_requirements.md §7.3):
 * Quick Entry is Detailed Entry with everything past the seven required fields omitted.
 * `items` is optional because Quick Entry has no line-item builder — createOrder()
 * synthesizes a single item from `title` + `totalAmount` when it's absent
 * (docs/user_flows.md Flow A, see server/domain/orders/createOrder.ts for why).
 */
export const createOrderSchema = z.object({
  customerId: z.string().uuid("Select a customer"),
  title: z.string().trim().min(1, "Order title is required"),
  orderType: orderTypeSchema,
  requiresProduction: z.boolean().default(false),
  statusId: z.string().uuid("Select a status"),
  /** Defaults to now in the domain layer when omitted — see createOrder.ts. */
  currentStatusReachedAt: z.string().optional(),
  /** Set when this order originates from "Convert to Order" on a request (Flow C). */
  convertedFromRequestId: z.string().uuid().optional(),
  /** Set when this order originates from "Convert to Order" on a quote (Flow E step 5). */
  convertedFromQuoteId: z.string().uuid().optional(),
  totalAmount: z.coerce.number().min(0).optional(),
  items: z.array(orderLineItemSchema).optional(),
  promisedDate: z.string().optional(),
  internalDeadline: z.string().optional(),
  notes: z.string().trim().optional(),
  discountTotal: z.coerce.number().min(0).default(0),
  taxTotal: z.coerce.number().min(0).default(0),
  shippingCost: z.coerce.number().min(0).default(0),
  depositRequired: z.coerce.number().min(0).default(0),
  source: orderSourceSchema.optional(),
  /**
   * Prior statuses only — never the current one. docs/user_flows.md Flow B:
   * "surfaces a Backfill history section" for statuses reached *before*
   * `statusId`, each with its own historical date. createOrder() appends
   * `statusId` itself as the final, always-present history entry.
   */
  backfillStatuses: z.array(backfillStatusEntrySchema).optional(),
  backfillPayments: z.array(backfillPaymentEntrySchema).optional(),
});

/**
 * The *input* shape (z.input, not z.infer/z.output) — fields with a Zod
 * `.default()` are optional here, matching what the form and server action
 * actually pass around before validation fills them in. The domain layer
 * works with the post-parse output type internally (see createOrder.ts).
 */
export type CreateOrderInput = z.input<typeof createOrderSchema>;

/**
 * Editing an order deliberately excludes orderType/requiresProduction (would
 * orphan its status history against a different workflow's status list) and
 * statusId/backfill (status changes go through the dedicated status control
 * on the order detail page, which also logs the transition to
 * order_status_history — editing shouldn't have a second, untracked way to
 * change status). Payments aren't here either — recordOrderPayment.ts is the
 * only way money gets recorded, edit or not.
 */
export const updateOrderSchema = z.object({
  orderId: z.string().uuid(),
  customerId: z.string().uuid("Select a customer"),
  title: z.string().trim().min(1, "Order title is required"),
  items: z.array(orderLineItemSchema).min(1, "Add at least one item"),
  promisedDate: z.string().optional(),
  internalDeadline: z.string().optional(),
  notes: z.string().trim().optional(),
  discountTotal: z.coerce.number().min(0).default(0),
  taxTotal: z.coerce.number().min(0).default(0),
  shippingCost: z.coerce.number().min(0).default(0),
  depositRequired: z.coerce.number().min(0).default(0),
  source: orderSourceSchema.optional(),
});

export type UpdateOrderInput = z.input<typeof updateOrderSchema>;
