"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { PortalRepairTicketView, PortalMessageView } from "@/server/data/portalViews";
import { PortalMessageBox } from "./message-box";
import { PortalFileUpload, type PortalFileRow } from "./file-upload";
import { PayNowButton } from "./pay-now-button";

export function RepairPortalView({
  token,
  ticket,
  messages,
  files,
}: {
  token: string;
  ticket: PortalRepairTicketView;
  messages: PortalMessageView[];
  files: PortalFileRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function approve() {
    startTransition(async () => {
      const res = await fetch(`/api/portal/${token}/repair-approval`, { method: "POST" });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {ticket.device_model} {ticket.status ? `— ${ticket.status.label}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p className="text-muted-foreground">{ticket.reported_issue}</p>

          {ticket.recommended_repair ? (
            <div className="border-t pt-3">
              <p className="text-muted-foreground">Recommended repair</p>
              <p className="mt-0.5 whitespace-pre-wrap">{ticket.recommended_repair}</p>
              {ticket.customer_approved_at ? (
                <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
                  You approved this {formatDateTime(ticket.customer_approved_at)}.
                </p>
              ) : (
                <Button size="sm" className="mt-2" disabled={isPending} onClick={approve}>
                  Approve repair
                </Button>
              )}
            </div>
          ) : null}

          <div className="border-t pt-3">
            <Row label="Balance" value={ticket.final_balance > 0 ? formatCurrency(ticket.final_balance) : "Paid in full"} bold />
          </div>
          {ticket.final_balance > 0 ? <PayNowButton token={token} amount={ticket.final_balance} /> : null}
          {ticket.warranty_period_days ? (
            <p className="text-xs text-muted-foreground">Warranty: {ticket.warranty_period_days} days</p>
          ) : null}
          {ticket.completed_summary ? (
            <div className="border-t pt-3">
              <p className="text-muted-foreground">Completion summary</p>
              <p className="mt-0.5 whitespace-pre-wrap">{ticket.completed_summary}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {ticket.payments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payments</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {ticket.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <span className="text-muted-foreground">{p.method.replace("_", " ")}</span>
                <span className="font-medium tabular-nums">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <PortalFileUpload token={token} files={files} />
      <PortalMessageBox token={token} messages={messages} />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={bold ? "font-medium" : "text-muted-foreground"}>{label}</span>
      <span className={bold ? "font-medium tabular-nums" : "tabular-nums"}>{value}</span>
    </div>
  );
}
