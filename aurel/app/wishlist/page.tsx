import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicImageUrl } from "@/lib/utils/image";
import ProductCard from "@/components/ProductCard";

export default async function WishlistPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/wishlist");

  const { data: wishlist } = await supabase.from("wishlists").select("id").eq("user_id", user.id).maybeSingle();
  const { data: items } = wishlist
    ? await supabase
        .from("wishlist_items")
        .select("products(slug, name, price_cents, product_images(storage_path, alt_text, sort_order))")
        .eq("wishlist_id", wishlist.id)
        .order("sort_order", { foreignTable: "products.product_images" })
    : { data: [] };

  return (
    <div className="container-aurel py-16">
      <h1 className="text-3xl mb-10">Wishlist</h1>
      {!items || items.length === 0 ? (
        <p className="text-moss">Your wishlist is empty.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {items.map((item: any, i: number) => (
            <ProductCard
              key={i}
              slug={item.products.slug}
              name={item.products.name}
              priceCents={item.products.price_cents}
              imageUrl={getPublicImageUrl(item.products.product_images?.[0]?.storage_path)}
              imageAlt={item.products.product_images?.[0]?.alt_text}
            />
          ))}
        </div>
      )}
    </div>
  );
}
