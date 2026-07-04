import { motion } from "framer-motion";
import { cn } from "../../lib/cn.js";
import { DURATION, EASE } from "../../lib/motion.js";
import LottieFx from "./LottieFx.jsx";

/** Considered empty state — illustrative Lottie or icon-in-disc, tight copy, one action. */
export default function EmptyState({ icon: Icon, lottie, title, description, action, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.moderate, ease: EASE.out }}
      className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}
    >
      {lottie ? (
        <LottieFx animationData={lottie} size={140} className="mb-2" />
      ) : Icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
      ) : null}
      <h3 className="text-md font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
