import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f6ef",
          100: "#e7ead7",
          200: "#d0d8b0",
          300: "#b7c584",
          400: "#9fb45a",
          500: "#82973f",
          600: "#677832",
          700: "#4e5b28",
          800: "#38411d",
          900: "#222910"
        },
        ink: "#0f172a",
        sand: "#f8f6ef"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;

