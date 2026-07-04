import { motion } from "framer-motion";
import { cn } from "../../lib/cn.js";
import { listItem } from "../../lib/motion.js";

/**
 * KPI tile. Tabular numerals so columns of metrics never shimmy. Optional
 * delta with directional tone. Renders as a stagger child by default.
 */
export default function Stat({
  label,
  value,
  icon: Icon,
  delta,
  deltaTone = "neutral",
  hint,
  className,
}) {
  const deltaColor =
    deltaTone === "up"
      ? "text-success"
      : deltaTone === "down"
      ? "text-destructive"
      : "text-muted-foreground";

  return (
    <motion.div
      variants={listItem}
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {Icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span className="tabular text-3xl font-semibold tracking-tight text-foreground">
          {value}
        </span>
        {delta != null && (
          <span className={cn("tabular pb-1 text-xs font-medium", deltaColor)}>{delta}</span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </motion.div>
  );
}
