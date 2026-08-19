"use client";

import dynamic from "next/dynamic";

/**
 * Bottle3D pulls in three.js, @react-three/fiber, and @react-three/drei
 * — a genuinely heavy dependency graph for a single decorative element.
 * It was previously imported directly into three Server Component
 * pages (home, collection, product), which meant that entire bundle
 * shipped as part of each page's JS and had to be parsed before the
 * page was interactive, even though the 3D scene isn't needed for
 * first paint and Bottle3D itself only starts rendering after mount.
 *
 * `next/dynamic(..., { ssr: false })` can't be called directly inside
 * a Server Component in the App Router, so this thin client wrapper
 * exists purely to hold that call — the server pages import this
 * instead of Bottle3D directly, and the three.js chunk is fetched
 * lazily, after hydration, with a lightweight placeholder shown while
 * it streams in.
 */
const Bottle3D = dynamic(() => import("./Bottle3D"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-sand/20 animate-pulse" aria-hidden="true" />,
});

export default Bottle3D;
