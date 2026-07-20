import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogCommunicationDialog } from "@/components/communications/log-communication-dialog";
import { requireOrgContext } from "@/server/authz/session";
import { getCustomer } from "@/server/data/customers";
import { listOrdersForCustomer } from "@/server/data/orders";
import { listRepairTicketsForCustomer } from "@/server/data/repairs";
import { formatCurrency } from "@/lib/format";
import { OrdersTable } from "../../orders/orders-table";
import { RepairsTable } from "../../repairs/repairs-table";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireOrgContext();
  const customer = await getCustomer(ctx.supabase, id);

  if (!customer) notFound();

  const [orders, repairs] = await Promise.all([
    listOrdersForCustomer(ctx.supabase, ctx.activeMembership.organization_id, id),
    listRepairTicketsForCustomer(ctx.supabase, ctx.activeMembership.organization_id, id),
  ]);
  const identifiers = (customer.customer_identifiers ?? []) as { kind: string; value: string }[];
  const tags = (customer.customer_tags ?? []) as { tag: string }[];

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold">{customer.display_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Customer since {new Date(customer.created_at as string).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {customer.outstanding_balance > 0 ? (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Outstanding balance</p>
              <p className="text-base font-semibold text-amber-700 dark:text-amber-400">
                {formatCurrency(customer.outstanding_balance)}
              </p>
            </div>
          ) : null}
          <Button asChild size="sm" variant="outline">
            <Link href={`/requests/new?customerId=${customer.id}`}>New request</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/repairs/new?customerId=${customer.id}`}>New repair</Link>
          </Button>
          <LogCommunicationDialog customerId={customer.id} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Contact</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Row label="Phone" value={customer.phone} />
            <Row label="Email" value={customer.email} />
            {identifiers
              .filter((i) => i.kind === "instagram" || i.kind === "tiktok")
              .map((i) => (
                <Row key={i.kind} label={i.kind === "instagram" ? "Instagram" : "TikTok"} value={i.value} />
              ))}
            <Row
              label="Preferred contact"
              value={customer.preferred_contact_method}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Lifetime value</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Row label="Total spent" value={formatCurrency(customer.total_spent)} />
            <Row
              label="Outstanding"
              value={
                customer.outstanding_balance > 0
                  ? formatCurrency(customer.outstanding_balance)
                  : "Nothing owed"
              }
            />
          </CardContent>
        </Card>
      </div>

      {tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <Badge key={t.tag} variant="secondary">
              {t.tag}
            </Badge>
          ))}
        </div>
      ) : null}

      {customer.notes ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{customer.notes}</CardContent>
        </Card>
      ) : null}

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-medium">Orders</h2>
        <OrdersTable orders={orders} />
      </div>

      {repairs.length > 0 ? (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-medium">Repairs</h2>
          <RepairsTable repairs={repairs} />
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value || "—"}</span>
    </div>
  );
}
