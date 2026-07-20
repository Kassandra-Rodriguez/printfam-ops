import { z } from "zod";

export const requestSourceSchema = z.enum([
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

export const createRequestSchema = z.object({
  customerId: z.string().uuid("Select a customer"),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional(),
  source: requestSourceSchema,
  estimatedValue: z.coerce.number().min(0).optional(),
  followUpDate: z.string().optional(),
});

export type CreateRequestInput = z.input<typeof createRequestSchema>;
