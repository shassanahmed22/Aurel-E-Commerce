import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

// Mirrors the `order_status` enum in supabase/01_schema.sql.
const STATUS_STYLES: Record<string, string> = {
  pending: "bg-sand/40 text-ink",
  confirmed: "bg-water/20 text-water",
  processing: "bg-water/20 text-water",
  shipped: "bg-clay/20 text-clay",
  delivered: "bg-moss/15 text-moss",
  cancelled: "bg-burgundy/10 text-burgundy",
  refunded: "bg-burgundy/10 text-burgundy",
};

type Order = {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  total_cents: number;
};

type Profile = {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  created_at?: string | null;
};

function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email || "";
  const parts = source.split(/[\s@.]+/).filter(Boolean);

  if (parts.length === 0) return "?";

  return (
    (parts[0]?.[0] ?? "") +
    (parts[1]?.[0] ?? "")
  ).toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function AccountPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/account");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: ordersData } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  /*
   * The Supabase generated database type currently does not know
   * the shape of the `orders` table and infers the result as `never`.
   *
   * Cast the query result once at the boundary instead of fighting
   * TypeScript throughout the component.
   */
  const profile = profileData as Profile | null;

  const orders = (ordersData ?? []) as unknown as Order[];

  const orderCount = orders.length;

  const lifetimeSpendCents = orders
    .filter(
      (order) =>
        order.status !== "cancelled" &&
        order.status !== "refunded"
    )
    .reduce(
      (sum, order) => sum + order.total_cents,
      0
    );

  return (
    <div className="container-aurel py-16 max-w-3xl">

      {/* PROFILE CARD */}
      <section className="border border-sand/70 bg-ivory">

        <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-8 border-b border-sand/70">

          <div
            aria-hidden="true"
            className="flex-shrink-0 w-16 h-16 rounded-full bg-ink text-ivory flex items-center justify-center font-display text-2xl"
          >
            {initials(profile?.full_name, user.email)}
          </div>

          <div className="flex-1 min-w-0">
            <p className="eyebrow mb-1">
              Account
            </p>

            <h1 className="font-display text-3xl truncate">
              {profile?.full_name || "Welcome"}
            </h1>

            <p className="text-sage text-sm mt-1 truncate">
              {user.email}
            </p>
          </div>

          <SignOutButton />
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-sand/70">

          <div className="p-6">
            <dt className="eyebrow mb-1">
              Member Since
            </dt>

            <dd className="font-display text-lg">
              {profile?.created_at
                ? formatDate(profile.created_at)
                : "—"}
            </dd>
          </div>

          <div className="p-6">
            <dt className="eyebrow mb-1">
              Orders
            </dt>

            <dd className="font-display text-lg">
              {orderCount}
            </dd>
          </div>

          <div className="p-6 col-span-2 sm:col-span-1">
            <dt className="eyebrow mb-1">
              Lifetime Spend
            </dt>

            <dd className="font-display text-lg">
              ${(lifetimeSpendCents / 100).toFixed(2)}
            </dd>
          </div>

        </dl>

        {profile?.phone && (
          <div className="px-8 pb-6 -mt-2 text-sm text-sage">
            <span className="text-ink">
              Phone:
            </span>{" "}
            {profile.phone}
          </div>
        )}

      </section>

      {/* ORDER HISTORY */}
      <section className="mt-14">

        <div className="flex items-baseline justify-between mb-6">

          <h2 className="font-display text-2xl">
            Order History
          </h2>

          {orderCount > 0 && (
            <p className="text-sm text-sage">
              {orderCount} order
              {orderCount === 1 ? "" : "s"}
            </p>
          )}

        </div>

        {orders.length === 0 ? (

          <div className="border border-dashed border-sand/70 py-16 px-6 text-center">

            <p className="font-display text-xl mb-2">
              No orders yet
            </p>

            <p className="text-sage text-sm mb-6">
              Your fragrance journey starts with a first bottle.
            </p>

            <Link
              href="/collections"
              className="btn-primary"
            >
              Explore Collections
            </Link>

          </div>

        ) : (

          <ul className="space-y-4">

            {orders.map((order) => (

              <li
                key={order.id}
                className="border border-sand/70 p-6 hover:border-clay/60 transition-colors duration-300"
              >

                <div className="flex flex-wrap items-center justify-between gap-3 mb-1">

                  <p className="font-display text-lg">
                    {order.order_number}
                  </p>

                  <span
                    className={`text-xs uppercase tracking-wide px-3 py-1 rounded-full capitalize ${STATUS_STYLES[order.status] ??
                      "bg-sand/40 text-ink"
                      }`}
                  >
                    {order.status}
                  </span>

                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-sage">

                  <span>
                    {formatDate(order.created_at)}
                  </span>

                  <span className="font-body text-ink text-base">
                    ${(order.total_cents / 100).toFixed(2)}
                  </span>

                </div>

              </li>

            ))}

          </ul>

        )}

      </section>

    </div>
  );
}