import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

// Orders are only ever marked paid here, after Stripe's signed webhook
// confirms it server-side — the frontend reporting "success" is never
// sufficient on its own.
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // Idempotency: stripe_event_id is unique, so a duplicate delivery
  // fails this insert and we exit early without double-processing.
  const { error: dedupeError } = await supabase
    .from("payment_events")
    .insert({ stripe_event_id: event.id, event_type: event.type, payload: event as any });
  if (dedupeError) {
    return NextResponse.json({ received: true, deduped: true });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const orderId = intent.metadata.order_id;
    if (!orderId) return NextResponse.json({ received: true });

    const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
    if (!order || order.status !== "pending") return NextResponse.json({ received: true });

    const { data: orderItems } = await supabase.from("order_items").select("*").eq("order_id", orderId);

    for (const item of orderItems ?? []) {
      if (item.variant_id) {
        await supabase.rpc("commit_sale", {
          p_variant_id: item.variant_id,
          p_quantity: item.quantity,
          p_order_id: orderId,
        });
      }
    }

    await supabase.from("orders").update({ status: "confirmed" }).eq("id", orderId);
    await supabase.from("payments").insert({
      order_id: orderId,
      stripe_payment_intent_id: intent.id,
      status: intent.status,
      amount_cents: intent.amount,
      currency: intent.currency,
    });

    if (order.coupon_id) {
      await supabase.from("coupon_redemptions").insert({
        coupon_id: order.coupon_id,
        order_id: orderId,
        user_id: order.user_id,
      });
      await supabase.rpc("increment_coupon_redemption", { p_coupon_id: order.coupon_id });
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const orderId = intent.metadata.order_id;
    if (!orderId) return NextResponse.json({ received: true });

    const { data: orderItems } = await supabase.from("order_items").select("*").eq("order_id", orderId);
    for (const item of orderItems ?? []) {
      if (item.variant_id) {
        await supabase.rpc("release_stock", { p_variant_id: item.variant_id, p_quantity: item.quantity });
      }
    }
    await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
  }

  return NextResponse.json({ received: true });
}
