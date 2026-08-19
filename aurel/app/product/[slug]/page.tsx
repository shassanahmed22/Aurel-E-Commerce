import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { getAllProductSlugs, getProductBySlug, getRelatedProducts } from "@/lib/data/queries";
import { getPublicImageUrl } from "@/lib/utils/image";
import ProductActions from "@/components/ProductActions";
import ProductCard from "@/components/ProductCard";
import ProductHero from "@/components/ProductHero";

// Product detail content is read far more often than it's written —
// pre-render every product page at build time and revalidate them in
// the background instead of hitting Supabase on every single visit.
export const revalidate = 300;

export async function generateStaticParams() {
  const products = await getAllProductSlugs();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return {};
  return {
    title: product.seo_title ?? product.name,
    description: product.seo_description ?? product.short_description,
    alternates: { canonical: `/product/${product.slug}` },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();
  const related = await getRelatedProducts(product.collection_id, product.id);

  const notesByType = { top: [] as string[], heart: [] as string[], base: [] as string[] };
  for (const link of product.product_scent_notes ?? []) {
    const note = (link as any).scent_notes;
    if (note && notesByType[note.note_type as keyof typeof notesByType]) {
      notesByType[note.note_type as keyof typeof notesByType].push(note.name);
    }
  }

  const publishedReviews = (product.reviews ?? []).filter((r: any) => r.is_published);
  const avgRating = publishedReviews.length
    ? publishedReviews.reduce((s: number, r: any) => s + r.rating, 0) / publishedReviews.length
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.short_description,
    sku: product.sku_prefix,
    offers: {
      "@type": "Offer",
      price: (product.price_cents / 100).toFixed(2),
      priceCurrency: product.currency.toUpperCase(),
      availability: "https://schema.org/InStock",
    },
    ...(avgRating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: avgRating.toFixed(1),
        reviewCount: publishedReviews.length,
      },
    }),
  };

  return (
    <div className="container-aurel py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="grid md:grid-cols-2 gap-12 mb-20">
        <div className="aspect-square bg-sand/20 relative overflow-hidden">
          <ProductHero
            photoUrl={getPublicImageUrl(product.product_images?.[0]?.storage_path)}
            photoAlt={product.product_images?.[0]?.alt_text ?? product.name}
            color={(product.collections as any)?.palette?.DEFAULT}
            className="w-full h-full"
          />
        </div>

        <div>
          <p className="eyebrow mb-2">{(product.collections as any)?.name}</p>
          <h1 className="font-display text-4xl mb-3">{product.name}</h1>
          {avgRating && (
            <p className="text-sm text-moss mb-4" aria-label={`Rated ${avgRating.toFixed(1)} out of 5`}>
              {"★".repeat(Math.round(avgRating))}{"☆".repeat(5 - Math.round(avgRating))} ({publishedReviews.length})
            </p>
          )}
          <p className="text-2xl font-display mb-6">${(product.price_cents / 100).toFixed(2)}</p>
          <p className="text-moss mb-8 leading-relaxed">{product.short_description}</p>

          <ProductActions
            productId={product.id}
            productSlug={product.slug}
            productName={product.name}
            variants={product.product_variants ?? []}
            imagePath={getPublicImageUrl(product.product_images?.[0]?.storage_path)}
          />
        </div>
      </div>

      {/* SCENT NOTES */}
      <section className="grid md:grid-cols-3 gap-8 py-16 border-t border-sand">
        {(["top", "heart", "base"] as const).map((type) => (
          <div key={type}>
            <h2 className="eyebrow mb-3">{type} Notes</h2>
            <ul className="space-y-1 text-moss">
              {notesByType[type].map((n) => <li key={n}>{n}</li>)}
            </ul>
          </div>
        ))}
      </section>

      {/* DETAILS */}
      <section className="grid md:grid-cols-2 gap-12 py-16 border-t border-sand">
        <div>
          <h2 className="font-display text-2xl mb-4">Story</h2>
          <p className="text-moss leading-relaxed">{product.story}</p>
        </div>
        <div>
          <h2 className="font-display text-2xl mb-4">Details</h2>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-sage">Concentration</dt>
            <dd>{product.concentration?.replace(/_/g, " ")}</dd>
            <dt className="text-sage">Ingredients</dt>
            <dd>{product.ingredients}</dd>
          </dl>
        </div>
      </section>

      {/* SHIPPING/RETURNS */}
      <section className="py-16 border-t border-sand grid md:grid-cols-2 gap-8 text-sm text-moss">
        <p>Complimentary shipping on orders over $150. See our <a href="/shipping" className="underline">shipping policy</a>.</p>
        <p>30-day returns on unopened fragrances. See our <a href="/returns" className="underline">returns policy</a>.</p>
      </section>

      {/* REVIEWS */}
      <section className="py-16 border-t border-sand">
        <h2 className="font-display text-2xl mb-8">Reviews</h2>
        {publishedReviews.length === 0 ? (
          <p className="text-moss">No reviews yet.</p>
        ) : (
          <ul className="space-y-6">
            {publishedReviews.map((r: any, i: number) => (
              <li key={i} className="border-b border-sand pb-6">
                <p className="text-sm mb-1">
                  {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                  {r.is_verified_purchase && <span className="ml-2 text-xs text-moss">Verified Purchase</span>}
                </p>
                {r.title && <p className="font-medium">{r.title}</p>}
                <p className="text-moss text-sm">{r.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* RELATED */}
      {related.length > 0 && (
        <section className="py-16 border-t border-sand">
          <h2 className="font-display text-2xl mb-8">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {related.map((p: any) => (
              <ProductCard
                key={p.id}
                slug={p.slug}
                name={p.name}
                priceCents={p.price_cents}
                imageUrl={getPublicImageUrl(p.product_images?.[0]?.storage_path)}
                imageAlt={p.product_images?.[0]?.alt_text}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
