import { z } from "zod";

/** docs/screens.md #20. `cost` is intentionally accepted here (Owner/Manager-only form) but never returned by any Team Member-reachable read path — see server/data/products.ts. */
export const createProductSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().optional(),
  category: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  sellingPrice: z.coerce.number().min(0).default(0),
  cost: z.coerce.number().min(0).optional(),
  availableQuantity: z.coerce.number().int().min(0).default(0),
  reorderLevel: z.coerce.number().int().min(0).default(0),
  productionNotes: z.string().trim().optional(),
});

export type CreateProductInput = z.input<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.extend({
  productId: z.string().uuid(),
  isActive: z.boolean().default(true),
});

export type UpdateProductInput = z.input<typeof updateProductSchema>;

/** docs/screens.md #20: "Adjust stock (popover: amount + reason, not a full modal)." Positive = restock, negative = correction/shrinkage — same sign convention as inventory_transactions.quantity_delta. */
export const adjustStockSchema = z.object({
  productId: z.string().uuid(),
  quantityDelta: z.coerce.number().int().refine((n) => n !== 0, "Enter a non-zero amount"),
  reason: z.enum(["manual_adjustment", "restock", "correction"]),
  note: z.string().trim().optional(),
});

export type AdjustStockInput = z.input<typeof adjustStockSchema>;
