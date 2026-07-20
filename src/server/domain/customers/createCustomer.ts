import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createCustomerSchema, type CreateCustomerInput } from "@/lib/validation/customers";
import {
  findDuplicateCustomers,
  insertCustomer,
  type DuplicateMatch,
} from "@/server/data/customers";

export type CreateCustomerResult =
  | { status: "created"; customer: { id: string; display_name: string } }
  | { status: "duplicates"; matches: DuplicateMatch[] }
  | { status: "error"; error: string };

/**
 * docs/user_flows.md Flow A/B: customer creation must never be blocked by a
 * possible duplicate, only warned about (docs/product_requirements.md §10.8's
 * "warn, don't block"). Callers get a `duplicates` result first; passing
 * `acknowledgeDuplicates: true` proceeds to create anyway.
 */
export async function createCustomer(
  supabase: SupabaseClient,
  organizationId: string,
  input: CreateCustomerInput,
  acknowledgeDuplicates: boolean,
): Promise<CreateCustomerResult> {
  const parsed = createCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const identifiers: { kind: string; value: string }[] = [];
  if (parsed.data.phone) identifiers.push({ kind: "phone", value: parsed.data.phone });
  if (parsed.data.email) identifiers.push({ kind: "email", value: parsed.data.email });
  if (parsed.data.instagram) identifiers.push({ kind: "instagram", value: parsed.data.instagram });
  if (parsed.data.tiktok) identifiers.push({ kind: "tiktok", value: parsed.data.tiktok });

  if (!acknowledgeDuplicates && identifiers.length > 0) {
    const matches = await findDuplicateCustomers(supabase, organizationId, identifiers);
    if (matches.length > 0) {
      return { status: "duplicates", matches };
    }
  }

  try {
    const customer = await insertCustomer(supabase, organizationId, parsed.data);
    return { status: "created", customer };
  } catch {
    return { status: "error", error: "Could not create the customer. Try again." };
  }
}
