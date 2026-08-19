import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/server";
import { checkoutRequestSchema } from "@/lib/validation";

const FLAT_SHIPPING_CENTS = 1200;
const FREE_SHIPPING_THRESHOLD_CENTS = 15000;
const TAX_RATE = 0.0;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const parsed = checkoutRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { email, items, shippingAddress, couponCode } = parsed.data;

  // Authenticated user's Supabase session
  const authSupabase = createClient();

  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  // Service-role client for trusted server-side operations
  const supabase = createServiceRoleClient();

  const reservedVariantIds: {
    variantId: string;
    quantity: number;
  }[] = [];

  async function rollbackReservations() {
    for (const r of reservedVariantIds) {
      await supabase.rpc("release_stock", {
        p_variant_id: r.variantId,
        p_quantity: r.quantity,
      });
    }
  }

  try {
    // 1. Look up authoritative prices
    const variantIds = items.map((i) => i.variantId);

    const { data: variants, error: variantError } = await supabase
      .from("product_variants")
      .select(
        "id, price_cents, volume_ml, sku, product_id, products(name, is_published)"
      )
      .in("id", variantIds);

    if (
      variantError ||
      !variants ||
      variants.length !== variantIds.length
    ) {
      return NextResponse.json(
        { error: "One or more items are unavailable." },
        { status: 400 }
      );
    }

    let subtotalCents = 0;

    const orderItemsPayload: any[] = [];

    for (const item of items) {
      const variant = variants.find(
        (v: any) => v.id === item.variantId
      );

      if (!variant || !(variant as any).products?.is_published) {
        return NextResponse.json(
          { error: "One or more items are unavailable." },
          { status: 400 }
        );
      }

      const lineTotal = variant.price_cents * item.quantity;

      subtotalCents += lineTotal;

      orderItemsPayload.push({
        variant_id: variant.id,
        product_name: (variant as any).products.name,
        variant_label: `${variant.volume_ml} ml`,
        sku: variant.sku,
        unit_price_cents: variant.price_cents,
        quantity: item.quantity,
        line_total_cents: lineTotal,
      });
    }

    // 2. Reserve stock
    for (const item of items) {
      const { error: reserveError } = await supabase.rpc(
        "reserve_stock",
        {
          p_variant_id: item.variantId,
          p_quantity: item.quantity,
        }
      );

      if (reserveError) {
        await rollbackReservations();

        return NextResponse.json(
          { error: "Insufficient stock for one or more items." },
          { status: 409 }
        );
      }

      reservedVariantIds.push({
        variantId: item.variantId,
        quantity: item.quantity,
      });
    }

    // 3. Validate coupon
    let discountCents = 0;
    let couponId: string | null = null;

    if (couponCode) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode)
        .eq("is_active", true)
        .maybeSingle();

      if (coupon) {
        const notExpired =
          !coupon.expires_at ||
          new Date(coupon.expires_at) > new Date();

        const underLimit =
          !coupon.max_redemptions ||
          coupon.redemption_count < coupon.max_redemptions;

        const meetsMinimum =
          subtotalCents >= coupon.min_order_cents;

        if (notExpired && underLimit && meetsMinimum) {
          discountCents =
            coupon.discount_type === "percentage"
              ? Math.round(
                (subtotalCents * coupon.discount_value) / 100
              )
              : coupon.discount_value;

          discountCents = Math.min(
            discountCents,
            subtotalCents
          );

          couponId = coupon.id;
        }
      }
    }

    const shippingCents =
      subtotalCents - discountCents >=
        FREE_SHIPPING_THRESHOLD_CENTS
        ? 0
        : FLAT_SHIPPING_CENTS;

    const taxCents = Math.round(
      (subtotalCents - discountCents) * TAX_RATE
    );

    const totalCents =
      subtotalCents -
      discountCents +
      shippingCents +
      taxCents;

    // 4. Create order
    const { data: orderNumberRow } = await supabase.rpc(
      "generate_order_number"
    );

    const orderNumber =
      orderNumberRow ?? `AUREL-${Date.now()}`;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        // IMPORTANT:
        // Save the logged-in user's ID with the order.
        user_id: user?.id ?? null,

        order_number: orderNumber,
        email,
        status: "pending",
        shipping_address: shippingAddress,
        subtotal_cents: subtotalCents,
        discount_cents: discountCents,
        shipping_cents: shippingCents,
        tax_cents: taxCents,
        total_cents: totalCents,
        coupon_id: couponId,
      })
      .select()
      .single();

    if (orderError || !order) {
      await rollbackReservations();

      console.error("Order creation error:", orderError);

      return NextResponse.json(
        { error: "Could not create order." },
        { status: 500 }
      );
    }

    // 5. Create order items
    const { error: orderItemsError } = await supabase
      .from("order_items")
      .insert(
        orderItemsPayload.map((oi) => ({
          ...oi,
          order_id: order.id,
        }))
      );

    if (orderItemsError) {
      await rollbackReservations();

      console.error(
        "Order items creation error:",
        orderItemsError
      );

      return NextResponse.json(
        { error: "Could not create order items." },
        { status: 500 }
      );
    }

    // 6. Create Stripe PaymentIntent
    const paymentIntent =
      await stripe.paymentIntents.create({
        amount: totalCents,
        currency: "usd",
        receipt_email: email,
        metadata: {
          order_id: order.id,
          order_number: orderNumber,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

    // 7. Save Stripe PaymentIntent ID
    await supabase
      .from("orders")
      .update({
        stripe_payment_intent_id: paymentIntent.id,
      })
      .eq("id", order.id);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      orderNumber,
      totalCents,
    });
  } catch (err: any) {
    await rollbackReservations();

    console.error("Checkout error:", err);

    if (
      err?.type === "StripeAuthenticationError" ||
      err?.raw?.type === "invalid_request_error"
    ) {
      const hint =
        process.env.NODE_ENV !== "production"
          ? " Set a real STRIPE_SECRET_KEY (test mode) in .env.local — see .env.example."
          : "";

      return NextResponse.json(
        {
          error: `Payment provider is not configured.${hint}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Checkout failed." },
      { status: 500 }
    );
  }
}