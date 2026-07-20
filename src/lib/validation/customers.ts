import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

export const createCustomerSchema = z.object({
  displayName: z.string().trim().min(1, "Name is required"),
  phone: optionalText,
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || z.string().email().safeParse(v).success, "Enter a valid email"),
  instagram: optionalText,
  tiktok: optionalText,
  preferredContactMethod: z
    .enum(["instagram", "text", "tiktok", "email", "phone", "in_person", "other"])
    .optional(),
  notes: optionalText,
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
