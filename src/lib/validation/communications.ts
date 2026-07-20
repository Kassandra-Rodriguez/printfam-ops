import { z } from "zod";

export const communicationChannelSchema = z.enum([
  "instagram",
  "text",
  "tiktok_shop",
  "shopify",
  "email",
  "phone",
  "in_person",
  "other",
]);

export const logCommunicationSchema = z.object({
  customerId: z.string().uuid("Select a customer"),
  channel: communicationChannelSchema,
  direction: z.enum(["incoming", "outgoing"]),
  body: z.string().trim().min(1, "Message can't be empty"),
  occurredAt: z.string().optional(),
  relatedRequestId: z.string().uuid().optional(),
  relatedOrderId: z.string().uuid().optional(),
  followUpRequired: z.boolean().default(false),
  followUpDate: z.string().optional(),
});

export type LogCommunicationInput = z.input<typeof logCommunicationSchema>;
