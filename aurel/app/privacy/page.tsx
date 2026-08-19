import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="container-aurel py-20 max-w-2xl mx-auto prose prose-neutral">
      <h1 className="font-display text-4xl mb-8">Privacy Policy</h1>
      <p className="text-moss leading-relaxed mb-4">
        This is placeholder policy content for a portfolio project. Replace with real legal
        copy — covering what data AUREL collects (account details, order history, addresses),
        how it&apos;s used, third parties involved (Stripe for payment processing, Supabase for
        storage), and how customers can request access to or deletion of their data — before
        any real launch.
      </p>
    </div>
  );
}
