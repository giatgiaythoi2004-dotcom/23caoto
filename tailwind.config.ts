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
        felt: {
          light: "#0d5c3a",
          DEFAULT: "#073b22",
          dark: "#042414",
        },
        casino: {
          gold: "#f59e0b",
          goldLight: "#fbbf24",
          red: "#ef4444",
          blue: "#3b82f6",
          dark: "#09090b",
          card: "#18181b",
          border: "#27272a",
        },
      },
      boxShadow: {
        'glow-gold': '0 0 20px -3px rgba(245, 158, 11, 0.4)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.3)',
      },
    },
  },
  plugins: [],
};
export default config;
