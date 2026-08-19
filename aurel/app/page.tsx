import Link from "next/link";
import { getCollections, getFeaturedProducts } from "@/lib/data/queries";
import { getPublicImageUrl } from "@/lib/utils/image";
import Bottle3D from "@/components/Bottle3DLazy";
import ProductCard from "@/components/ProductCard";

// Catalog content changes infrequently; serve a cached page and
// refresh it in the background at most every 5 minutes instead of
// hitting Supabase on every single visit.
export const revalidate = 300;

export default async function HomePage() {
  const [collections, featured] = await Promise.all([getCollections(), getFeaturedProducts(4)]);

  return (
    <>
      {/* HERO */}
      <section className="relative min-h-[100svh] w-full overflow-hidden bg-ink text-ivory">
        <div className="absolute inset-0">
          <img
            src="/images/hero-bottle.png"
            alt="AUREL fragrance"
            className="h-full w-full object-cover object-center scale-[1.02] animate-hero-zoom"
          />

          {/* Luxury cinematic overlays */}
          <div className="absolute inset-0 bg-black/35" />

          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(10,10,8,0.88) 0%, rgba(10,10,8,0.52) 38%, rgba(10,10,8,0.12) 72%, rgba(10,10,8,0.42) 100%)",
            }}
          />

          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(10,10,8,0.35) 0%, transparent 45%, rgba(10,10,8,0.75) 100%)",
            }}
          />
        </div>

        {/* Hero content */}
        <div className="relative z-10 flex min-h-[100svh] items-center">
          <div className="container-aurel w-full px-6 sm:px-10 lg:px-16">
            <div className="max-w-2xl">

              {/* Eyebrow */}
              <p className="eyebrow text-sand mb-5 animate-hero-fade [animation-delay:150ms]">
                The Art of Scent
              </p>

              {/* Brand */}
              <h1 className="font-display text-6xl sm:text-7xl md:text-8xl lg:text-[9rem] leading-[0.85] tracking-[0.08em] mb-7 animate-hero-fade [animation-delay:300ms]">
                AUREL
              </h1>

              {/* Description */}
              <p className="font-hand text-2xl sm:text-3xl md:text-4xl text-sand leading-tight max-w-xl mb-10 animate-hero-fade [animation-delay:500ms]">
                Fragrance, composed as a collection of worlds.
              </p>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 animate-hero-fade [animation-delay:700ms]">
                <Link
                  href="/collections"
                  className="btn-primary bg-ivory text-ink px-8 py-4 transition-all duration-300 hover:bg-sand hover:-translate-y-1"
                >
                  Explore Collections
                </Link>

                <Link
                  href="/find-your-aurel"
                  className="btn-secondary border border-ivory text-ivory px-8 py-4 backdrop-blur-sm transition-all duration-300 hover:bg-ivory hover:text-ink hover:-translate-y-1"
                >
                  Find Your AUREL
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom scroll indicator */}
        <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-bounce">
          <div className="flex flex-col items-center gap-2 text-ivory/70">
            <span className="text-[10px] uppercase tracking-[0.3em]">
              Discover
            </span>
            <span className="h-10 w-px bg-ivory/50" />
          </div>
        </div>
      </section>

      {/* COLLECTION WORLDS */}
      <section className="container-aurel py-24">
        <p className="eyebrow text-center mb-3">Five Worlds</p>
        <h2 className="text-4xl text-center mb-14">Collection Worlds</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {collections.map((c: any) => (
            <Link
              key={c.id}
              href={`/collection/${c.slug}`}
              className="group relative aspect-[3/4] block overflow-hidden bg-sand/40"
            >
              <img
                src={`/images/worlds/${c.slug}/mid.webp`}
                alt=""
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div
                className="absolute inset-0 flex items-end p-6"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 55%, transparent 100%)" }}
              >
                <div>
                  <p className="eyebrow text-ivory/80 mb-1">{c.subtitle}</p>
                  <h3 className="font-display text-2xl text-ivory">{c.name}</h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="container-aurel py-24">
        <p className="eyebrow text-center mb-3">Featured</p>
        <h2 className="text-4xl text-center mb-14">Featured Fragrances</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {featured.map((p: any) => (
            <ProductCard
              key={p.id}
              slug={p.slug}
              name={p.name}
              collectionName={p.collections?.name}
              priceCents={p.price_cents}
              imageUrl={getPublicImageUrl(p.product_images?.[0]?.storage_path)}
              imageAlt={p.product_images?.[0]?.alt_text}
            />
          ))}
        </div>
      </section>

      {/* SCENT JOURNEY */}
      <section className="bg-moss text-ivory py-24">
        <div className="container-aurel text-center">
          <p className="eyebrow text-sand mb-3">The Scent Journey</p>
          <h2 className="text-4xl mb-12">Top → Heart → Base</h2>
          <div className="grid md:grid-cols-3 gap-8 text-left">
            {[
              { label: "Top Notes", body: "The first impression — bright, volatile, and gone within minutes." },
              { label: "Heart Notes", body: "The character of the fragrance, emerging as the top notes settle." },
              { label: "Base Notes", body: "The lasting foundation, unfolding over hours against the skin." },
            ].map((n) => (
              <div key={n.label} className="border-t border-ivory/30 pt-6">
                <h3 className="font-display text-xl mb-2">{n.label}</h3>
                <p className="text-sand text-sm">{n.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PHILOSOPHY */}
      <section className="container-aurel py-24 max-w-3xl text-center mx-auto">
        <p className="eyebrow mb-3">AUREL Philosophy</p>
        <h2 className="text-4xl mb-6">Fragrance as a place, not a product.</h2>
        <p className="text-moss leading-relaxed">
          Each AUREL collection begins with a landscape before it becomes a scent — a forest, a
          shoreline, a dusk-lit mountain. We build the world first, so the fragrance arrives
          already carrying a sense of place.
        </p>
      </section>

      {/* JOURNAL TEASER */}
      <section className="container-aurel py-24">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-4xl">Journal</h2>
          <Link href="/journal" className="text-sm underline underline-offset-4">
            Read more
          </Link>
        </div>
      </section>

      {/* FRAGRANCE FINDER CTA */}
      <section className="bg-clay/20 py-24 text-center">
        <p className="eyebrow mb-3">Not sure where to start?</p>
        <h2 className="text-4xl mb-8">Find Your AUREL</h2>
        <Link href="/find-your-aurel" className="btn-primary">
          Take the Fragrance Finder
        </Link>
      </section>
    </>
  );
}
