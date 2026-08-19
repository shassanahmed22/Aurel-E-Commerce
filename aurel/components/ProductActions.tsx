"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/cart";
import { createClient } from "@/lib/supabase/client";

type Variant = { id: string; volume_ml: number; price_cents: number; sku: string; is_default: boolean };

export default function ProductActions({
  productId,
  productSlug,
  productName,
  variants,
  imagePath,
}: {
  productId: string;
  productSlug: string;
  productName: string;
  variants: Variant[];
  imagePath?: string;
}) {
  const sorted = [...variants].sort((a, b) => a.volume_ml - b.volume_ml);
  const [variantId, setVariantId] = useState(sorted.find((v) => v.is_default)?.id ?? sorted[0]?.id);
  const [quantity, setQuantity] = useState(1);
  const [wishlistStatus, setWishlistStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [justAdded, setJustAdded] = useState(false);
  const router = useRouter();
  const add = useCartStore((s) => s.add);
  const selected = sorted.find((v) => v.id === variantId) ?? sorted[0];

  // Visible, unmissable confirmation that Add to Bag actually did
  // something — the cart update itself is instant (client-side
  // zustand state), but with nothing on screen changing near the
  // button, it was easy to click it and assume nothing happened,
  // especially with the header's cart count out of view while scrolled.
  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(false), 2000);
    return () => clearTimeout(t);
  }, [justAdded]);

  function handleAddToBag() {
    if (!selected) return;
    add(
      {
        variantId: selected.id,
        productSlug,
        productName,
        volumeMl: selected.volume_ml,
        priceCents: selected.price_cents,
        imagePath,
      },
      quantity
    );
    setJustAdded(true);
  }

  function handleBuyNow() {
    handleAddToBag();
    router.push("/checkout");
  }

  async function handleWishlist() {
    setWishlistStatus("saving");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/login?redirect=/product/${productSlug}`);
      return;
    }
    // Server enforces one wishlist per user via unique constraint;
    // upsert the wishlist row first, then the item.
    const { data: wishlist } = await supabase
      .from("wishlists")
      .upsert({ user_id: user.id }, { onConflict: "user_id" })
      .select()
      .single();
    if (!wishlist) return setWishlistStatus("error");

    const { error } = await supabase
      .from("wishlist_items")
      .upsert({ wishlist_id: wishlist.id, product_id: productId }, { onConflict: "wishlist_id,product_id" });
    setWishlistStatus(error ? "error" : "saved");
  }

  return (
    <div className="space-y-6">
      {sorted.length > 1 && (
        <div>
          <label htmlFor="volume" className="eyebrow block mb-2">Volume</label>
          <select
            id="volume"
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
            className="border border-ink px-4 py-2 bg-transparent"
          >
            {sorted.map((v) => (
              <option key={v.id} value={v.id}>
                {v.volume_ml} ml — ${(v.price_cents / 100).toFixed(2)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="quantity" className="eyebrow block mb-2">Quantity</label>
        <input
          id="quantity"
          type="number"
          min={1}
          max={10}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)))}
          className="w-20 border border-ink px-3 py-2 bg-transparent"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={handleAddToBag} className="btn-primary flex-1" aria-live="polite">
          {justAdded ? "Added ✓" : "Add to Bag"}
        </button>
        <button onClick={handleBuyNow} className="btn-secondary flex-1">Buy Now</button>
      </div>
      <button onClick={handleWishlist} className="text-sm underline underline-offset-4">
        {wishlistStatus === "saved" ? "Saved to wishlist" : "Add to wishlist"}
      </button>
    </div>
  );
}
