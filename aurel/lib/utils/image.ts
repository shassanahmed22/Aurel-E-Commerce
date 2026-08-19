const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * `product_images.storage_path` was being passed straight into
 * `<Image src>` everywhere in the app, but a Supabase Storage path
 * like `products/forest-signature/01.webp` is not a URL a browser can
 * fetch — it needs to be resolved against the bucket's public object
 * endpoint first. Since nothing did that resolution, every product
 * card silently rendered its empty placeholder box instead of an
 * image, regardless of whether `product_images` had rows or not.
 *
 * This also transparently passes through anything that's already a
 * full URL (`http://`/`https://`), so seed/demo content can reference
 * external stock photos directly without needing files actually
 * uploaded to Supabase Storage.
 */
export function getPublicImageUrl(
  path: string | null | undefined,
  bucket: string = "product-images"
): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/")) return path; // site-relative path under /public
  if (!SUPABASE_URL) return undefined;
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
