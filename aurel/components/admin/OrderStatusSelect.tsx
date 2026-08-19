"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;

type OrderStatus = (typeof STATUSES)[number];

export default function OrderStatusSelect({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const [value, setValue] = useState(status);
  const [saving, setSaving] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as OrderStatus;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("orders").update({ status: next }).eq("id", orderId);
    if (!error) setValue(next);
    setSaving(false);
  }

  return (
    <select value={value} onChange={handleChange} disabled={saving} className="border border-sand px-2 py-1 text-xs capitalize">
      {STATUSES.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
