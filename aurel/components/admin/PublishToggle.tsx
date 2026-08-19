"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function PublishToggle({ productId, initialValue }: { productId: string; initialValue: boolean }) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);
    const supabase = createClient();
    const next = !value;
    const { error } = await supabase.from("products").update({ is_published: next }).eq("id", productId);
    if (!error) {
      setValue(next);
      // Storefront catalog pages are cached for a few minutes for
      // performance; bust that cache now so this change is visible
      // immediately instead of waiting out the revalidation window.
      fetch("/api/admin/revalidate", { method: "POST" }).catch(() => {
        // Best-effort — the change is already saved and will still
        // appear once the cache naturally revalidates.
      });
    }
    setSaving(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      aria-pressed={value}
      className={`px-3 py-1 text-xs border ${value ? "bg-moss text-ivory border-moss" : "border-sand"}`}
    >
      {value ? "Published" : "Draft"}
    </button>
  );
}
