import type { MetadataRoute } from "next";
import { getCollections, getAllProductSlugs, getPublishedJournalPosts } from "@/lib/data/queries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [collections, products, posts] = await Promise.all([
    getCollections(),
    getAllProductSlugs(),
    getPublishedJournalPosts(),
  ]);

  const staticRoutes = [
    "", "/collections", "/shop", "/find-your-aurel", "/journal", "/about",
    "/privacy", "/terms", "/shipping", "/returns",
  ].map((path) => ({ url: `${base}${path}`, lastModified: new Date() }));

  const collectionRoutes = collections.map((c: any) => ({
    url: `${base}/collection/${c.slug}`,
    lastModified: c.updated_at ? new Date(c.updated_at) : new Date(),
  }));

  const productRoutes = products.map((p: any) => ({
    url: `${base}/product/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
  }));

  const journalRoutes = posts.map((p: any) => ({
    url: `${base}/journal/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
  }));

  return [...staticRoutes, ...collectionRoutes, ...productRoutes, ...journalRoutes];
}
