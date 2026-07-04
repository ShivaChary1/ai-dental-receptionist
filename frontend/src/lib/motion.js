/* ─────────────────────────────────────────────────────────────────────────
   Motion presets — import these instead of re-declaring per component so
   timing/easing stay consistent. Mirrors the CSS motion tokens in index.css.
   Framer Motion. Gate globally with <MotionConfig reducedMotion="user">.
   ───────────────────────────────────────────────────────────────────────── */
import { useReducedMotion } from "framer-motion";

/** Seconds. fast=micro · base=standard UI · moderate=entrance · slow=page. */
export const DURATION = { fast: 0.15, base: 0.2, moderate: 0.3, slow: 0.4 };

/** out=enters (decelerate) · in=exits (accelerate) · inOut=on-screen moves. */
export const EASE = {
  out: [0.16, 1, 0.3, 1],
  in: [0.7, 0, 0.84, 0],
  inOut: [0.65, 0, 0.35, 1],
};

/** Springs for direct manipulation (drag/toggle/press). */
export const SPRING = {
  soft: { type: "spring", stiffness: 260, damping: 30 },
  snappy: { type: "spring", stiffness: 420, damping: 34 },
};

/** Fade + rise. Workhorse entrance for cards, sections, content blocks. */
export const fadeInUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.moderate, ease: EASE.out } },
};

/** Parent that staggers its children. 45ms reads as sequence without stalling. */
export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.04 } },
};

/** Child for staggered lists/grids. Pair with staggerContainer on the parent. */
export const listItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.moderate, ease: EASE.out } },
};

/** Route/page transition. Enter decelerates, exit accelerates and is brief. */
export const pageTransition = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.moderate, ease: EASE.out } },
  exit: { opacity: 0, y: 4, transition: { duration: DURATION.fast, ease: EASE.in } },
};

/** Overlay/panel presence (dropdowns, popovers, dialogs) — inside <AnimatePresence>. */
export const overlayPanel = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: DURATION.base, ease: EASE.out } },
  exit: { opacity: 0, y: 6, scale: 0.98, transition: { duration: DURATION.fast, ease: EASE.in } },
};

/** Backdrop fade for modals. */
export const backdrop = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DURATION.base } },
  exit: { opacity: 0, transition: { duration: DURATION.fast } },
};

/**
 * Reduced-motion-safe variants: strips movement (x/y/scale), keeps opacity,
 * so animations still acknowledge the change without moving anything.
 */
export function useReducedVariants(variants) {
  const reduce = useReducedMotion();
  if (!reduce) return variants;
  const stripped = {};
  for (const key of Object.keys(variants)) {
    const state = variants[key];
    if (state && typeof state === "object") {
      const { y, x, scale, ...rest } = state;
      stripped[key] = { ...rest, transition: { duration: DURATION.fast } };
    } else {
      stripped[key] = state;
    }
  }
  return stripped;
}
