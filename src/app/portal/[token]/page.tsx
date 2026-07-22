import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { validatePortalToken } from "@/server/domain/portal/validatePortalToken";
import {
  getQuoteForPortal,
  getOrderForPortal,
  getRepairTicketForPortal,
  getMessagesForPortal,
  getCustomerVisibleAttachments,
} from "@/server/data/portalViews";
import { getProof } from "@/server/data/proofs";
import { getAttachmentSignedUrl } from "@/server/data/attachments";
import { buildProofViews } from "@/server/domain/proofs/buildProofViews";
import { markQuoteViewed } from "@/server/domain/quotes/markQuoteViewed";
import { QuotePortalView } from "./quote-view";
import { ProofPortalView } from "./proof-view";
import { OrderPortalView } from "./order-view";
import { RepairPortalView } from "./repair-view";
import type { PortalFileRow } from "./file-upload";

const EXPIRED_MESSAGE: Record<string, string> = {
  not_found: "This link isn't valid. Contact the business that sent it to you for a new one.",
  expired: "This link has expired. Contact the business that sent it to you for a new one.",
  revoked: "This link is no longer active. Contact the business that sent it to you for a new one.",
};

export default async function PortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { token } = await params;
  const { payment } = await searchParams;
  const resolution = await validatePortalToken(token);

  if (!resolution.ok) {
    return <PortalShell>{EXPIRED_MESSAGE[resolution.reason]}</PortalShell>;
  }

  const supabase = createServiceRoleSupabaseClient();
  const organizationName = await getOrganizationName(supabase, resolution.organizationId);

  if (resolution.scopeType === "quote") {
    const quote = await getQuoteForPortal(supabase, resolution.organizationId, resolution.scopeId);
    if (!quote) {
      return <PortalShell>{EXPIRED_MESSAGE.not_found}</PortalShell>;
    }
    await markQuoteViewed(supabase, resolution.organizationId, quote.id);
    return (
      <PortalShell organizationName={organizationName}>
        <QuotePortalView token={token} quote={quote} />
      </PortalShell>
    );
  }

  if (resolution.scopeType === "proof") {
    const proof = await getProof(supabase, resolution.scopeId);
    // Defense in depth: a token is only ever issued for a customer_visible
    // proof (sendProof.ts), but staff could flip visibility back after the
    // fact — re-check here so an already-sent link can't keep leaking an
    // internal only proof (docs/security.md #5).
    if (!proof || proof.organization_id !== resolution.organizationId || proof.visibility !== "customer_visible") {
      return <PortalShell>{EXPIRED_MESSAGE.not_found}</PortalShell>;
    }
    const [view] = await buildProofViews(supabase, [proof]);
    // Only versions staff actually sent are shown — an in progress draft
    // version being prepared for the next revision must not leak early.
    const sentView = { ...view, versions: view.versions.filter((v) => v.sentAt !== null) };
    return (
      <PortalShell organizationName={organizationName}>
        <ProofPortalView token={token} proof={sentView} />
      </PortalShell>
    );
  }

  if (resolution.scopeType === "order") {
    const order = await getOrderForPortal(supabase, resolution.organizationId, resolution.scopeId);
    if (!order) {
      return <PortalShell>{EXPIRED_MESSAGE.not_found}</PortalShell>;
    }
    const [messages, files] = await Promise.all([
      getMessagesForPortal(supabase, resolution.organizationId, { orderId: order.id }),
      resolveFiles(supabase, resolution.organizationId, { orderId: order.id }),
    ]);
    return (
      <PortalShell organizationName={organizationName} payment={payment}>
        <OrderPortalView token={token} order={order} messages={messages} files={files} />
      </PortalShell>
    );
  }

  if (resolution.scopeType === "repair_ticket") {
    const ticket = await getRepairTicketForPortal(supabase, resolution.organizationId, resolution.scopeId);
    if (!ticket) {
      return <PortalShell>{EXPIRED_MESSAGE.not_found}</PortalShell>;
    }
    const [messages, files] = await Promise.all([
      getMessagesForPortal(supabase, resolution.organizationId, { repairTicketId: ticket.id }),
      resolveFiles(supabase, resolution.organizationId, { repairTicketId: ticket.id }),
    ]);
    return (
      <PortalShell organizationName={organizationName} payment={payment}>
        <RepairPortalView token={token} ticket={ticket} messages={messages} files={files} />
      </PortalShell>
    );
  }

  return <PortalShell>This link isn&apos;t available yet. Contact the business that sent it to you.</PortalShell>;
}

async function getOrganizationName(
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  organizationId: string,
): Promise<string> {
  const { data } = await supabase.from("organizations").select("name").eq("id", organizationId).maybeSingle();
  return data?.name ?? "";
}

async function resolveFiles(
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  organizationId: string,
  scope: { orderId?: string; repairTicketId?: string },
): Promise<PortalFileRow[]> {
  const attachments = await getCustomerVisibleAttachments(supabase, organizationId, scope);
  return Promise.all(
    attachments.map(async (a) => ({
      id: a.id,
      file_name: a.file_name,
      file_type: a.file_type,
      signedUrl: await getAttachmentSignedUrl(supabase, a.storage_path),
    })),
  );
}

function PortalShell({
  organizationName,
  payment,
  children,
}: {
  organizationName?: string;
  payment?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
      {organizationName ? (
        <p className="mb-6 text-center text-sm font-medium text-muted-foreground">{organizationName}</p>
      ) : null}
      {payment === "success" ? (
        <div className="mb-4 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-center text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Payment received — thank you! It may take a moment to show below.
        </div>
      ) : payment === "cancelled" ? (
        <div className="mb-4 rounded-md border p-3 text-center text-sm text-muted-foreground">
          Payment cancelled — no charge was made.
        </div>
      ) : null}
      {typeof children === "string" ? (
        <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">{children}</div>
      ) : (
        children
      )}
    </div>
  );
}
