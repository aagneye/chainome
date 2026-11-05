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
    },
  },
  plugins: [],
};

export default config;
