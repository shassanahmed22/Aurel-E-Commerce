export type FinderAnswers = {
  atmosphere: "forest" | "coast" | "dusk" | "garden" | "desert";
  freshness: "fresh" | "warm";
  intensity: "subtle" | "bold";
  occasion: "everyday" | "evening";
  season: "warm_weather" | "cool_weather";
};

// Maps each answer set deterministically to a collection slug, so the
// recommendation is always explainable from the inputs — no scientific
// or medical claims, just stated fragrance-family logic.
const ATMOSPHERE_TO_COLLECTION: Record<FinderAnswers["atmosphere"], string> = {
  forest: "forest",
  coast: "tide",
  dusk: "dusk",
  garden: "bloom",
  desert: "earth",
};

export function recommendCollection(answers: FinderAnswers): {
  primarySlug: string;
  alternateSlugs: string[];
  explanation: string;
} {
  const primarySlug = ATMOSPHERE_TO_COLLECTION[answers.atmosphere];

  // Alternates: the two nearest collections by a simple adjacency map,
  // adjusted by warmth — warm answers skew toward Dusk/Earth, fresh
  // answers skew toward Forest/Tide.
  const adjacency: Record<string, string[]> = {
    forest: ["tide", "bloom"],
    tide: ["forest", "bloom"],
    dusk: ["earth", "bloom"],
    bloom: ["forest", "dusk"],
    earth: ["dusk", "forest"],
  };
  let alternateSlugs = adjacency[primarySlug] ?? [];

  if (answers.freshness === "warm" && !alternateSlugs.includes("dusk") && primarySlug !== "dusk") {
    alternateSlugs = ["dusk", ...alternateSlugs.slice(0, 1)];
  }
  if (answers.freshness === "fresh" && !alternateSlugs.includes("tide") && primarySlug !== "tide") {
    alternateSlugs = ["tide", ...alternateSlugs.slice(0, 1)];
  }

  const explanation = `Based on your preference for a ${answers.atmosphere} atmosphere and a ${
    answers.freshness === "fresh" ? "fresh, bright" : "warm, rich"
  } character, we matched you to this collection. Your ${answers.intensity} intensity and ${
    answers.occasion
  } occasion preferences refine which fragrance within it suits you best.`;

  return { primarySlug, alternateSlugs, explanation };
}
