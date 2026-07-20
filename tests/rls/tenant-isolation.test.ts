import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanupTestTenant, createTestTenant, type TestTenant } from "./helpers";

/**
 * The automated two-organization isolation test required by docs/security.md
 * #3: "an automated test creates two organizations and asserts that no
 * cross-organization read or write succeeds for any table, run in CI before
 * every deploy." This is the gate every later phase's migrations must keep
 * passing (docs/build_phases.md Phase 2 acceptance criteria).
 *
 * Covers a representative cross-section of the RLS patterns established in
 * supabase/migrations (member read/write, owner-only write, append-only) —
 * customers, orders, and organization_members. As each entity's domain layer
 * ships in later phases, extend this file rather than starting a new one, so
 * "no cross-tenant access, ever" stays a single tracked assertion set.
 *
 * Requires a running Supabase instance (`supabase start`, needs Docker) with
 * `.env.local` pointing at it — see README.md "Testing".
 */
describe("tenant isolation (RLS)", () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;

  beforeAll(async () => {
    [tenantA, tenantB] = await Promise.all([
      createTestTenant("a"),
      createTestTenant("b"),
    ]);
  });

  afterAll(async () => {
    await Promise.all([cleanupTestTenant(tenantA), cleanupTestTenant(tenantB)]);
  });

  it("a user only sees their own organization's membership", async () => {
    const { data, error } = await tenantA.client.from("organization_members").select("*");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].organization_id).toBe(tenantA.organizationId);
  });

  it("a user cannot see another organization's row by id", async () => {
    const { data: org } = await tenantB.client
      .from("organizations")
      .select("*")
      .eq("id", tenantA.organizationId)
      .maybeSingle();
    expect(org).toBeNull();
  });

  it("a customer created in org A is invisible to org B", async () => {
    const { data: created, error: insertError } = await tenantA.client
      .from("customers")
      .insert({ organization_id: tenantA.organizationId, display_name: "Alice from Org A" })
      .select()
      .single();
    expect(insertError).toBeNull();
    expect(created).not.toBeNull();

    const { data: seenByB } = await tenantB.client
      .from("customers")
      .select("*")
      .eq("id", created!.id)
      .maybeSingle();
    expect(seenByB).toBeNull();

    const { data: listByB } = await tenantB.client.from("customers").select("*");
    expect(listByB ?? []).toHaveLength(0);
  });

  it("org B cannot update a row that belongs to org A", async () => {
    const { data: created } = await tenantA.client
      .from("customers")
      .insert({ organization_id: tenantA.organizationId, display_name: "Bob from Org A" })
      .select()
      .single();

    const { data: updateResult, error: updateError } = await tenantB.client
      .from("customers")
      .update({ display_name: "Hijacked" })
      .eq("id", created!.id)
      .select();

    // RLS makes the target set empty rather than raising — assert zero rows
    // changed, and that org A's copy is untouched.
    expect(updateError).toBeNull();
    expect(updateResult ?? []).toHaveLength(0);

    const { data: stillOriginal } = await tenantA.client
      .from("customers")
      .select("display_name")
      .eq("id", created!.id)
      .single();
    expect(stillOriginal?.display_name).toBe("Bob from Org A");
  });

  it("org B cannot spoof organization_id to write into org A", async () => {
    const { error } = await tenantB.client
      .from("customers")
      .insert({ organization_id: tenantA.organizationId, display_name: "Spoofed Customer" });

    // The insert's WITH CHECK clause requires is_org_member(organization_id)
    // for the *caller* — org B is not a member of org A, so this must fail.
    expect(error).not.toBeNull();
  });

  it("org B cannot see org A's orders even via a direct table query", async () => {
    const { data: aCustomer } = await tenantA.client
      .from("customers")
      .insert({ organization_id: tenantA.organizationId, display_name: "Order Customer" })
      .select()
      .single();

    const { data: statuses } = await tenantA.client
      .from("workflow_statuses")
      .select("id, workflow_definitions!inner(entity_type)")
      .eq("organization_id", tenantA.organizationId)
      .eq("workflow_definitions.entity_type", "order_custom")
      .limit(1);

    const { data: order, error: orderInsertError } = await tenantA.client
      .from("orders")
      .insert({
        organization_id: tenantA.organizationId,
        order_number: "RLS-TEST-1",
        customer_id: aCustomer!.id,
        order_type: "custom",
        status_id: statuses![0].id,
      })
      .select()
      .single();
    expect(orderInsertError).toBeNull();

    const { data: seenByB } = await tenantB.client
      .from("orders")
      .select("*")
      .eq("id", order!.id)
      .maybeSingle();
    expect(seenByB).toBeNull();
  });
});
