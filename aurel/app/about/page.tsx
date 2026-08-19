import type { Metadata } from "next";

export const metadata: Metadata = { title: "Philosophy" };

export default function AboutPage() {
  return (
    <div className="container-aurel py-24 max-w-2xl mx-auto text-center">
      <p className="eyebrow mb-3">AUREL Philosophy</p>
      <h1 className="text-5xl mb-8">The Art of Scent</h1>
      <p className="text-moss leading-relaxed mb-6">
        AUREL began with a simple belief: that a fragrance is a place before it is a product.
        Every collection starts as a landscape — a forest, a tideline, a mountain at dusk — built
        first as a world, then distilled into scent.
      </p>
      <p className="text-moss leading-relaxed">
        Each bottle carries a fragment of the world it came from. We compose fragrance the way a
        landscape architect composes a garden: with restraint, with material honesty, and with an
        eye for what a place feels like at exactly the right hour.
      </p>
    </div>
  );
}
