import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Public, cookie-free Supabase client for anonymous catalog reads
 * (collections, products, journal posts).
 *
 * Unlike `lib/supabase/server.ts`'s `createClient()`, this never calls
 * `next/headers`' `cookies()`. Touching `cookies()` inside a Server
 * Component opts the *entire route* into fully dynamic, uncached
 * rendering — which is correct for user-specific data (account,
 * wishlist, admin, checkout) but was previously being applied to
 * every page in the app, including public catalog pages that rarely
 * change. That forced a fresh round trip to Supabase on every single
 * request for pages like `/`, `/shop`, `/collection/[slug]`, and
 * `/product/[slug]`.
 *
 * This client also injects a custom `fetch` so every request opts
 * into Next.js's Data Cache with a revalidation window and a shared
 * tag. That means:
 *   - Repeat requests for the same data are served from cache instead
 *     of hitting Supabase, even on routes that must stay dynamic for
 *     other reasons (e.g. `/shop?page=2`).
 *   - `revalidateTag("catalog")` (see `/api/admin/revalidate`) can
 *     purge everything on demand the moment an admin publishes or
 *     edits a product, so the cache window never shows stale content
 *     for longer than necessary.
 */
const CATALOG_REVALIDATE_SECONDS = 300; // 5 minutes — catalog content changes infrequently.

export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            next: { revalidate: CATALOG_REVALIDATE_SECONDS, tags: ["catalog"] },
          }),
      },
    }
  );
}
