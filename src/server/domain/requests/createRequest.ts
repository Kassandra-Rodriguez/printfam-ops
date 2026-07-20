import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createRequestSchema, type CreateRequestInput } from "@/lib/validation/requests";
import { insertRequest } from "@/server/data/requests";
import { getWorkflowStatuses } from "@/server/data/workflow";

export type CreateRequestResult =
  | { status: "created"; requestId: string }
  | { status: "error"; error: string };

/** docs/user_flows.md Flow C. */
export async function createRequest(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: CreateRequestInput,
): Promise<CreateRequestResult> {
  const parsed = createRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const statuses = await getWorkflowStatuses(supabase, organizationId, "request");
    const initialStatusId = statuses[0]?.id;
    if (!initialStatusId) {
      return { status: "error", error: "No request statuses configured for this organization." };
    }

    const request = await insertRequest(supabase, organizationId, userId, initialStatusId, parsed.data);
    return { status: "created", requestId: request.id };
  } catch (err) {
    console.error("createRequest failed:", err);
    return { status: "error", error: "Could not create the request. Try again." };
  }
}
