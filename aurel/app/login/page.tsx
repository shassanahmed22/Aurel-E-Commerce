"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push(params.get("redirect") ?? "/account");
    router.refresh();
  }

  return (
    <div className="container-aurel py-24 max-w-sm">
      <h1 className="text-3xl mb-8">Sign In</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm">Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-sand px-3 py-2 mt-1" />
        </label>
        <label className="block text-sm">Password
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-sand px-3 py-2 mt-1" />
        </label>
        {error && <p className="text-burgundy text-sm" role="alert">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
      <p className="text-sm mt-6">
        New here? <Link href="/register" className="underline">Create an account</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

