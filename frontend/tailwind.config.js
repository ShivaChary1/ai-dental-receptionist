/** @type {import('tailwindcss').Config} */

// Wrap a bare-channel CSS var so Tailwind opacity modifiers work:
//   text-primary/60  →  oklch(var(--primary) / 0.6)
const token = (name) => ({ opacityValue }) =>
  opacityValue === undefined
    ? `oklch(var(${name}))`
    : `oklch(var(${name}) / ${opacityValue})`;

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: token("--background"),
        foreground: token("--foreground"),
        card: { DEFAULT: token("--card"), foreground: token("--card-foreground") },
        popover: { DEFAULT: token("--popover"), foreground: token("--popover-foreground") },
        muted: { DEFAULT: token("--muted"), foreground: token("--muted-foreground") },
        subtle: { DEFAULT: token("--subtle"), foreground: token("--subtle-foreground") },
        primary: {
          DEFAULT: token("--primary"),
          foreground: token("--primary-foreground"),
          hover: token("--primary-hover"),
        },
        success: { DEFAULT: token("--success"), foreground: token("--success-foreground") },
        warning: { DEFAULT: token("--warning"), foreground: token("--warning-foreground") },
        destructive: { DEFAULT: token("--destructive"), foreground: token("--destructive-foreground") },
        info: { DEFAULT: token("--info"), foreground: token("--info-foreground") },
        border: token("--border"),
        input: token("--input"),
        ring: token("--ring"),
      },
      borderRadius: {
        sm: "calc(var(--radius) - 6px)",
        DEFAULT: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 10px)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        primary: "var(--shadow-primary)",
      },
      fontSize: {
        // product-dense scale, 14px base
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
        xs: ["0.75rem", { lineHeight: "1.1rem" }],
        sm: ["0.8125rem", { lineHeight: "1.25rem" }],
        base: ["0.875rem", { lineHeight: "1.4rem" }],
        md: ["0.9375rem", { lineHeight: "1.5rem" }],
        lg: ["1.0625rem", { lineHeight: "1.6rem", letterSpacing: "-0.01em" }],
        xl: ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.015em" }],
        "2xl": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.02em" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "-0.022em" }],
        "4xl": ["2.375rem", { lineHeight: "2.6rem", letterSpacing: "-0.025em" }],
        "5xl": ["3.25rem", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
        in: "cubic-bezier(0.7, 0, 0.84, 0)",
        "in-out": "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      transitionDuration: {
        fast: "150ms",
        base: "200ms",
        moderate: "300ms",
        slow: "400ms",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        "fade-in": "fade-in 200ms cubic-bezier(0.16,1,0.3,1)",
      },
    },
  },
  plugins: [],
};
