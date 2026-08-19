import type { Metadata } from "next";
import { getProductsPage } from "@/lib/data/queries";
import { getPublicImageUrl } from "@/lib/utils/image";
import ProductCard from "@/components/ProductCard";

export const metadata: Metadata = { title: "Shop" };

// The page itself still renders per-request (it reads `searchParams`
// for pagination), but the underlying Supabase reads go through the
// cached public client, so repeat visits to the same page number are
// served from Next's Data Cache instead of re-querying every time.
export const revalidate = 300;

const PAGE_SIZE = 12;

export default async function ShopPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  // DB-level pagination via .range() — only the 12 rows this page
  // needs are fetched, not the entire catalog sliced in memory.
  const { items: pageItems, totalCount } = await getProductsPage(page, PAGE_SIZE);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <div className="container-aurel py-20">
      <h1 className="text-5xl text-center mb-14">All Fragrances</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-14">
        {pageItems.map((p: any) => (
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
      {totalPages > 1 && (
        <nav className="flex justify-center gap-2" aria-label="Pagination">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <a
              key={n}
              href={`/shop?page=${n}`}
              aria-current={n === page ? "page" : undefined}
              className={`w-9 h-9 flex items-center justify-center text-sm border ${n === page ? "bg-ink text-ivory" : "border-sand"}`}
            >
              {n}
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
