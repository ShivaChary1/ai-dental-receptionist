import { cn } from "../../lib/cn.js";

/** Layout-matched shimmer. GPU-only (transform). Reserve spinners for
 *  short indeterminate button actions — never for content loads. */
export default function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        "shimmer relative overflow-hidden rounded-md bg-muted",
        className
      )}
      aria-hidden
      {...props}
    />
  );
}

/** A card-shaped skeleton mirroring the Stat / list card layout. */
export function SkeletonStat() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="mt-3 h-8 w-16" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="h-5 w-14 rounded-full" />
    </div>
  );
}
