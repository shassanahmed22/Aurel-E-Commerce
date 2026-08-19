"use client";

import { useEffect, useRef } from "react";

export type WorldLayer = {
  src: string;
  depth: number; // 0 = far background, 1 = closest foreground
  alt: string;
};

/**
 * Renders a collection's world as stacked paper-cutout layers with
 * mouse-parallax on desktop and scroll-driven depth on mobile, per
 * the brief. Respects prefers-reduced-motion by freezing all layers.
 */
export default function CollectionWorld({
  layers,
  accent,
  className,
}: {
  layers: WorldLayer[];
  accent: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const el = containerRef.current;
    if (!el) return;

    function handleMouseMove(e: MouseEvent) {
      const rect = el!.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      layerRefs.current.forEach((layer, i) => {
        if (!layer) return;
        const depth = layers[i]?.depth ?? 0;
        const move = depth * 24;
        layer.style.transform = `translate3d(${x * move}px, ${y * move * 0.6}px, 0)`;
      });
    }

    function handleScroll() {
      if (window.innerWidth >= 768) return; // desktop uses mouse parallax
      const rect = el!.getBoundingClientRect();
      const progress = Math.min(Math.max(1 - rect.top / window.innerHeight, 0), 1);
      layerRefs.current.forEach((layer, i) => {
        if (!layer) return;
        const depth = layers[i]?.depth ?? 0;
        layer.style.transform = `translate3d(0, ${(1 - progress) * depth * 40}px, 0)`;
      });
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [layers]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className ?? ""}`}
      style={{ backgroundColor: accent }}
    >
      {layers.map((layer, i) => (
        <div
          key={layer.src + i}
          ref={(node) => { layerRefs.current[i] = node; }}
          className="absolute inset-0 will-change-transform transition-transform duration-300 ease-world"
          style={{ zIndex: i }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={layer.src} alt={layer.alt} className="w-full h-full object-cover" loading={i === 0 ? "eager" : "lazy"} />
        </div>
      ))}
    </div>
  );
}
