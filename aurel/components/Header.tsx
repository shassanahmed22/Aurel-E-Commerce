"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useCartStore } from "@/lib/store/cart";

const NAV = [
  { href: "/collections", label: "Collections" },
  { href: "/shop", label: "Shop" },
  { href: "/find-your-aurel", label: "Find Your AUREL" },
  { href: "/journal", label: "Journal" },
  { href: "/about", label: "Philosophy" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const itemCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const mounted = useHydrationStatus();

  return (
    <header className="sticky top-0 z-40 bg-ivory/95 backdrop-blur border-b border-sand">
      {process.env.NODE_ENV !== "production" && !mounted && (
        <div className="bg-burgundy text-ivory text-xs text-center py-1" role="status">
          Loading interactive features… (if this never disappears, the page hasn&apos;t finished
          hydrating — see the README&apos;s dev-server troubleshooting section)
        </div>
      )}
      <div className="container-aurel flex items-center justify-between h-20">
        <Link href="/" className="font-display text-2xl tracking-widest2 uppercase">
          AUREL
        </Link>

        <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm tracking-wide hover:text-moss transition-colors">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <Link href="/wishlist" aria-label="Wishlist" className="hidden sm:inline text-sm hover:text-moss">
            Wishlist
          </Link>
          <Link href="/account" aria-label="Account" className="hidden sm:inline text-sm hover:text-moss">
            Account
          </Link>
          <Link href="/cart" aria-label={`Cart, ${itemCount} items`} className="text-sm hover:text-moss">
            Bag ({itemCount})
          </Link>
          <button
            className="md:hidden"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="block w-6 h-px bg-ink mb-1.5" />
            <span className="block w-6 h-px bg-ink" />
          </button>
        </div>
      </div>

      {open && (
        <nav className="md:hidden border-t border-sand" aria-label="Mobile">
          <ul className="container-aurel py-4 flex flex-col gap-4">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm" onClick={() => setOpen(false)}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

/**
 * Diagnostic only (dev mode, not shipped to production): flips to
 * `true` the moment this component's effect runs on the client, i.e.
 * the moment React has actually hydrated and event handlers are live.
 * If the banner above never disappears, every click on the page is
 * landing on inert server-rendered HTML — that's proof the problem is
 * the page not finishing hydration (slow/interrupted dev compiles,
 * a stalled dev server, etc.), not a bug in a specific button's code.
 */
function useHydrationStatus() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
