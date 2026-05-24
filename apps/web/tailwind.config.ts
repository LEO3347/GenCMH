import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#03030a",
        violetGlow: "#8b5cf6",
        electric: "#00d4ff",
        neonPink: "#ff2bd6",
        acid: "#c7ff3d"
      },
      boxShadow: {
        neon: "0 0 42px rgba(0, 212, 255, 0.28)",
        pink: "0 0 48px rgba(255, 43, 214, 0.26)"
      }
    }
  },
  plugins: []
};

export default config;
