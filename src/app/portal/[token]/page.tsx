import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { validatePortalToken } from "@/server/domain/portal/validatePortalToken";
import { getQuoteForPortal } from "@/server/data/portalViews";
import { getProof } from "@/server/data/proofs";
import { buildProofViews } from "@/server/domain/proofs/buildProofViews";
import { markQuoteViewed } from "@/server/domain/quotes/markQuoteViewed";
import { QuotePortalView } from "./quote-view";
import { ProofPortalView } from "./proof-view";

const EXPIRED_MESSAGE: Record<string, string> = {
  not_found: "This link isn't valid. Contact PrintFam for a new one.",
  expired: "This link has expired. Contact PrintFam for a new one.",
  revoked: "This link is no longer active. Contact PrintFam for a new one.",
};

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resolution = await validatePortalToken(token);

  if (!resolution.ok) {
    return <PortalShell>{EXPIRED_MESSAGE[resolution.reason]}</PortalShell>;
  }

  const supabase = createServiceRoleSupabaseClient();

  if (resolution.scopeType === "quote") {
    const quote = await getQuoteForPortal(supabase, resolution.organizationId, resolution.scopeId);
    if (!quote) {
      return <PortalShell>{EXPIRED_MESSAGE.not_found}</PortalShell>;
    }
    await markQuoteViewed(supabase, resolution.organizationId, quote.id);
    return (
      <PortalShell>
        <QuotePortalView token={token} quote={quote} />
      </PortalShell>
    );
  }

  if (resolution.scopeType === "proof") {
    const proof = await getProof(supabase, resolution.scopeId);
    // Defense in depth: a token is only ever issued for a customer_visible
    // proof (sendProof.ts), but staff could flip visibility back after the
    // fact — re-check here so an already-sent link can't keep leaking an
    // internal-only proof (docs/security.md #5).
    if (!proof || proof.organization_id !== resolution.organizationId || proof.visibility !== "customer_visible") {
      return <PortalShell>{EXPIRED_MESSAGE.not_found}</PortalShell>;
    }
    const [view] = await buildProofViews(supabase, [proof]);
    // Only versions staff actually sent are shown — an in-progress draft
    // version being prepared for the next revision must not leak early.
    const sentView = { ...view, versions: view.versions.filter((v) => v.sentAt !== null) };
    return (
      <PortalShell>
        <ProofPortalView token={token} proof={sentView} />
      </PortalShell>
    );
  }

  // order/repair_ticket scopes: the full unified portal view ships in Phase 7
  // (docs/build_phases.md) — Phase 6 only issues quote/proof tokens, so this
  // branch isn't reachable yet, but fails closed rather than crashing if it
  // ever is.
  return <PortalShell>This link isn&apos;t available yet. Contact PrintFam.</PortalShell>;
}

function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
      <p className="mb-6 text-center text-sm font-medium text-muted-foreground">PrintFam</p>
      {typeof children === "string" ? (
        <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">{children}</div>
      ) : (
        children
      )}
    </div>
  );
}
