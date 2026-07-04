import { cn } from "../../lib/cn.js";

const SIZES = { sm: "h-7 w-7 text-2xs", md: "h-9 w-9 text-xs", lg: "h-11 w-11 text-sm" };

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

/** Initials avatar with a stable per-name tint. No external image dependency. */
export default function Avatar({ name, size = "md", className }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-primary/12 font-semibold text-primary",
        SIZES[size],
        className
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
