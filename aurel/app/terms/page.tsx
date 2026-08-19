import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="container-aurel py-20 max-w-2xl mx-auto prose prose-neutral">
      <h1 className="font-display text-4xl mb-8">Terms of Service</h1>
      <p className="text-moss leading-relaxed mb-4">
        Placeholder terms for a portfolio project. Replace with real terms covering order
        acceptance, pricing/availability changes, account responsibilities, acceptable use, and
        limitation of liability before any real launch.
      </p>
    </div>
  );
}
