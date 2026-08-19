import type { Config } from "tailwindcss";

// AUREL design tokens — derived directly from the brand brief.
// Do not add colors or fonts outside this system; each collection
// gets its own accent via the `collection.*` scale, layered on the
// fixed brand base below.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: "#F2EBDD",
        ink: "#1B1B17",
        moss: "#53604A",
        sage: "#89927A",
        clay: "#A86F55",
        sand: "#CDBB9E",
        water: "#607C82",
        burgundy: "#713F43",
        collection: {
          forest: { DEFAULT: "#3F4D38", accent: "#89927A" },
          tide: { DEFAULT: "#4B6167", accent: "#B9C4C1" },
          dusk: { DEFAULT: "#713F43", accent: "#C97B4A" },
          bloom: { DEFAULT: "#8C6B72", accent: "#D8C6B8" },
          earth: { DEFAULT: "#4A3B30", accent: "#A86F55" },
        },
      },
      fontFamily: {
        display: ["var(--font-cormorant)", "serif"],
        body: ["var(--font-inter)", "sans-serif"],
        hand: ["var(--font-caveat)", "cursive"],
      },
      letterSpacing: {
        widest2: "0.28em",
      },
      transitionTimingFunction: {
        world: "cubic-bezier(0.65, 0, 0.35, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
