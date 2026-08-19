import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedJournalPosts, getJournalPostBySlug } from "@/lib/data/queries";

export const revalidate = 300;

export async function generateStaticParams() {
  const posts = await getPublishedJournalPosts();
  return posts.map((p: any) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getJournalPostBySlug(params.slug);
  if (!post) return {};
  return { title: post.title, description: post.excerpt ?? undefined };
}

export default async function JournalPostPage({ params }: { params: { slug: string } }) {
  const post = await getJournalPostBySlug(params.slug);
  if (!post) notFound();

  return (
    <article className="container-aurel py-20 max-w-2xl mx-auto">
      <p className="eyebrow mb-3">
        {post.published_at ? new Date(post.published_at).toLocaleDateString() : ""}
      </p>
      <h1 className="font-display text-4xl mb-10">{post.title}</h1>
      <div className="prose prose-neutral max-w-none whitespace-pre-wrap text-moss leading-relaxed">
        {post.body}
      </div>
    </article>
  );
}
