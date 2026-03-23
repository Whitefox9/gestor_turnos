import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(214 20% 86%)",
        input: "hsl(214 20% 86%)",
        ring: "hsl(197 92% 62%)",
        background: "hsl(210 40% 98%)",
        foreground: "hsl(220 27% 12%)",
        primary: {
          DEFAULT: "hsl(201 83% 39%)",
          foreground: "hsl(210 40% 98%)",
        },
        secondary: {
          DEFAULT: "hsl(210 30% 94%)",
          foreground: "hsl(220 27% 12%)",
        },
        muted: {
          DEFAULT: "hsl(210 30% 96%)",
          foreground: "hsl(215 16% 47%)",
        },
        accent: {
          DEFAULT: "hsl(186 60% 92%)",
          foreground: "hsl(201 83% 25%)",
        },
        destructive: {
          DEFAULT: "hsl(0 84% 60%)",
          foreground: "hsl(210 40% 98%)",
        },
        card: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(220 27% 12%)",
        }
      },
      borderRadius: {
        lg: "1rem",
        md: "0.75rem",
        sm: "0.5rem",
      },
      boxShadow: {
        soft: "0 16px 40px -24px rgba(15, 23, 42, 0.35)",
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.06) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
} satisfies Config;
