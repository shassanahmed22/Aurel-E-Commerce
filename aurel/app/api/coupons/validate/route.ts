import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({ code: z.string().min(1).max(50), subtotalCents: z.number().int().min(0) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ valid: false, error: "Invalid request." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: coupon } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", parsed.data.code)
    .eq("is_active", true)
    .maybeSingle();

  if (!coupon) {
    return NextResponse.json({ valid: false, error: "Coupon not found." });
  }

  const notExpired = !coupon.expires_at || new Date(coupon.expires_at) > new Date();
  const underLimit = !coupon.max_redemptions || coupon.redemption_count < coupon.max_redemptions;
  const meetsMinimum = parsed.data.subtotalCents >= coupon.min_order_cents;

  if (!notExpired || !underLimit || !meetsMinimum) {
    return NextResponse.json({ valid: false, error: "Coupon is not applicable to this order." });
  }

  const discountCents =
    coupon.discount_type === "percentage"
      ? Math.round((parsed.data.subtotalCents * coupon.discount_value) / 100)
      : coupon.discount_value;

  // This is a preview only — the checkout route recomputes and applies
  // the discount server-side again at order creation, so nothing here
  // is trusted directly for the final charge.
  return NextResponse.json({ valid: true, discountCents: Math.min(discountCents, parsed.data.subtotalCents) });
}
