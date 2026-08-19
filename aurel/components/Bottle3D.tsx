"use client";

import { Component, Suspense, useRef, useState, useEffect, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";

function BottleMesh({ color = "#A86F55" }: { color?: string }) {
  const group = useRef<THREE.Group>(null);
  const reducedMotion = usePrefersReducedMotion();

  useFrame((_, delta) => {
    if (group.current && !reducedMotion) {
      group.current.rotation.y += delta * 0.25;
    }
  });

  // Procedural lathe-geometry bottle profile — no external asset required.
  const points = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.55, 0),
    new THREE.Vector2(0.55, 0.9),
    new THREE.Vector2(0.62, 1.0),
    new THREE.Vector2(0.62, 1.9),
    new THREE.Vector2(0.4, 2.0),
    new THREE.Vector2(0.4, 2.3),
    new THREE.Vector2(0.18, 2.35),
    new THREE.Vector2(0.18, 2.55),
    new THREE.Vector2(0, 2.6),
  ];

  return (
    <group ref={group}>
      <mesh castShadow receiveShadow>
        <latheGeometry args={[points, 48]} />
        <meshPhysicalMaterial
          color={color}
          transmission={0.85}
          roughness={0.05}
          thickness={0.6}
          ior={1.45}
          clearcoat={1}
        />
      </mesh>
      <mesh position={[0, 2.72, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.18, 0.24, 32]} />
        <meshStandardMaterial color="#1B1B17" roughness={0.4} metalness={0.3} />
      </mesh>
    </group>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const listener = () => setReduced(mq.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);
  return reduced;
}

/**
 * Studio-style reflections built entirely from in-scene light panels —
 * no network request, no CDN. This replaces `<Environment preset="apartment">`,
 * which drei's own docs say is "not meant to be used in production
 * environments and may fail" since it fetches an HDR file from a
 * third-party CDN on every mount. Between that CDN not being on the
 * CSP allowlist and presets being explicitly discouraged for
 * production, that fetch was failing silently and taking the whole
 * scene down with it — the blank box on the product page. Lightformers
 * render entirely inside the WebGL scene, so this can never fail to load.
 */
function StudioEnvironment() {
  return (
    <Environment resolution={256}>
      <Lightformer form="rect" intensity={2.2} position={[0, 4, 3]} scale={[6, 3, 1]} color="#ffffff" />
      <Lightformer form="rect" intensity={1.1} position={[-4, 1, 2]} scale={[3, 4, 1]} color="#F2EBDD" />
      <Lightformer form="ring" intensity={0.8} position={[3, 2, -2]} scale={3} color="#CDBB9E" />
    </Environment>
  );
}

/**
 * Catches runtime errors from the R3F render tree (e.g. a WebGL context
 * failure after mount) that `webglOk`'s upfront feature check can't
 * catch, and falls back to a real image instead of a blank canvas.
 */
class BottleErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Bottle3D] falling back to static image after render error:", error);
    }
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export default function Bottle3D({
  color,
  className,
  fallbackSrc,
}: {
  color?: string;
  className?: string;
  /**
   * Shown when WebGL is unavailable or the 3D scene fails to render.
   * Pass the page's real product photo when one is available so a
   * failure is never a blank box. When omitted (decorative uses, like
   * the collection/home hero, where Bottle3D is layered over other
   * art), a failure renders nothing rather than an opaque placeholder
   * that would otherwise block whatever's behind it.
   */
  fallbackSrc?: string;
}) {
  const [webglOk, setWebglOk] = useState(true);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      setWebglOk(!!ctx);
    } catch {
      setWebglOk(false);
    }
  }, []);

  const fallback = fallbackSrc ? (
    <div className={`flex items-center justify-center bg-sand/30 ${className ?? ""}`}>
      <img src={fallbackSrc} alt="AUREL fragrance bottle" className="max-h-full" />
    </div>
  ) : null;

  if (!webglOk) return fallback;

  return (
    <BottleErrorBoundary fallback={fallback}>
      <div className={className}>
        <Canvas shadows camera={{ position: [0, 1.3, 4], fov: 35 }} dpr={[1, 1.5]}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.4} />
            <directionalLight position={[3, 5, 2]} intensity={1.2} castShadow />
            <BottleMesh color={color} />
            <ContactShadows position={[0, -0.05, 0]} opacity={0.5} scale={6} blur={2.5} />
            <StudioEnvironment />
          </Suspense>
        </Canvas>
      </div>
    </BottleErrorBoundary>
  );
}
