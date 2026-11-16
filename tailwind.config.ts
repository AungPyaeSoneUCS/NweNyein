import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        saffron: {
          DEFAULT: "#D97706",
          light: "#F59E0B",
          dark: "#B45309",
        },
        maroon: {
          DEFAULT: "#7F1D1D",
          light: "#991B1B",
          dark: "#450A0A",
        },
        ivory: "#FAF8F5",
        charcoal: "#1E293B",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-noto-myanmar)", "system-ui", "sans-serif"],
        myanmar: ["var(--font-noto-myanmar)", "sans-serif"],
      },
      boxShadow: {
        soft: "0 4px 20px rgba(127, 29, 29, 0.08)",
        glass: "0 8px 30px rgba(30, 41, 59, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
