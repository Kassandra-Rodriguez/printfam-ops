import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestTenant, cleanupTestTenant, serviceRoleClient, type TestTenant } from "../rls/helpers";
import { getOrderForPortal, getRepairTicketForPortal, getQuoteForPortal } from "@/server/data/portalViews";
import { issuePortalToken, type PortalScopeType } from "@/server/domain/portal/issuePortalToken";
import { POST as proofResponsePOST } from "@/app/api/portal/[token]/proof-response/route";
import { POST as quoteResponsePOST } from "@/app/api/portal/[token]/quote-response/route";
import { POST as repairApprovalPOST } from "@/app/api/portal/[token]/repair-approval/route";

/**
 * docs/build_phases.md Phase 7 acceptance criteria: (1) a token cannot reach
 * any URL/data outside its exact scoped record, verified by an automated
 * ID-substitution/traversal test, not just manual spot-checking; (2) no
 * internal-only field ever appears in a portal response. This is a
 * permanent suite (unlike Phase 6's throwaway verify script) because these
 * are standing product guarantees, not one-time migration checks.
 */

let tenant: TestTenant;
let customerId: string;
let orderId: string;
let repairTicketId: string;
let quoteId: string;
let quoteId2: string;
let proofAId: string;
let proofBId: string;
let proofAVersionId: string;
let proofBVersionId: string;

/**
 * issuePortalToken() deliberately reuses an active token for the same scope
 * (Flow F/E's "generates/reuses" behavior) — great for the app, inconvenient
 * for tests that need a guaranteed-fresh token per case. Revoking first
 * sidesteps that without weakening the thing under test.
 */
async function freshToken(scopeType: PortalScopeType, scopeId: string, expiresInDays?: number) {
  await serviceRoleClient()
    .from("portal_access_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("scope_type", scopeType)
    .eq("scope_id", scopeId)
    .is("revoked_at", null);
  const issued = await issuePortalToken(tenant.organizationId, customerId, scopeType, scopeId, tenant.userId, expiresInDays);
  if (issued.reused) throw new Error("expected a fresh token");
  return issued.rawToken;
}

function makeRequest(body?: unknown) {
  return new Request("http://localhost/test", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.1" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeAll(async () => {
  tenant = await createTestTenant("phase7-portal");
  const { client, organizationId, userId } = tenant;

  const { data: customer } = await client
    .from("customers")
    .insert({ organization_id: organizationId, display_name: "Portal Test Customer" })
    .select("id")
    .single();
  customerId = customer!.id;

  const { data: quoteStatuses } = await client
    .from("workflow_statuses")
    .select("id, key, workflow_definitions!inner(entity_type)")
    .eq("organization_id", organizationId)
    .eq("workflow_definitions.entity_type", "quote");
  const draftStatus = quoteStatuses!.find((s) => s.key === "draft")!;

  const { data: quote } = await client
    .from("quotes")
    .insert({ organization_id: organizationId, customer_id: customerId, status_id: draftStatus.id, total: 50, created_by: userId })
    .select("id")
    .single();
  quoteId = quote!.id;

  const { data: quote2 } = await client
    .from("quotes")
    .insert({ organization_id: organizationId, customer_id: customerId, status_id: draftStatus.id, total: 75, created_by: userId })
    .select("id")
    .single();
  quoteId2 = quote2!.id;

  const { data: orderStatuses } = await client
    .from("workflow_statuses")
    .select("id, key, workflow_definitions!inner(entity_type)")
    .eq("organization_id", organizationId)
    .eq("workflow_definitions.entity_type", "order_custom");
  const receivedStatus = orderStatuses!.find((s) => s.key === "request_received")!;

  const { data: order } = await client
    .from("orders")
    .insert({
      organization_id: organizationId,
      order_number: "ORD-PORTAL-TEST",
      customer_id: customerId,
      title: "Portal test order",
      order_type: "custom",
      requires_production: true,
      status_id: receivedStatus.id,
      total: 100,
      balance_remaining: 100,
      notes: "INTERNAL: customer is difficult, handle with care",
      internal_deadline: "2026-01-01",
      created_by: userId,
    })
    .select("id")
    .single();
  orderId = order!.id;

  const { data: repairStatuses } = await client
    .from("workflow_statuses")
    .select("id, key, workflow_definitions!inner(entity_type)")
    .eq("organization_id", organizationId)
    .eq("workflow_definitions.entity_type", "repair_ticket");
  const repairReceivedStatus = repairStatuses!.find((s) => s.key === "device_received")!;

  const { data: ticket } = await client
    .from("repair_tickets")
    .insert({
      organization_id: organizationId,
      ticket_number: "REP-PORTAL-TEST",
      customer_id: customerId,
      device_model: "Test Printer",
      reported_issue: "Won't power on",
      intake_date: new Date().toISOString().slice(0, 10),
      condition_at_intake: "INTERNAL: covered in dust, customer smokes indoors",
      status_id: repairReceivedStatus.id,
      final_balance: 0,
      created_by: userId,
    })
    .select("id")
    .single();
  repairTicketId = ticket!.id;

  const { data: proofA } = await client
    .from("proofs")
    .insert({
      organization_id: organizationId,
      order_id: orderId,
      title: "Proof A",
      approval_required: true,
      visibility: "customer_visible",
      latest_status: "sent",
      created_by: userId,
    })
    .select("id")
    .single();
  proofAId = proofA!.id;
  const { data: versionA } = await client
    .from("proof_versions")
    .insert({ proof_id: proofAId, organization_id: organizationId, version_number: 1, sent_at: new Date().toISOString(), created_by: userId })
    .select("id")
    .single();
  proofAVersionId = versionA!.id;

  const { data: proofB } = await client
    .from("proofs")
    .insert({
      organization_id: organizationId,
      order_id: orderId,
      title: "Proof B",
      approval_required: true,
      visibility: "customer_visible",
      latest_status: "sent",
      created_by: userId,
    })
    .select("id")
    .single();
  proofBId = proofB!.id;
  const { data: versionB } = await client
    .from("proof_versions")
    .insert({ proof_id: proofBId, organization_id: organizationId, version_number: 1, sent_at: new Date().toISOString(), created_by: userId })
    .select("id")
    .single();
  proofBVersionId = versionB!.id;
}, 30000);

afterAll(async () => {
  if (tenant) await cleanupTestTenant(tenant);
});

describe("Portal: internal-only fields never leak into a portal-facing response", () => {
  it("omits notes/internal_deadline/tasks/assigned_user from the order view", async () => {
    const view = await getOrderForPortal(serviceRoleClient(), tenant.organizationId, orderId);
    expect(view).toBeTruthy();
    const keys = Object.keys(view as object);
    for (const forbidden of ["notes", "internal_deadline", "assigned_user_id", "created_by", "tasks", "source"]) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it("omits internal intake notes/diagnostics/tasks from the repair view", async () => {
    const view = await getRepairTicketForPortal(serviceRoleClient(), tenant.organizationId, repairTicketId);
    expect(view).toBeTruthy();
    const keys = Object.keys(view as object);
    for (const forbidden of [
      "condition_at_intake",
      "accessories_received",
      "assigned_user_id",
      "created_by",
      "tasks",
      "repair_diagnostics",
    ]) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it("omits created_by/tasks from the quote view", async () => {
    const view = await getQuoteForPortal(serviceRoleClient(), tenant.organizationId, quoteId);
    expect(view).toBeTruthy();
    const keys = Object.keys(view as object);
    for (const forbidden of ["created_by", "tasks", "request_id"]) {
      expect(keys).not.toContain(forbidden);
    }
  });
});

describe("Portal: token scoping resists ID substitution", () => {
  it("rejects a proof-response body pointing at a different proof's version than the token's own scope", async () => {
    const token = await freshToken("proof", proofAId);

    // Valid token for Proof A, but the body names Proof B's version — the
    // classic IDOR shape (right token, substituted id in the payload).
    const res = await proofResponsePOST(makeRequest({ proofVersionId: proofBVersionId, response: "approved" }), {
      params: Promise.resolve({ token }),
    });
    expect(res.status).toBe(404);

    const { data: unaffectedResponses } = await serviceRoleClient()
      .from("proof_responses")
      .select("id")
      .eq("proof_version_id", proofBVersionId);
    expect(unaffectedResponses ?? []).toHaveLength(0);
  });

  it("accepts a proof-response body whose version genuinely belongs to the token's scoped proof", async () => {
    const token = await freshToken("proof", proofAId);

    const res = await proofResponsePOST(makeRequest({ proofVersionId: proofAVersionId, response: "approved" }), {
      params: Promise.resolve({ token }),
    });
    expect(res.status).toBe(200);
  });

  it("a quote-scoped token can only ever move the one quote it was issued for", async () => {
    const token = await freshToken("quote", quoteId);

    const res = await quoteResponsePOST(makeRequest({ response: "approved" }), { params: Promise.resolve({ token }) });
    expect(res.status).toBe(200);

    const { data: quote } = await serviceRoleClient().from("quotes").select("approved_at").eq("id", quoteId).single();
    expect(quote?.approved_at).toBeTruthy();
  });

  it("a repair-approval token can't be used against a scope type it wasn't issued for", async () => {
    // Token issued for the ORDER, replayed against the repair-approval route.
    const orderToken = await freshToken("order", orderId);

    const res = await repairApprovalPOST(makeRequest(), { params: Promise.resolve({ token: orderToken }) });
    expect(res.status).toBe(404);
  });

  it("fails closed for not-found, expired, and revoked tokens rather than a generic 500", async () => {
    const bogus = await quoteResponsePOST(makeRequest({ response: "approved" }), {
      params: Promise.resolve({ token: "not-a-real-token" }),
    });
    expect(bogus.status).toBe(403);
    expect((await bogus.json()).error).toBe("not_found");

    const expiredToken = await freshToken("quote", quoteId2, -1);
    const expiredRes = await quoteResponsePOST(makeRequest({ response: "approved" }), {
      params: Promise.resolve({ token: expiredToken }),
    });
    expect(expiredRes.status).toBe(403);
    expect((await expiredRes.json()).error).toBe("expired");

    const revokedToken = await freshToken("quote", quoteId2);
    const { hashPortalToken } = await import("@/server/domain/portal/token");
    await serviceRoleClient()
      .from("portal_access_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", hashPortalToken(revokedToken));
    const revokedRes = await quoteResponsePOST(makeRequest({ response: "approved" }), {
      params: Promise.resolve({ token: revokedToken }),
    });
    expect(revokedRes.status).toBe(403);
    expect((await revokedRes.json()).error).toBe("revoked");
  });

  it("never resolves a real order id under the wrong organization", async () => {
    const otherTenant = await createTestTenant("phase7-portal-other-org");
    try {
      const view = await getOrderForPortal(serviceRoleClient(), otherTenant.organizationId, orderId);
      expect(view).toBeNull();
    } finally {
      await cleanupTestTenant(otherTenant);
    }
  });
});
