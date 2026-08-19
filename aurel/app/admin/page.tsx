import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = createClient();

  const [{ count: orderCount }, { count: customerCount }, { count: productCount }, { data: lowStock }] =
    await Promise.all([
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "customer"),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("inventory").select("variant_id, on_hand, reserved").lt("on_hand", 10),
    ]);

  const { data: revenueRows } = await supabase.from("orders").select("total_cents").eq("status", "confirmed");
  const revenueCents = (revenueRows ?? []).reduce((sum, o) => sum + o.total_cents, 0);

  const cards = [
    { label: "Revenue", value: `$${(revenueCents / 100).toFixed(2)}` },
    { label: "Orders", value: orderCount ?? 0 },
    { label: "Customers", value: customerCount ?? 0 },
    { label: "Products", value: productCount ?? 0 },
    { label: "Low Stock", value: lowStock?.length ?? 0 },
  ];

  return (
    <div className="container-aurel py-12">
      <h1 className="text-3xl mb-2">AUREL LAB</h1>
      <p className="text-moss mb-10">Admin dashboard</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
        {cards.map((c) => (
          <div key={c.label} className="border border-sand p-4">
            <p className="eyebrow mb-1">{c.label}</p>
            <p className="font-display text-2xl">{c.value}</p>
          </div>
        ))}
      </div>

      <nav className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(
          [
            ["Products", "/admin/products"],
            ["Orders", "/admin/orders"],
          ] as const
        ).map(([label, href]) => (
          <Link key={href} href={href} className="border border-sand p-6 hover:border-ink transition-colors">
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
