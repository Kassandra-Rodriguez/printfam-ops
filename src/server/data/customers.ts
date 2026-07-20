import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CustomerListRow = {
  id: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  outstanding_balance: number;
  total_spent: number;
};

export async function listCustomers(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<CustomerListRow[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("id, display_name, phone, email, outstanding_balance, total_spent")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("display_name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getCustomer(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("customers")
    .select(
      "id, display_name, phone, email, preferred_contact_method, notes, outstanding_balance, total_spent, created_at, customer_identifiers(kind, value), customer_tags(tag)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export type DuplicateMatch = {
  customerId: string;
  displayName: string;
  matchedOn: { kind: string; value: string }[];
};

/**
 * docs/product_requirements.md §4/§10: warn on likely duplicates, never block
 * creation. Matches on the same normalized identifiers customer_identifiers
 * already enforces uniqueness on per docs/data_model.md.
 */
export async function findDuplicateCustomers(
  supabase: SupabaseClient,
  organizationId: string,
  identifiers: { kind: string; value: string }[],
): Promise<DuplicateMatch[]> {
  if (identifiers.length === 0) return [];

  const orFilter = identifiers
    .map((i) => `and(kind.eq.${i.kind},value.eq.${i.value.replace(/,/g, "")})`)
    .join(",");

  const { data, error } = await supabase
    .from("customer_identifiers")
    .select("kind, value, customer:customers(id, display_name)")
    .eq("organization_id", organizationId)
    .or(orFilter);

  if (error) throw error;

  const byCustomer = new Map<string, DuplicateMatch>();
  for (const row of data ?? []) {
    const customer = row.customer as unknown as { id: string; display_name: string } | null;
    if (!customer) continue;
    const existing = byCustomer.get(customer.id);
    const match = { kind: row.kind as string, value: row.value as string };
    if (existing) {
      existing.matchedOn.push(match);
    } else {
      byCustomer.set(customer.id, {
        customerId: customer.id,
        displayName: customer.display_name,
        matchedOn: [match],
      });
    }
  }
  return Array.from(byCustomer.values());
}

export async function insertCustomer(
  supabase: SupabaseClient,
  organizationId: string,
  input: {
    displayName: string;
    phone?: string;
    email?: string;
    instagram?: string;
    tiktok?: string;
    preferredContactMethod?: string;
    notes?: string;
  },
) {
  const { data: customer, error } = await supabase
    .from("customers")
    .insert({
      organization_id: organizationId,
      display_name: input.displayName,
      phone: input.phone ?? null,
      email: input.email ?? null,
      preferred_contact_method: input.preferredContactMethod ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  const identifierRows: { kind: string; value: string }[] = [];
  if (input.phone) identifierRows.push({ kind: "phone", value: input.phone });
  if (input.email) identifierRows.push({ kind: "email", value: input.email });
  if (input.instagram) identifierRows.push({ kind: "instagram", value: input.instagram });
  if (input.tiktok) identifierRows.push({ kind: "tiktok", value: input.tiktok });

  if (identifierRows.length > 0) {
    const { error: identifierError } = await supabase.from("customer_identifiers").insert(
      identifierRows.map((row) => ({
        organization_id: organizationId,
        customer_id: customer.id,
        kind: row.kind,
        value: row.value,
      })),
    );
    // A conflicting identifier (same kind+value already exists in this org)
    // is exactly the duplicate case the caller should have already warned
    // about — surface it rather than leaving the customer half-created.
    if (identifierError) throw identifierError;
  }

  return customer as { id: string; display_name: string };
}
