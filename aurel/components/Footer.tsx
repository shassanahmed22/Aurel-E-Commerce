import Link from "next/link";
import NewsletterForm from "@/components/NewsletterForm";

export default function Footer() {
  return (
    <footer className="bg-ink text-ivory mt-24">
      <div className="container-aurel py-16 grid gap-12 md:grid-cols-4">
        <div>
          <p className="font-display text-xl tracking-widest2 uppercase mb-3">AUREL</p>
          <p className="text-sm text-sand">Fragrance, composed as a collection of worlds.</p>
        </div>
        <div>
          <p className="eyebrow text-sand mb-4">Shop</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/collections">Collections</Link></li>
            <li><Link href="/shop">All Fragrances</Link></li>
            <li><Link href="/find-your-aurel">Find Your AUREL</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow text-sand mb-4">AUREL</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about">Philosophy</Link></li>
            <li><Link href="/journal">Journal</Link></li>
            <li><Link href="/shipping">Shipping</Link></li>
            <li><Link href="/returns">Returns</Link></li>
            <li><Link href="/privacy">Privacy</Link></li>
            <li><Link href="/terms">Terms</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow text-sand mb-4">Stay in the world</p>
          <NewsletterForm />
        </div>
      </div>
      <div className="border-t border-ivory/10 py-6 text-center text-xs text-sand">
        © {new Date().getFullYear()} AUREL. All rights reserved.
      </div>
    </footer>
  );
}
