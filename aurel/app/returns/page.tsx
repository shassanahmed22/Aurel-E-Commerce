import type { Metadata } from "next";

export const metadata: Metadata = { title: "Returns" };

export default function ReturnsPage() {
  return (
    <div className="container-aurel py-20 max-w-2xl mx-auto prose prose-neutral">
      <h1 className="font-display text-4xl mb-8">Returns</h1>
      <ul className="text-moss leading-relaxed space-y-2 list-disc pl-5">
        <li>30-day returns on unopened, unused fragrances in original packaging.</li>
        <li>Opened fragrances are final sale for hygiene reasons.</li>
        <li>Refunds are issued to the original payment method within 5–10 business days.</li>
        <li>Contact us to start a return before shipping anything back.</li>
      </ul>
    </div>
  );
}
