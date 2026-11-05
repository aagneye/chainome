import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        genome: {
          teal:    "#00c9a7",
          violet:  "#a78bfa",
          navy:    "#070c18",
          card:    "#0e1424",
          border:  "#182035",
        },
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(0, 201, 167, 0)" },
          "50%":      { boxShadow: "0 0 18px 4px rgba(0, 201, 167, 0.28)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
      },
      animation: {
        "fade-in":    "fadeIn 0.3s ease-out both",
        "slide-up":   "slideUp 0.4s ease-out both",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "shimmer":    "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
