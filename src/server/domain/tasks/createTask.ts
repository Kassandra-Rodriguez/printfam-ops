import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createTaskSchema, type CreateTaskInput } from "@/lib/validation/tasks";
import { insertTask } from "@/server/data/tasks";

export async function createTask(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: CreateTaskInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await insertTask(supabase, organizationId, userId, parsed.data);
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not create the task. Try again." };
  }
}
