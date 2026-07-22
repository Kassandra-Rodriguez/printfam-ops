import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import type { PortalOrderView, PortalMessageView } from "@/server/data/portalViews";
import { PortalMessageBox } from "./message-box";
import { PortalFileUpload, type PortalFileRow } from "./file-upload";
import { PayNowButton } from "./pay-now-button";

const FULFILLMENT_LABELS: Record<string, string> = { pickup: "Pickup", shipping: "Shipping" };

export function OrderPortalView({
  token,
  order,
  messages,
  files,
}: {
  token: string;
  order: PortalOrderView;
  messages: PortalMessageView[];
  files: PortalFileRow[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {order.title ?? order.order_number} {order.status ? `— ${order.status.label}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <table className="w-full">
            <tbody>
              {order.order_items.map((item) => (
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
            <Row label="Total" value={formatCurrency(order.total)} bold />
            <Row
              label="Balance"
              value={order.balance_remaining > 0 ? formatCurrency(order.balance_remaining) : "Paid in full"}
            />
          </div>
          {order.promised_date ? <p className="text-xs text-muted-foreground">Due {formatDate(order.promised_date)}</p> : null}
          {order.balance_remaining > 0 ? <PayNowButton token={token} amount={order.balance_remaining} /> : null}
        </CardContent>
      </Card>

      {order.fulfillment_method ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {FULFILLMENT_LABELS[order.fulfillment_method] ?? order.fulfillment_method}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {order.tracking_number ? <Row label="Tracking" value={order.tracking_number} /> : null}
            {order.shipping_address ? (
              <p className="text-muted-foreground">
                {order.shipping_address.line1}
                {order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ""}
                <br />
                {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {order.payments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payments</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {order.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {formatDate(p.paid_at)} · {p.method.replace("_", " ")}
                </span>
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
