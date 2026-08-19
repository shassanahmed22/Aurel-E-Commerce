import type { Metadata } from "next";

export const metadata: Metadata = { title: "Shipping" };

export default function ShippingPage() {
  return (
    <div className="container-aurel py-20 max-w-2xl mx-auto prose prose-neutral">
      <h1 className="font-display text-4xl mb-8">Shipping</h1>
      <ul className="text-moss leading-relaxed space-y-2 list-disc pl-5">
        <li>Standard shipping: 5–7 business days, $12 flat rate.</li>
        <li>Complimentary standard shipping on orders over $150.</li>
        <li>Orders ship from our fulfillment partner within 1–2 business days.</li>
        <li>Tracking is emailed once your order ships.</li>
      </ul>
      <p className="text-xs text-sage mt-6">
        Placeholder rates for a portfolio project — align with real carrier rates before launch.
      </p>
    </div>
  );
}
