"use client";

import { useState } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe/client";
import { useCartStore } from "@/lib/store/cart";

type Step = "contact" | "shipping" | "payment" | "review";

export default function CheckoutPage() {
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotalCents());
  const [step, setStep] = useState<Step>("contact");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState({
    fullName: "", line1: "", line2: "", city: "", region: "", postalCode: "", country: "US", phone: "",
  });
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function createOrderAndIntent() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          shippingAddress: address,
          items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      setClientSecret(data.clientSecret);
      setOrderNumber(data.orderNumber);
      setStep("payment");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Payment success clears the cart (see `clearCart()` in PaymentStep) before
  // moving to the "review" step, so `items` is empty by the time this render
  // happens. This check ran before the step switch below, so it caught that
  // post-payment render and showed "Your bag is empty" instead of the order
  // confirmation. The review step must be allowed through even with an empty cart.
  if (items.length === 0 && step !== "review") {
    return <div className="container-aurel py-24 text-center">Your bag is empty.</div>;
  }

  return (
    <div className="container-aurel py-16 grid md:grid-cols-3 gap-12">
      <div className="md:col-span-2">
        <ol className="flex gap-4 mb-10 text-sm" aria-label="Checkout steps">
          {(["contact", "shipping", "payment", "review"] as Step[]).map((s) => (
            <li key={s} className={`capitalize ${step === s ? "text-ink font-medium" : "text-sage"}`}>{s}</li>
          ))}
        </ol>

        {step === "contact" && (
          <form
            onSubmit={(e) => { e.preventDefault(); setStep("shipping"); }}
            className="space-y-4 max-w-md"
          >
            <label className="block text-sm">Email
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-sand px-3 py-2 mt-1" />
            </label>
            <button type="submit" className="btn-primary">Continue to Shipping</button>
          </form>
        )}

        {step === "shipping" && (
          <form
            onSubmit={(e) => { e.preventDefault(); createOrderAndIntent(); }}
            className="space-y-4 max-w-md"
          >
            {([
              ["fullName", "Full name"], ["line1", "Address"], ["line2", "Apt / suite (optional)"],
              ["city", "City"], ["region", "State / region"], ["postalCode", "Postal code"], ["phone", "Phone (optional)"],
            ] as const).map(([key, label]) => (
              <label key={key} className="block text-sm">{label}
                <input
                  required={!["line2", "phone", "region"].includes(key)}
                  value={(address as any)[key]}
                  onChange={(e) => setAddress((a) => ({ ...a, [key]: e.target.value }))}
                  className="w-full border border-sand px-3 py-2 mt-1"
                />
              </label>
            ))}
            {error && <p className="text-burgundy text-sm" role="alert">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Preparing payment…" : "Continue to Payment"}
            </button>
          </form>
        )}

        {step === "payment" && clientSecret && (
          <Elements stripe={getStripe()} options={{ clientSecret }}>
            <PaymentStep orderNumber={orderNumber!} onPaid={() => setStep("review")} />
          </Elements>
        )}

        {step === "review" && (
          <div className="text-center py-16">
            <h1 className="text-3xl mb-4">Thank you</h1>
            <p className="text-moss">Order {orderNumber} is confirmed. A receipt is on its way to {email}.</p>
          </div>
        )}
      </div>

      <aside className="border border-sand p-6 h-fit">
        <h2 className="eyebrow mb-4">Order Summary</h2>
        {items.map((i) => (
          <div key={i.variantId} className="flex justify-between text-sm mb-2">
            <span>{i.productName} × {i.quantity}</span>
            <span>${((i.priceCents * i.quantity) / 100).toFixed(2)}</span>
          </div>
        ))}
        <div className="border-t border-sand mt-4 pt-4 flex justify-between font-medium">
          <span>Subtotal</span>
          <span>${(subtotal / 100).toFixed(2)}</span>
        </div>
        <p className="text-xs text-sage mt-2">Final total (incl. shipping/tax) is confirmed on the payment step.</p>
      </aside>
    </div>
  );
}

function PaymentStep({ orderNumber, onPaid }: { orderNumber: string; onPaid: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const clearCart = useCartStore((s) => s.clear);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/checkout/success?order=${orderNumber}` },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed.");
      setSubmitting(false);
      return;
    }

    // The order is only truly confirmed once Stripe's webhook fires
    // server-side — this just moves the UI forward optimistically.
    clearCart();
    onPaid();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      <PaymentElement />
      {error && <p className="text-burgundy text-sm" role="alert">{error}</p>}
      <button type="submit" disabled={!stripe || submitting} className="btn-primary w-full">
        {submitting ? "Processing…" : "Pay Now"}
      </button>
    </form>
  );
}