import { motion } from "framer-motion";
import { pageTransition, staggerContainer } from "../../lib/motion.js";

/**
 * Wrap route content. Enter decelerates, exit accelerates. Also a stagger
 * container, so any child with `variants={listItem}` sequences in on mount.
 */
export default function PageTransition({ children, className, stagger = true }) {
  return (
    <motion.div
      variants={stagger ? staggerContainer : pageTransition}
      initial="hidden"
      animate="show"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}
