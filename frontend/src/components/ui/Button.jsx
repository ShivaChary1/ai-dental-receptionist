import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn.js";

/**
 * One primary (filled) action per view. `secondary` for the supporting move,
 * `ghost`/`link` for tertiary. Press scale + hover fill are the only motion —
 * crisp, 120–180ms, transform/opacity only.
 */
const VARIANTS = {
  primary:
    "bg-primary text-primary-foreground shadow-primary hover:bg-primary-hover",
  secondary:
    "bg-card text-foreground border border-border hover:bg-muted",
  ghost:
    "text-muted-foreground hover:bg-muted hover:text-foreground",
  destructive:
    "bg-destructive text-destructive-foreground hover:opacity-90",
  link:
    "text-primary underline-offset-4 hover:underline px-0 h-auto shadow-none",
};

const SIZES = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded",
  md: "h-9 px-4 text-sm gap-2 rounded-md",
  lg: "h-11 px-5 text-md gap-2 rounded-lg",
  icon: "h-9 w-9 rounded-md",
};

const Button = forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    className,
    children,
    loading = false,
    disabled,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    type = "button",
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading;
  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={isDisabled}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "inline-flex items-center justify-center font-medium whitespace-nowrap select-none",
        "transition-colors duration-fast ease-out",
        "focus-visible:outline-none disabled:pointer-events-none disabled:opacity-55",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        LeftIcon && <LeftIcon className={cn(size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")} aria-hidden />
      )}
      {children}
      {!loading && RightIcon && (
        <RightIcon className={cn(size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")} aria-hidden />
      )}
    </motion.button>
  );
});

export default Button;
