import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  dueDate: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  orderId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  requestId: z.string().uuid().optional(),
});

export type CreateTaskInput = z.input<typeof createTaskSchema>;
