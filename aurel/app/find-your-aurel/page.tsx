import type { Metadata } from "next";
import FragranceFinder from "@/components/FragranceFinder";

export const metadata: Metadata = { title: "Find Your AUREL" };

export default function FindYourAurelPage() {
  return (
    <div className="container-aurel">
      <FragranceFinder />
    </div>
  );
}
