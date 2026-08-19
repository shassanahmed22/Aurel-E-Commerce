import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedJournalPosts } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Journal" };
export const revalidate = 300;

export default async function JournalIndexPage() {
  const posts = await getPublishedJournalPosts();

  return (
    <div className="container-aurel py-20">
      <h1 className="text-5xl text-center mb-14">Journal</h1>
      {posts.length === 0 ? (
        <p className="text-center text-moss">No entries yet — check back soon.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-10 max-w-4xl mx-auto">
          {posts.map((p) => (
            <Link key={p.id} href={`/journal/${p.slug}`} className="group block">
              <div className="aspect-[4/3] bg-sand/30 mb-4" />
              <p className="eyebrow mb-1">
                {p.published_at ? new Date(p.published_at).toLocaleDateString() : ""}
              </p>
              <h2 className="font-display text-2xl mb-2 group-hover:text-moss transition-colors">{p.title}</h2>
              <p className="text-sm text-moss">{p.excerpt}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
