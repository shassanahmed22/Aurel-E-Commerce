import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCollections, getCollectionBySlug, getProductsByCollection } from "@/lib/data/queries";
import { getPublicImageUrl } from "@/lib/utils/image";
import CollectionWorld from "@/components/CollectionWorld";
import ProductCard from "@/components/ProductCard";
import Bottle3D from "@/components/Bottle3DLazy";

// There are only ever a handful of collections, so pre-render every
// one of them at build time and revalidate in the background — this
// page previously did two full Supabase round trips on every request.
export const revalidate = 300;

export async function generateStaticParams() {
  const collections = await getCollections();
  return collections.map((c: any) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const collection = await getCollectionBySlug(params.slug);
  if (!collection) return {};
  return {
    title: collection.name,
    description: collection.description,
    alternates: { canonical: `/collection/${collection.slug}` },
  };
}

export default async function CollectionPage({ params }: { params: { slug: string } }) {
  const collection = await getCollectionBySlug(params.slug);
  if (!collection) notFound();
  const products = await getProductsByCollection(collection.id);
  const heroImage = getPublicImageUrl(products[0]?.product_images?.[0]?.storage_path);

  const worldLayers = [
    { src: `/images/worlds/${collection.slug}/bg.webp`, depth: 0.2, alt: "" },
    { src: `/images/worlds/${collection.slug}/mid.webp`, depth: 0.5, alt: "" },
    { src: `/images/worlds/${collection.slug}/fg.webp`, depth: 0.9, alt: `${collection.name} world` },
  ];

  const palette = collection.palette as { accent?: string; DEFAULT?: string } | null;

  return (
    <div>
      <section className="relative h-[80vh] min-h-[560px]">
        <CollectionWorld layers={worldLayers} accent={palette?.accent ?? "#89927A"} className="absolute inset-0" />
        <div className="absolute inset-0 z-10">
          <Bottle3D color={palette?.DEFAULT} className="w-full h-full" fallbackSrc={heroImage} />
        </div>
        <div className="relative z-20 h-full flex flex-col items-center justify-end pb-16 text-center px-6 text-ivory">
          <p className="eyebrow mb-2">{collection.subtitle}</p>
          <h1 className="font-display text-5xl md:text-6xl">{collection.name}</h1>
        </div>
      </section>

      <section className="container-aurel py-20">
        <p className="max-w-2xl mx-auto text-center text-moss mb-14">{collection.description}</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          {products.map((p: any) => (
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
    </div>
  );
}
