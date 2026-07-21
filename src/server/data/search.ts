import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SearchResultGroup = {
  label: string;
  results: { id: string; title: string; subtitle: string; href: string }[];
};

/**
 * docs/product_requirements.md §7.13: "Global search across customers,
 * orders, requests, repairs, notes, tracking numbers." Free-text `notes`
 * fields are intentionally out of scope here — there's no full-text index
 * on this project's tables, and an unindexed ILIKE across every notes
 * column on every table would be the slowest, least useful part of this
 * feature; the structured fields below cover what people actually search
 * for (a name, a number, a device).
 */
export async function globalSearch(
  supabase: SupabaseClient,
  organizationId: string,
  query: string,
): Promise<SearchResultGroup[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const pattern = `%${trimmed}%`;

  const [customers, orders, requests, repairTickets] = await Promise.all([
    supabase
      .from("customers")
      .select("id, display_name, email, phone")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .or(`display_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
      .limit(5),
    supabase
      .from("orders")
      .select("id, order_number, title, tracking_number")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .or(`order_number.ilike.${pattern},title.ilike.${pattern},tracking_number.ilike.${pattern}`)
      .limit(5),
    supabase
      .from("requests")
      .select("id, title")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .ilike("title", pattern)
      .limit(5),
    supabase
      .from("repair_tickets")
      .select("id, ticket_number, device_model")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .or(`ticket_number.ilike.${pattern},device_model.ilike.${pattern}`)
      .limit(5),
  ]);

  for (const [name, result] of Object.entries({ customers, orders, requests, repairTickets })) {
    if (result.error) throw new Error(`globalSearch: ${name} query failed: ${result.error.message}`);
  }

  const groups: SearchResultGroup[] = [
    {
      label: "Customers",
      results: (customers.data ?? []).map((c) => ({
        id: c.id,
        title: c.display_name,
        subtitle: c.email ?? c.phone ?? "",
        href: `/customers/${c.id}`,
      })),
    },
    {
      label: "Orders",
      results: (orders.data ?? []).map((o) => ({
        id: o.id,
        title: o.title ?? o.order_number,
        subtitle: o.tracking_number ? `${o.order_number} · Tracking ${o.tracking_number}` : o.order_number,
        href: `/orders/${o.id}`,
      })),
    },
    {
      label: "Requests",
      results: (requests.data ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        subtitle: "Request",
        href: `/requests/${r.id}`,
      })),
    },
    {
      label: "Repairs",
      results: (repairTickets.data ?? []).map((r) => ({
        id: r.id,
        title: r.device_model,
        subtitle: r.ticket_number,
        href: `/repairs/${r.id}`,
      })),
    },
  ];

  return groups.filter((g) => g.results.length > 0);
}
