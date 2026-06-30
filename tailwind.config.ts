import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0d1b1e",
          soft: "#33474b",
          muted: "#6b7e82",
        },
        sand: {
          DEFAULT: "#f6f3ee",
          dark: "#ece6db",
        },
        brand: {
          DEFAULT: "#0f5e57",
          dark: "#0a423d",
          light: "#2f8a80",
          accent: "#d9a441",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgba(13, 27, 30, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
