import { createPublicClient } from "@/lib/supabase/public";
import type { SupabaseClient } from "@supabase/supabase-js";

// Every function in this file reads public, non-user-specific catalog
// data (collections, products, journal posts). They intentionally use
// the cookie-free `createPublicClient()` rather than the cookie-bound
// server client, so the pages calling them can be cached instead of
// forced into per-request dynamic rendering on every visit. See
// lib/supabase/public.ts for details.

export async function getCollections() {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("is_published", true)
    .order("sort_order");
  if (error) throw error;
  return data;
}

export async function getCollectionBySlug(slug: string) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();
  if (error) return null;
  return data;
}

// Card-sized projection used by every product-grid listing (shop,
// collection, home, related). Deliberately excludes product_variants
// and most columns — list views only ever render name/price/image, so
// shipping the full row (ingredients, story, SEO fields, every
// variant) to every grid item on every page was pure waste, and it's
// the same waste on every one of these listing queries.
const PRODUCT_CARD_SELECT =
  "id, slug, name, price_cents, created_at, collections(name, slug), product_images(storage_path, alt_text, sort_order)";

export async function getProductsByCollection(collectionId: string) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_CARD_SELECT)
    .eq("collection_id", collectionId)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .order("sort_order", { foreignTable: "product_images" });
  if (error) throw error;
  return data;
}

/**
 * DB-level paginated product listing for /shop. Replaces the previous
 * approach of fetching the *entire* catalog on every request and
 * slicing it in memory with `Array.prototype.slice()` — page 1 of the
 * shop was paying the full network + serialization cost of the whole
 * catalog just to display 12 items, and that cost only grows as the
 * catalog grows. `.range()` pushes pagination down to Postgres, and
 * `{ count: "exact" }` gets the total for the pager in the same
 * round trip instead of a second query.
 */
export async function getProductsPage(page: number, pageSize: number) {
  const supabase = createPublicClient();
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  const { data, error, count } = await supabase
    .from("products")
    .select(PRODUCT_CARD_SELECT, { count: "exact" })
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .order("sort_order", { foreignTable: "product_images" })
    .range(start, end);
  if (error) throw error;
  return { items: data ?? [], totalCount: count ?? 0 };
}

/**
 * Small, fixed-size query for the homepage "Featured" section.
 * Previously the homepage called the same `getAllProducts()` used by
 * the full shop listing and threw away everything past index 4 — the
 * entire catalog was fetched (and paid for) just to show four items.
 */
export async function getFeaturedProducts(limit = 4) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_CARD_SELECT)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .order("sort_order", { foreignTable: "product_images" })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** slug/updated_at only — used for sitemap generation, not the full row. */
export async function getAllProductSlugs() {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("slug, updated_at")
    .eq("is_published", true);
  if (error) throw error;
  return data ?? [];
}

export async function getProductBySlug(slug: string) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(`
      *, collections(name, slug, palette),
      product_images(*), product_variants(*), product_3d_assets(*),
      product_scent_notes(scent_notes(*)),
      reviews(rating, title, body, is_verified_purchase, created_at, is_published)
    `)
    .eq("slug", slug)
    .eq("is_published", true)
    .order("sort_order", { foreignTable: "product_images" })
    .order("volume_ml", { foreignTable: "product_variants" })
    .single();
  if (error) return null;
  return data;
}

export async function getRelatedProducts(collectionId: string, excludeProductId: string) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_CARD_SELECT)
    .eq("collection_id", collectionId)
    .eq("is_published", true)
    .neq("id", excludeProductId)
    .order("sort_order", { foreignTable: "product_images" })
    .limit(4);
  if (error) throw error;
  return data;
}

export async function getPublishedJournalPosts() {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("journal_posts")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getJournalPostBySlug(slug: string) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("journal_posts")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();
  if (error) return null;
  return data;
}

/**
 * Server-side availability check — never trust a client-reported stock
 * number. Takes an explicit client because it's called from the
 * checkout route with a service-role client, not the public one.
 */
export async function getAvailableStock(client: SupabaseClient, variantId: string) {
  const { data, error } = await client
    .from("inventory")
    .select("on_hand, reserved")
    .eq("variant_id", variantId)
    .single();
  if (error || !data) return 0;
  return data.on_hand - data.reserved;
}
