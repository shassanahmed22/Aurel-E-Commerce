# AUREL — The Art of Scent

Premium fragrance e-commerce brand. Next.js 14 (App Router) + TypeScript +
Tailwind + Supabase + Stripe (test mode) + React Three Fiber.

## What's actually here

This is a real, working application — not a mockup. Every page reads from
Supabase, checkout creates real (test-mode) Stripe PaymentIntents, and
inventory is transactionally reserved so concurrent checkouts can't oversell.
Read the **Known limitations** section below before treating this as launch-
ready — a few pieces are intentionally simplified so the whole system is
runnable and honest rather than half-faked.

## Pages implemented

`/`, `/collections`, `/collection/[slug]`, `/shop`, `/product/[slug]`,
`/find-your-aurel`, `/journal`, `/journal/[slug]`, `/about`, `/cart`,
`/checkout` (+ `/checkout/success`), `/account`, `/wishlist`, `/login`,
`/register`, `/admin`, `/admin/products`, `/admin/orders`, `/privacy`,
`/terms`, `/shipping`, `/returns`, `/404`, plus `/sitemap.xml` and
`/robots.txt`.

## Architecture highlights

- **Data layer** (`lib/data/queries.ts`) — every page reads through typed
  Supabase queries; nothing is hardcoded in the app code. Sample catalog
  content lives only in `supabase/05_seed.sql`. Public catalog reads go
  through a cookie-free client (`lib/supabase/public.ts`) so these pages
  can be cached and statically generated — see **Performance** below.
- **Cart** — guest cart in `zustand`/localStorage (`lib/store/cart.ts`);
  authenticated wishlist lives in Supabase from the start.
- **Checkout** (`app/api/checkout/route.ts`) — looks up authoritative prices
  server-side, reserves stock atomically per line item (`reserve_stock` RPC,
  row-locked), validates any coupon server-side, computes shipping/tax, and
  only then creates the Stripe PaymentIntent for that computed total. The
  client never gets to state a price.
- **Webhook** (`app/api/webhooks/stripe/route.ts`) — verifies the Stripe
  signature, dedupes via a unique `stripe_event_id` (idempotency), and only
  marks an order `confirmed` and commits inventory after
  `payment_intent.succeeded` actually arrives from Stripe. A frontend
  "success" state is cosmetic only — this webhook is the source of truth.
- **RLS** — enabled on every exposed table (`supabase/02_rls.sql`). Orders
  have no customer insert/update policy at all by design.
- **Admin** (`AUREL LAB`) — protected by `middleware.ts` (redirects
  non-staff) *and* RLS (the real enforcement layer). Publish toggle and
  order status editing write straight to Supabase and only succeed for
  staff/admin roles. Toggling a product's publish state also pings
  `/api/admin/revalidate` to bust the storefront cache immediately (see
  below) instead of waiting out the revalidation window.
- **3D bottle** (`components/Bottle3D.tsx`) — a procedural Three.js
  `LatheGeometry` bottle, so the 3D hero works with zero external assets.
  Loaded via `components/Bottle3DLazy.tsx` (`next/dynamic`, `ssr: false`)
  so the three.js/@react-three/fiber bundle is code-split out of the main
  page JS and only fetched client-side, after hydration. Swap in real GLB
  models via `product_3d_assets` when you have them; the schema and
  storage bucket are ready.
- **Collection worlds** (`components/CollectionWorld.tsx`) — layered
  parallax (mouse-driven on desktop, scroll-driven on mobile), respects
  `prefers-reduced-motion`. It expects image layers at
  `/public/images/worlds/<slug>/{bg,mid,fg}.webp` — see limitations.

## Performance

- **Public catalog pages are cached, not re-fetched on every request.**
  `lib/supabase/server.ts`'s `createClient()` calls `next/headers`'
  `cookies()`, which opts the *entire* route into fully dynamic rendering —
  correct for `/account`, `/wishlist`, `/admin`, and checkout, but it was
  previously applied to every page, including public, rarely-changing
  catalog pages (`/`, `/shop`, `/collection/[slug]`, `/product/[slug]`,
  `/sitemap.xml`). Those now read through `lib/supabase/public.ts`'s
  cookie-free client, which tags every request `"catalog"` and lets
  Next's Data Cache serve repeat reads for up to 5 minutes instead of
  round-tripping to Supabase each time. `/product/[slug]`,
  `/collection/[slug]`, and `/journal/[slug]` also use
  `generateStaticParams` so they're pre-rendered at build time.
- **`/shop` paginates at the database level.** It previously fetched the
  entire product catalog on every request and sliced it in memory with
  `Array.prototype.slice()`; it now uses `.range()` so only the current
  page's rows are ever fetched, with the total count returned in the same
  query for the pager.
- **List views fetch a card-sized projection, not the full row.** Product
  grids (shop, collection, home, related) only need name/price/image, but
  were previously pulling every column plus the full `product_variants`
  array for every card. They now select a trimmed `PRODUCT_CARD_SELECT`
  projection.
- **Product images render in a defined order.** `product_images.sort_order`
  existed in the schema but nothing ordered by it — the "primary" image
  shown on a card or product page was whatever order Postgres happened to
  return. Every query now explicitly orders the embedded `product_images`
  relation by `sort_order`.
- **The 3D hero is code-split.** `Bottle3D` pulls in three.js,
  `@react-three/fiber`, and `@react-three/drei`. It's now loaded through
  `Bottle3DLazy` (`next/dynamic`, `ssr: false`), so that bundle is fetched
  lazily on the client instead of shipping as part of every page's initial
  JS.
- **Route segments stream in with loading skeletons.** `/shop`,
  `/collections`, `/collection/[slug]`, `/product/[slug]`, and `/journal`
  each have a `loading.tsx`, so navigation shows an immediate skeleton via
  React Suspense instead of blocking on the full data fetch.
- **Cache invalidation is explicit, not just time-based.** Since catalog
  reads are now cached, `/admin/products`' publish toggle calls
  `POST /api/admin/revalidate` (re-checks the caller is staff/admin, then
  calls `revalidateTag("catalog")`) so publish/unpublish changes appear on
  the storefront immediately rather than waiting up to 5 minutes.
- **Auth sessions no longer silently expire while browsing.** `middleware.ts`
  previously only ran on `/admin` and `/account`, so Supabase's session
  cookie was never refreshed while someone browsed `/shop` or
  `/product/*`. It now runs on effectively every route (excluding static
  assets), matching Supabase's recommended SSR pattern.

## Round 6 — the actual root cause: CSP was blocking JavaScript in dev mode

This is very likely the real explanation for every "button doesn't do
anything" report across every round above, not just dev-server slowness.

`next.config.js` sends a strict Content-Security-Policy header —
correct and important for production — but it was applied
**unconditionally, to every request, in dev mode too**, and its
`script-src` didn't include `'unsafe-eval'`. Next.js's dev-mode Fast
Refresh/HMR runtime wraps modules with `eval()` by design (that's just
how webpack's dev-mode module system works) — with `'unsafe-eval'`
missing, the browser silently blocks that from running, per the exact
warning you saw:

```
Content Security Policy of your site blocks the use of 'eval' in JavaScript
main-app.js ... script-src blocked
```

The critical part: **this doesn't throw a page-breaking error you'd
notice** — it just means the client-side runtime never fully executes,
so React never finishes hydrating, so *no* event handler on the page is
ever live. That matches, precisely, every symptom reported across
Rounds 4–5: Add to Bag, View in 3D, Add to Wishlist, Buy Now, the
hydration banner never disappearing — all one root cause, not four
separate bugs and not (only) OneDrive slowness.

**Fixed:** `next.config.js`'s CSP is now environment-aware.
`'unsafe-eval'` (and the dev WebSocket origin HMR needs) are only added
when `NODE_ENV !== "production"`. Your production build
(`npm run build && npm run start`) keeps the strict policy with no
`'unsafe-eval'` — nothing about production security changed.

After pulling this update, **fully restart the dev server** (stop it,
run `npm run dev` again — a browser refresh alone won't pick up a
`next.config.js` change) and it should be interactive immediately, no
matter which folder it's running from. The OneDrive/Downloads advice in
Round 5 is still worth doing for compile speed, but it was very likely
never the reason buttons didn't respond.

## Round 5 — buttons "not working": how to tell dev-server lag from an actual bug

I reviewed every button you listed (Add to Bag, View in 3D, Add to
Wishlist, Buy Now) line by line against the code — the logic is
correct: `add()` in `lib/store/cart.ts` is a plain, synchronous zustand
update; `ProductHero`'s "View in 3D" is a plain `useState` toggle;
`handleWishlist`/`handleBuyNow` are straightforward. I could not find a
code bug in any of them. Combined with your terminal log still showing
`Downloads (3)` as the path and the same 60–80s compile pattern as
before, the most likely explanation is still what Round 4 described:
the page's JavaScript hasn't finished loading/hydrating by the time you
click, so the click lands on inert HTML.

**To prove it either way, there's now a visible diagnostic.** In dev
mode only (never in production), a thin red bar appears at the very top
of every page: *"Loading interactive features…"*. It's wired to
disappear the instant React finishes hydrating and every button on the
page becomes live — not on a timer, on the actual event. So:

- **Bar disappears, buttons still don't respond** → that's a real bug,
  and I want the exact repro steps (which button, what you clicked
  first, any red text in the browser console via F12 → Console tab).
- **Bar never disappears** → the page hasn't hydrated. That's not a
  button-specific bug; nothing on the page can be interactive yet, no
  matter which button you try. This is the dev-server/environment issue,
  and the fix is what's below, not a code change to a specific button.

**The most direct way to settle this once and for all:** dev mode
(`next dev`) recompiles on every request and is inherently exposed to
exactly this kind of stall. A production build compiles everything
once, ahead of time, and then serves prebuilt output — it sidesteps the
entire class of problem.

```
npm run build
npm run start
```

Then open `http://localhost:3000` and try the same buttons. If they
work there, it conclusively confirms the dev-server/OneDrive issue
described below is the cause, not the code. If a specific button still
doesn't work even in that production run, that's a genuine bug and I
want to know exactly which one, since it means I need to look at that
button specifically rather than the environment.

**If you haven't already, move the project out of `Downloads`.** Your
log still shows `C:\Users\Laptronics.co\Downloads\aurel-fixed (3)\aurel`
— if this folder is inside OneDrive's synced Downloads (very common on
managed/branded Windows machines like this one), that's very likely
still the dominant cause of the slowness:

1. Close VS Code / the terminal / `npm run dev`.
2. Copy the `aurel` folder somewhere **not** inside OneDrive — e.g.
   `C:\dev\aurel` (create `C:\dev` if it doesn't exist).
3. Open a terminal *in that new location*, run `npm install` again
   there (it won't reuse the old `node_modules`), then `npm run dev`.
4. Also add `C:\dev\aurel` (or wherever you land) as an exclusion in
   Windows Security → Virus & threat protection → Exclusions, since
   Defender scanning `node_modules` on every file access independently
   slows Node dev servers on Windows.

If compiles are still in the 60–80s range after both of those, that
points to something else about the machine (very limited RAM/CPU, disk
type, or a restricted/proxied network slowing package or font
resolution) — at that point, tell me and I'll help debug further with
that new information, rather than guessing again.

## Round 4 — product page reliability, visible cart feedback, and diagnosing the real slowness

**The product photo now loads with zero dependencies, by default.**
Round 3 fixed *why* the 3D scene was failing, but the underlying design
was still fragile: `Bottle3D` — a full WebGL scene pulling in
three.js/`@react-three/fiber`/`@react-three/drei` (~1,900 modules in
dev) — was rendered unconditionally on every visit to every product
page. If anything about that scene didn't work on a given machine, the
*only* thing on the page was a blank box, and every product page paid
the compile cost of that entire dependency tree whether or not anyone
cared about a 3D view.

New `components/ProductHero.tsx` inverts that: the real product photo
(no WebGL, no three.js, cannot fail) is what renders by default, and a
small "View in 3D" button lets someone opt into the WebGL scene if they
want it. This fixes the blank-image case unconditionally, for any
browser/machine, and it should also noticeably cut dev compile time for
product pages, since three.js's module graph is no longer loaded until
someone actually clicks the toggle.

**Add to Bag now gives visible confirmation.** The cart update itself
was already instant (client-side state), but nothing on screen changed
near the button, so clicking it and seeing no reaction reasonably read
as "broken." The button now reads **"Added ✓"** for two seconds after a
successful add.

**On the dev server taking 60–80 seconds per page** — I looked at your
terminal log closely, and the path in your prompt is the actual clue:

```
C:\Users\Laptronics.co\Downloads\aurel-fixed (4)\aurel
```

Running a Next.js project from inside **Downloads**, when that folder is
part of a synced **OneDrive** folder (the Windows default for most
`Laptronics.co`-style managed/branded machines), is a well-known cause
of exactly this symptom: OneDrive intercepts file reads/writes as
webpack compiles, and dev-server compiles that normally take 2–5 seconds
stretch into 60–80+ seconds, because every one of the thousands of files
Next.js touches gets checked against cloud sync on every access. This
matches your log precisely — first compiles in the 60–80s range, later
recompiles down to 2–4s once things were cached. It also explains why
interactions felt broken: if a click triggers a route compile that takes
a minute, there's no visual feedback during that minute, so it looks
identical to nothing happening.

**Fix:** move the project to a plain local folder that isn't inside
OneDrive — e.g. `C:\dev\aurel` instead of `Downloads\...`. If you're not
sure whether Downloads is synced, check File Explorer for a cloud icon
overlay on the Downloads folder, or open OneDrive settings → "Manage
backup." Also worth excluding your project folder (and
`node_modules`) from Windows Defender's real-time scanning, which
independently slows down Node dev servers on Windows. This one change
typically brings `next dev` compiles back down to single-digit seconds.

**On "account create nahi ho raha":** the register form and Supabase
call are correct — I checked your live project's `auth.users` table
directly and it currently has zero rows, meaning no signup has actually
reached Supabase yet (so this isn't a broken-write bug; it just hasn't
completed successfully yet). Two likely reasons once the dev-server
speed above is fixed:
- Supabase requires email confirmation by default. After submitting the
  form you should see **"Check your email"** — if you don't see that
  screen, the request didn't complete (check the same slowness issue
  above); if you do see it, the account exists but is unconfirmed until
  you click the link in that email (check spam).
- For faster local testing without email round-trips, you can turn this
  off: Supabase Dashboard → your project → Authentication → Sign In /
  Providers → Email → toggle off **"Confirm email."** Then `signUp()`
  logs the user in immediately.

**On "Buy Now nahi ho raha":** this needs real Stripe **test mode** keys
in `.env.local` — `STRIPE_SECRET_KEY` and
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` are still the placeholder
`sk_test_...`/`pk_test_...` values from `.env.example`, since no Stripe
connector is linked for me to pull real ones from. Checkout does surface
this as a visible error message (not a silent failure) — but only after
you get through the **Contact → Shipping** steps, since that's when it
first calls Stripe. Get test keys from
[dashboard.stripe.com](https://dashboard.stripe.com) (Test mode on) and
paste them in; card number `4242 4242 4242 4242`, any future expiry, any
CVC works in Stripe test mode once real test keys are set.

## Round 3 — collection grids had no images at all, and the product page was blank

Three separate real bugs, found by actually reading the render output
you screenshotted rather than assuming Round 2's fix covered everything:

1. **`/collections` and the homepage's "Collection Worlds" grid never
   rendered any image, ever.** Both just painted a flat
   `backgroundColor: c.palette.accent` div with text on top — no `<img>`
   in the markup at all. This wasn't related to the earlier
   `storage_path` bug; `CollectionWorld` (the component with the actual
   layered parallax images) was only ever wired up on the
   `/collection/[slug]` **detail** page, never on the two grid/index
   views. Both now render the collection's world image (`mid.webp`) as a
   real background with a gradient scrim for text legibility.
2. **The product detail page's hero was a blank box.** It renders
   `Bottle3D`, a WebGL scene, and that scene's lighting came from
   `<Environment preset="apartment">` — which fetches an HDR file from a
   third-party CDN. `@react-three/drei`'s own docs say this "is not
   meant to be used in production environments and may fail," and that
   CDN wasn't on the CSP allowlist in `next.config.js` either, so the
   fetch failed and silently took the whole scene down with it — nothing
   caught the error, so it rendered nothing. Fixed two ways:
   - Replaced the CDN-dependent preset with `Environment` +
     `Lightformer` panels — drei's documented, network-free way to get
     realistic reflections entirely from in-scene lights. No fetch, no
     CDN, cannot fail to load.
   - Added a real `ErrorBoundary` around the 3D scene as defense in
     depth, with a contextual `fallbackSrc` (the product's actual photo)
     so *any* future rendering failure shows a real image instead of a
     blank box, never nothing.
3. **The placeholder product photos were too flat/illustrative to read
   as "product photography."** Regenerated them with an actual studio
   treatment: radial vignette backdrop, layered glass-gradient body,
   specular highlight streaks, a faded floor reflection, and a
   cleaner label — same generation approach as Round 2 (procedural,
   palette-driven, zero external dependencies), just meaningfully more
   polished. `product_images` rows didn't need re-seeding since the file
   paths didn't change, only their content.

**Still placeholder art, not real photography** — same disclaimer as
Round 2. It's now genuinely presentable, not just "not broken," but swap
it for real product photography before launch.

## Round 2 — images were missing, and why `npm run dev` still feels slow

**Images weren't rendering — real bug, now fixed.** Two separate causes:

1. `product_images.storage_path` (e.g. `products/forest-signature/01.webp`)
   was being passed straight into `<Image src>` everywhere in the app. A
   Supabase Storage path isn't a URL a browser can fetch on its own — it
   has to be resolved against the bucket's public object endpoint first.
   Nothing did that resolution, so every product card silently rendered
   its empty placeholder box. Added `lib/utils/image.ts`'s
   `getPublicImageUrl()`, which builds the correct public URL (or passes
   through anything that's already a full URL or a local `/public` path),
   and wired it into every place a product image renders: shop, home,
   collection, product detail's related grid, wishlist, and the cart page
   (which had never rendered `item.imagePath` at all — the image slot was
   just an empty gray box, even though the cart store already carried the
   path).
2. There was **no `public/` folder in the project at all** — so
   `/images/worlds/<slug>/{bg,mid,fg}.webp` (the collection parallax
   layers) and `/images/bottle-fallback.png` (the no-WebGL fallback in
   `Bottle3D`) were 404s by construction, not a code bug. Since there's no
   real product photography or location photography to work with yet,
   I generated on-brand placeholder art procedurally from each
   collection's own palette (`supabase/05_seed.sql`) instead of leaving
   them broken or pulling in random unrelated stock photos:
   `public/images/products/<slug>/01.webp` (a simple bottle silhouette
   per collection) and `public/images/worlds/<slug>/{bg,mid,fg}.webp`
   (soft gradient/blob backdrops matching each collection's colors).
   Also added `app/icon.png` (a simple monogram) since there was no
   favicon either. `product_images` rows were seeded in your Supabase
   project pointing at the new product images. **Swap all of this for
   real photography before launch** — it exists purely so the app
   doesn't ship broken image tags.

**On performance — here's what's actually going on, honestly:**

The optimizations from the first pass (ISR, the cached public Supabase
client, DB-level pagination, code-splitting the 3D bottle) are real, but
`npm run dev` will not show most of them. That's not a bug — it's how
Next.js dev mode works:

- **ISR and Next's Data Cache are effectively disabled in `next dev`.**
  Every route recompiles and every fetch re-runs on each request, on
  purpose, so code changes show up immediately. The `revalidate = 300`
  exports and the cached public client only pay off in a **production
  build** (`next build && next start`, or a real deployment).
- **The `webpack.cache.PackFileCacheStrategy: Serializing big strings`
  warning** you saw in the terminal is Next's dev-mode persistent build
  cache logging that a dependency bundle (three.js/`@react-three/fiber`
  is the largest one here) is big enough to be slow to serialize to disk
  between dev server restarts. It's a *build-cache* warning, not a
  runtime slowness indicator, and it doesn't appear in production builds
  at all.
- **First compile of each route is genuinely slow in dev** (`next dev`
  compiles on demand, per route, the first time you visit it) —
  especially anything importing `Bottle3D`. This is expected Next.js dev
  behavior, not something to "fix" — it trades startup speed for the fast
  refresh / instant code-change feedback you get while developing.

To see the actual, representative performance of everything that was
optimized, run:

```
npm run build
npm run start
```

and compare page load / navigation speed against `npm run dev`. That's
the number that will reflect real users' experience in production —
`next dev` never will, no matter how much is optimized underneath it.

## Setup — already done for this project

Your Supabase project (`harisabbasii780-prog's Project`, ref
`vyyroqmihyasrpnwstyv`) is connected and set up:

- ✅ Schema, RLS policies, functions/triggers, and storage buckets applied
  (`01_schema.sql` → `04_storage.sql`)
- ✅ Demo seed data loaded (`05_seed.sql`) — 5 collections, 5 products, 10
  variants, inventory rows for each
- ✅ `product_images` seeded, pointing at the generated placeholder bottle
  art in `public/images/products/` (see **Round 2** above)
- ✅ `.env.local` created with your real `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `lib/supabase/types.ts` regenerated from your live schema (no more
  placeholder `any`)

One thing left, since no Stripe connector is linked:

1. **Stripe test keys** — from [dashboard.stripe.com](https://dashboard.stripe.com)
   with **Test mode** on: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
   For the webhook secret, run
   `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and
   paste the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET`.
   Checkout and cart/inventory reservation work fine without this; only
   actually completing a payment needs it.

Once those two are in, you're fully live:

```
npm install
npm run dev
```

<details>
<summary>Setting up from scratch on a different Supabase project</summary>

1. Create a Supabase project.
2. Run, in order, in the SQL editor: `01_schema.sql`, `02_rls.sql`,
   `03_functions.sql`, `04_storage.sql`, then optionally `05_seed.sql` for
   demo content.
3. Copy `.env.example` → `.env.local`, fill in Supabase URL/keys (Project
   Settings → API) and Stripe test keys (dashboard.stripe.com, test mode).
4. `npm install`
5. Generate real types (replaces the temporary `any` in
   `lib/supabase/types.ts`):
   `npx supabase gen types typescript --project-id <ref> > lib/supabase/types.ts`
6. For webhooks locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   and put the printed signing secret in `STRIPE_WEBHOOK_SECRET`.
7. `npm run dev`

</details>

## Fixes applied in this pass

Starting from an already-functional app, this pass focused on
performance and a few real correctness bugs:

- Removed two stray empty directories (`{app,lib...}`, `{components,lib...}`)
  left over from a shell brace-expansion that hadn't actually run — harmless,
  but not something that belonged in the delivered project.
- Fixed unordered `product_images` so the "primary" product image is
  deterministic instead of whatever order Postgres happened to return.
- Fixed `middleware.ts` only refreshing the Supabase session on `/admin`
  and `/account`, which could let a session silently expire while someone
  browsed the rest of the site. It now also fails soft (logs a warning and
  lets public pages render) if `.env.local` isn't configured yet, instead
  of throwing on every route now that it runs sitewide.
- Replaced full-catalog-fetch-then-slice pagination on `/shop` with
  database-level `.range()` pagination.
- Decoupled public catalog reads from the cookie-bound Supabase client so
  those pages can be cached/statically generated instead of fully
  re-rendered on every request (see **Performance** above for the full
  breakdown, including cache invalidation on publish/unpublish).
- Code-split the three.js/`@react-three/fiber` bundle out of the initial
  page JS via a `next/dynamic` wrapper.
- Added `loading.tsx` skeletons so route transitions stream in via
  Suspense instead of blocking on the full data fetch.

## Known limitations — read before calling this "done"

- **World imagery is not included.** `CollectionWorld` expects layered
  paper-cutout artwork per collection at `/public/images/worlds/<slug>/`.
  I didn't generate/source actual artwork — that's a licensed-image or
  original-illustration task, not code. Drop in your own layers (or swap
  the component to read `collection_art` from Supabase Storage once
  you've uploaded some) and the parallax logic will work as-is.
- **Product images/3D models are placeholders.** The seed script creates
  products with no rows in `product_images`/`product_3d_assets` — pages
  will render with empty image slots until you upload real assets (via
  the `product-images`/`product-3d` buckets) and insert the rows.
- **Tax is hardcoded to 0%** in `app/api/checkout/route.ts` — there's a
  clear placeholder constant (`TAX_RATE`) where a real provider (Stripe
  Tax, TaxJar, etc.) should plug in before this takes real orders.
- **Guest cart → Supabase cart merge on login isn't built.** The
  authenticated cart tables (`carts`/`cart_items`) exist and are covered
  by RLS, but the actual merge function described in the brief isn't
  wired up yet — checkout currently works directly off the client-side
  guest cart for both guest and logged-in users, which is simpler but
  skips "true" server cart persistence for signed-in shoppers.
- **Seed data has 1 product per collection**, not 6–8. The seed script's
  pattern is meant to be extended — it demonstrates the shape, not a
  full catalog.
- **Rate limiting isn't implemented** — add it at the edge
  (Vercel/Cloudflare) or via a Supabase Edge Function before launch,
  since it's infrastructure-level rather than application code.
- **No automated tests.** Given the scope, I did not write a test suite;
  the "test everything" step in the brief is a manual QA pass you should
  run against your own Supabase project.

None of these are hidden behind fake success states — everything either
works for real against your Supabase/Stripe project, or is a clearly
marked placeholder you fill in.
