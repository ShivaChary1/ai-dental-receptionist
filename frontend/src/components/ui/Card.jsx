import { forwardRef } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/cn.js";

/** Surface primitive. Elevation-by-surface: bg → card, soft shadow in light,
 *  layered lighter surface + hairline in dark. `interactive` adds a lift on hover. */
export const Card = forwardRef(function Card(
  { className, interactive = false, as: Comp = "div", ...props },
  ref
) {
  return (
    <Comp
      ref={ref}
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-sm",
        interactive &&
          "transition-[transform,box-shadow] duration-base ease-out hover:shadow-md hover:-translate-y-0.5",
        className
      )}
      {...props}
    />
  );
});

/** Motion-enabled card for staggered grids — pair with a staggerContainer parent. */
export const MotionCard = motion.create(Card);

export function CardHeader({ className, ...props }) {
  return <div className={cn("px-5 pt-5 pb-3", className)} {...props} />;
}
export function CardTitle({ className, ...props }) {
  return (
    <h3 className={cn("text-md font-semibold tracking-tight text-foreground", className)} {...props} />
  );
}
export function CardDescription({ className, ...props }) {
  return <p className={cn("text-sm text-muted-foreground mt-0.5", className)} {...props} />;
}
export function CardContent({ className, ...props }) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}
export function CardFooter({ className, ...props }) {
  return (
    <div className={cn("px-5 py-4 border-t border-border flex items-center gap-2", className)} {...props} />
  );
}

export default Card;
