"use client";

import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/lib/store/cart";
import { getPublicImageUrl } from "@/lib/utils/image";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  const subtotal = useCartStore((s) => s.subtotalCents());

  if (items.length === 0) {
    return (
      <div className="container-aurel py-24 text-center">
        <h1 className="text-3xl mb-4">Your bag is empty</h1>
        <Link href="/shop" className="btn-primary inline-flex">Shop Fragrances</Link>
      </div>
    );
  }

  return (
    <div className="container-aurel py-16 grid md:grid-cols-3 gap-12">
      <div className="md:col-span-2 space-y-6">
        <h1 className="text-3xl mb-6">Your Bag</h1>
        {items.map((item) => {
          const imageUrl = getPublicImageUrl(item.imagePath);
          return (
          <div key={item.variantId} className="flex gap-4 border-b border-sand pb-6">
            <div className="relative w-24 h-28 bg-sand/30 shrink-0 overflow-hidden">
              {imageUrl && (
                <Image src={imageUrl} alt={item.productName} fill sizes="96px" className="object-cover" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-display text-lg">{item.productName}</p>
              <p className="text-sm text-sage">{item.volumeMl} ml</p>
              <div className="flex items-center gap-3 mt-2">
                <label htmlFor={`qty-${item.variantId}`} className="text-sm">Qty</label>
                <input
                  id={`qty-${item.variantId}`}
                  type="number"
                  min={1}
                  max={10}
                  value={item.quantity}
                  onChange={(e) => setQuantity(item.variantId, parseInt(e.target.value, 10) || 1)}
                  className="w-16 border border-sand px-2 py-1"
                />
                <button onClick={() => remove(item.variantId)} className="text-sm underline">Remove</button>
              </div>
            </div>
            <p className="font-display">${((item.priceCents * item.quantity) / 100).toFixed(2)}</p>
          </div>
          );
        })}
      </div>

      <aside className="border border-sand p-6 h-fit">
        <div className="flex justify-between mb-4">
          <span>Subtotal</span>
          <span>${(subtotal / 100).toFixed(2)}</span>
        </div>
        <p className="text-xs text-sage mb-6">Shipping and tax are calculated at checkout.</p>
        <Link href="/checkout" className="btn-primary w-full">Checkout</Link>
      </aside>
    </div>
  );
}
