import { cn } from "../../lib/cn.js";

/** Quiet, tinted status pills — color is a signal, not decoration. */
const TONES = {
  neutral: "bg-muted text-muted-foreground border-transparent",
  primary: "bg-primary/10 text-primary border-primary/15",
  success: "bg-success/12 text-success border-success/20",
  warning: "bg-warning/15 text-warning-foreground border-warning/25 dark:text-warning",
  destructive: "bg-destructive/12 text-destructive border-destructive/20",
  info: "bg-info/12 text-info border-info/20",
  outline: "bg-transparent text-foreground border-border",
};

export default function Badge({ tone = "neutral", dot = false, className, children, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-2xs font-medium",
        TONES[tone],
        className
      )}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
