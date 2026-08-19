import Link from "next/link";
import Image from "next/image";

type ProductCardProps = {
  slug: string;
  name: string;
  collectionName?: string;
  priceCents: number;
  imageUrl?: string;
  imageAlt?: string;
};

export default function ProductCard({ slug, name, collectionName, priceCents, imageUrl, imageAlt }: ProductCardProps) {
  return (
    <Link href={`/product/${slug}`} className="group block">
      <div className="relative aspect-[4/5] bg-sand/30 overflow-hidden mb-4">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt ?? name}
            fill
            sizes="(min-width: 768px) 25vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
      </div>
      {collectionName && <p className="eyebrow mb-1">{collectionName}</p>}
      <h3 className="font-display text-lg">{name}</h3>
      <p className="text-sm text-moss">${(priceCents / 100).toFixed(2)}</p>
    </Link>
  );
}
