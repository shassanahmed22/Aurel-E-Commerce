"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      setError(error.message);
      setStatus("error");
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="container-aurel py-24 max-w-sm text-center">
        <h1 className="text-3xl mb-4">Check your email</h1>
        <p className="text-moss">We sent a verification link to {email}.</p>
      </div>
    );
  }

  return (
    <div className="container-aurel py-24 max-w-sm">
      <h1 className="text-3xl mb-8">Create Account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm">Full name
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)}
            className="w-full border border-sand px-3 py-2 mt-1" />
        </label>
        <label className="block text-sm">Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-sand px-3 py-2 mt-1" />
        </label>
        <label className="block text-sm">Password
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-sand px-3 py-2 mt-1" />
        </label>
        {error && <p className="text-burgundy text-sm" role="alert">{error}</p>}
        <button type="submit" disabled={status === "loading"} className="btn-primary w-full">
          {status === "loading" ? "Creating…" : "Create Account"}
        </button>
      </form>
      <p className="text-sm mt-6">
        Already have an account? <Link href="/login" className="underline">Sign in</Link>
      </p>
    </div>
  );
}
