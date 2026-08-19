import Link from "next/link";
import type { Metadata } from "next";
import { getCollections } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Collections" };
export const revalidate = 300;

export default async function CollectionsPage() {
  const collections = await getCollections();
  return (
    <div className="container-aurel py-20">
      <p className="eyebrow text-center mb-3">Five Worlds</p>
      <h1 className="text-5xl text-center mb-14">Collections</h1>
      <div className="grid md:grid-cols-2 gap-6">
        {collections.map((c: any) => (
          <Link key={c.id} href={`/collection/${c.slug}`} className="group block relative aspect-[16/10] overflow-hidden">
            <img
              src={`/images/worlds/${c.slug}/mid.webp`}
              alt=""
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div
              className="absolute inset-0 flex items-end p-8"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)" }}
            >
              <div>
                <p className="eyebrow text-ivory/80 mb-1">{c.subtitle}</p>
                <h2 className="font-display text-3xl text-ivory">{c.name}</h2>
                <p className="text-sm text-ivory/80 mt-2 max-w-sm">{c.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
