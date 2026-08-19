"use client";

import { useState } from "react";
import Image from "next/image";
import Bottle3D from "@/components/Bottle3DLazy";

/**
 * The product hero used to render Bottle3D unconditionally — a full
 * WebGL scene, eagerly pulling in three.js/@react-three/fiber/drei
 * (a genuinely enormous module graph: ~1900 modules in dev) on every
 * single visit to every product page, whether or not the visitor cares
 * about the 3D view. Two real problems followed from that:
 *
 * 1. If anything about that scene failed (WebGL disabled, GPU/driver
 *    issues, a slow machine that never gets a painted frame in a
 *    reasonable time), the *only* thing on the page was a blank box —
 *    there was no reliable image underneath it.
 * 2. It made every product page's dev compile dramatically heavier
 *    than it needed to be, since three.js's whole dependency tree had
 *    to be compiled just to load the page at all.
 *
 * This component shows the actual product photo immediately — no
 * WebGL, no three.js, nothing that can fail — and only loads/mounts
 * Bottle3D if the visitor explicitly asks for the 3D view. That keeps
 * the reliable path as the default and the expensive/fragile path as
 * strictly opt-in.
 */
export default function ProductHero({
  photoUrl,
  photoAlt,
  color,
  className,
}: {
  photoUrl?: string;
  photoAlt: string;
  color?: string;
  className?: string;
}) {
  const [show3d, setShow3d] = useState(false);

  return (
    <div className={`relative ${className ?? ""}`}>
      {show3d ? (
        <Bottle3D color={color} className="w-full h-full" fallbackSrc={photoUrl} />
      ) : photoUrl ? (
        <Image src={photoUrl} alt={photoAlt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" priority />
      ) : (
        <div className="w-full h-full bg-sand/30" />
      )}

      <button
        type="button"
        onClick={() => setShow3d((v) => !v)}
        className="absolute bottom-4 right-4 text-xs tracking-wide uppercase bg-ivory/90 backdrop-blur px-4 py-2 border border-ink/20 hover:bg-ivory transition-colors"
      >
        {show3d ? "View Photo" : "View in 3D"}
      </button>
    </div>
  );
}
