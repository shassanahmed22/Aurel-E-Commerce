import { createClient } from "@/lib/supabase/server";
import OrderStatusSelect from "@/components/admin/OrderStatusSelect";

export default async function AdminOrdersPage() {
  const supabase = createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, email, status, total_cents, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="container-aurel py-12">
      <h1 className="text-3xl mb-8">Orders</h1>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b border-sand">
            <th className="py-2">Order</th>
            <th className="py-2">Email</th>
            <th className="py-2">Total</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {(orders ?? []).map((o) => (
            <tr key={o.id} className="border-b border-sand/50">
              <td className="py-3">{o.order_number}</td>
              <td className="py-3">{o.email}</td>
              <td className="py-3">${(o.total_cents / 100).toFixed(2)}</td>
              <td className="py-3">
                <OrderStatusSelect orderId={o.id} status={o.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
