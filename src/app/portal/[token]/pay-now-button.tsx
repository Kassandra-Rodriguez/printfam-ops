"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";

export function PayNowButton({ token, amount }: { token: string; amount: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function payNow() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/portal/${token}/checkout`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
      setError(data.error ?? "Could not start checkout. Try again.");
      setLoading(false);
      return;
    }
    window.location.href = data.url;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button className="w-full" disabled={loading} onClick={payNow}>
        {loading ? "Redirecting…" : `Pay ${formatCurrency(amount)} now`}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
