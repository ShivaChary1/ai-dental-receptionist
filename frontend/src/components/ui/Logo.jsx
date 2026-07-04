import { cn } from "../../lib/cn.js";

/**
 * SmileDesk mark — a smile arc under an AI spark, in the brand teal.
 * Inline SVG so it inherits currentColor and needs no asset pipeline.
 */
export function LogoMark({ className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-primary",
        className
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-[62%] w-[62%]" aria-hidden>
        <path
          d="M12 3.4l1.2 2.6 2.6 1.2-2.6 1.2L12 11l-1.2-2.6-2.6-1.2 2.6-1.2Z"
          fill="currentColor"
        />
        <path
          d="M5.8 14c1.6 2.9 3.8 4.3 6.2 4.3s4.6-1.4 6.2-4.3"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export default function Logo({ className, wordmark = true, subtitle }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="h-8 w-8" />
      {wordmark && (
        <div className="leading-none">
          <span className="text-md font-semibold tracking-tight text-foreground">SmileDesk</span>
          {subtitle && (
            <span className="mt-0.5 block text-2xs font-medium uppercase tracking-wider text-muted-foreground">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
