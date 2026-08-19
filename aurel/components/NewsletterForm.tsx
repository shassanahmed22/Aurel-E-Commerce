"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const supabase = createClient();
    const { error } = await supabase.from("newsletter_subscribers").insert({ email });
    setStatus(error ? "error" : "done");
  }

  if (status === "done") {
    return <p className="text-sm text-sand">You&apos;re on the list.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <label htmlFor="newsletter-email" className="sr-only">Email address</label>
      <input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="flex-1 bg-transparent border border-ivory/30 px-3 py-2 text-sm placeholder:text-sand/60"
      />
      <button type="submit" disabled={status === "loading"} className="px-4 py-2 border border-ivory/30 text-sm hover:bg-ivory hover:text-ink transition-colors">
        Join
      </button>
      {status === "error" && <p className="text-xs text-burgundy" role="alert">Something went wrong — try again.</p>}
    </form>
  );
}
