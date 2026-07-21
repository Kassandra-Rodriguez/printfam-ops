import { NextResponse } from "next/server";
import { validatePortalToken } from "@/server/domain/portal/validatePortalToken";
import { checkPortalRateLimit, getRequestIp } from "@/server/domain/portal/rateLimit";
import { recordProofResponse } from "@/server/domain/proofs/recordProofResponse";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { notifyOrgMembers } from "@/server/data/notifications";

/**
 * docs/user_flows.md Flow F step 3. `proofVersionId` in the body is never
 * trusted on its own — it must belong to the token's own scoped proof, or
 * the request is rejected (docs/security.md #4.5 IDOR prevention: a valid
 * token for proof A can't be replayed against proof B's version id).
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ip = getRequestIp(request);

  const withinIpLimit = await checkPortalRateLimit(`ip:${ip}:proof-response`, 30, 60);
  if (!withinIpLimit) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const resolution = await validatePortalToken(token);
  if (!resolution.ok) {
    return NextResponse.json({ error: resolution.reason }, { status: 403 });
  }
  if (resolution.scopeType !== "proof") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const proofVersionId = body?.proofVersionId;
  const response = body?.response;
  if (typeof proofVersionId !== "string" || (response !== "approved" && response !== "revision_requested")) {
    return NextResponse.json({ error: "Invalid response" }, { status: 400 });
  }
  const revisionComment = typeof body?.revisionComment === "string" ? body.revisionComment : undefined;
  if (response === "revision_requested" && !revisionComment?.trim()) {
    return NextResponse.json({ error: "A revision comment is required" }, { status: 400 });
  }

  const supabase = createServiceRoleSupabaseClient();

  const { data: version, error: versionError } = await supabase
    .from("proof_versions")
    .select("proof_id")
    .eq("id", proofVersionId)
    .maybeSingle();
  if (versionError || !version || version.proof_id !== resolution.scopeId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const result = await recordProofResponse(
    supabase,
    resolution.organizationId,
    proofVersionId,
    response,
    revisionComment,
    "portal",
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  await notifyOrgMembers(supabase, resolution.organizationId, {
    type: response === "approved" ? "proof_approved" : "proof_revision_requested",
    entityType: "proof",
    entityId: resolution.scopeId,
    message: response === "approved" ? "A customer approved a proof" : "A customer requested a proof revision",
  });

  return NextResponse.json({ ok: true });
}
