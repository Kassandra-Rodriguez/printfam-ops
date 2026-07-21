"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import type { PortalQuoteView } from "@/server/data/portalViews";

export function QuotePortalView({ token, quote }: { token: string; quote: PortalQuoteView }) {
  const [isPending, startTransition] = useTransition();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function respond(response: "approved" | "declined") {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/portal/${token}/quote-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response, declineReason: response === "declined" ? reason : undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong. Try again.");
        return;
      }
      router.refresh();
    });
  }

  const canRespond = !quote.approved_at && !quote.declined_at;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your quote</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <table className="w-full">
            <tbody>
              {quote.quote_items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-1.5">{item.description}</td>
                  <td className="py-1.5 text-right text-muted-foreground">
                    {item.quantity} × {formatCurrency(item.unit_price)}
                  </td>
                  <td className="py-1.5 pl-4 text-right font-medium">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-col gap-1 border-t pt-3">
            <Row label="Subtotal" value={formatCurrency(quote.subtotal)} />
            {quote.discount_total > 0 ? <Row label="Discount" value={`-${formatCurrency(quote.discount_total)}`} /> : null}
            {quote.tax_total > 0 ? <Row label="Tax" value={formatCurrency(quote.tax_total)} /> : null}
            {quote.shipping_cost > 0 ? <Row label="Shipping" value={formatCurrency(quote.shipping_cost)} /> : null}
            <Row label="Total" value={formatCurrency(quote.total)} bold />
            {quote.deposit_amount > 0 ? <Row label="Deposit required" value={formatCurrency(quote.deposit_amount)} /> : null}
          </div>
          {quote.expires_at ? (
            <p className="text-xs text-muted-foreground">Expires {formatDate(quote.expires_at)}</p>
          ) : null}
          {quote.terms ? (
            <div className="border-t pt-3">
              <p className="text-muted-foreground">Terms</p>
              <p className="mt-0.5 whitespace-pre-wrap">{quote.terms}</p>
            </div>
          ) : null}
          {quote.customer_notes ? (
            <div className="border-t pt-3">
              <p className="whitespace-pre-wrap">{quote.customer_notes}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {quote.approved_at ? (
        <p className="text-center text-sm text-emerald-700 dark:text-emerald-400">
          You approved this quote {formatDate(quote.approved_at)}.
        </p>
      ) : quote.declined_at ? (
        <p className="text-center text-sm text-muted-foreground">You declined this quote {formatDate(quote.declined_at)}.</p>
      ) : canRespond ? (
        declining ? (
          <div className="flex flex-col gap-2">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Let us know why (optional)"
              rows={2}
            />
            <div className="flex gap-2">
              <Button disabled={isPending} onClick={() => respond("declined")} variant="destructive">
                Confirm decline
              </Button>
              <Button variant="ghost" onClick={() => setDeclining(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button disabled={isPending} onClick={() => respond("approved")} className="flex-1">
              Approve
            </Button>
            <Button disabled={isPending} variant="outline" onClick={() => setDeclining(true)} className="flex-1">
              Decline
            </Button>
          </div>
        )
      ) : null}
      {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
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
