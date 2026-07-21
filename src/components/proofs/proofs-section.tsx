import { CreateProofDialog } from "./create-proof-dialog";
import { ProofCard } from "./proof-card";
import type { ProofView } from "@/server/domain/proofs/buildProofViews";

export function ProofsSection({
  proofs,
  organizationId,
  orderId,
  repairTicketId,
}: {
  proofs: ProofView[];
  organizationId: string;
  orderId?: string;
  repairTicketId?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Proofs</p>
        <CreateProofDialog orderId={orderId} repairTicketId={repairTicketId} />
      </div>
      {proofs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No proofs yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {proofs.map((proof) => (
            <ProofCard
              key={proof.id}
              proof={proof}
              organizationId={organizationId}
              orderId={orderId}
              repairTicketId={repairTicketId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
