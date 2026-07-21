import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { validatePortalToken } from "@/server/domain/portal/validatePortalToken";
import { checkPortalRateLimit, getRequestIp } from "@/server/domain/portal/rateLimit";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { insertAttachment } from "@/server/data/attachments";
import { ALLOWED_ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_BYTES } from "@/lib/validation/attachments";

/**
 * docs/user_flows.md Flow J step 2 ("upload a file"). Staff uploads go
 * straight from the browser to Storage using the signed-in user's session
 * (bucket RLS is `to authenticated` only — docs/architecture.md §8); a
 * portal visitor has no session, so the file has to pass through this
 * Route Handler and get written with the service-role client instead.
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ip = getRequestIp(request);

  const withinIpLimit = await checkPortalRateLimit(`ip:${ip}:upload`, 10, 60);
  if (!withinIpLimit) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const resolution = await validatePortalToken(token);
  if (!resolution.ok) {
    return NextResponse.json({ error: resolution.reason }, { status: 403 });
  }
  if (resolution.scopeType !== "order" && resolution.scopeType !== "repair_ticket") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type as (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number])) {
    return NextResponse.json({ error: "That file type isn't supported." }, { status: 400 });
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return NextResponse.json({ error: "File is too large (15MB max)." }, { status: 400 });
  }

  const supabase = createServiceRoleSupabaseClient();
  const storagePath = `${resolution.organizationId}/${randomUUID()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(storagePath, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
  if (uploadError) {
    console.error("portal upload failed:", uploadError);
    return NextResponse.json({ error: "Upload failed. Try again." }, { status: 500 });
  }

  try {
    await insertAttachment(supabase, resolution.organizationId, null, {
      orderId: resolution.scopeType === "order" ? resolution.scopeId : undefined,
      repairTicketId: resolution.scopeType === "repair_ticket" ? resolution.scopeId : undefined,
      fileName: file.name,
      fileType: file.type,
      storagePath,
      visibility: "customer_visible",
    });
  } catch (err) {
    console.error("portal upload: attachment insert failed:", err);
    return NextResponse.json({ error: "Upload saved, but couldn't attach it. Contact PrintFam." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
