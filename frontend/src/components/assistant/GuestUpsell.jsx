import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import Button from "../ui/Button.jsx";
import { EASE } from "../../lib/motion.js";

/** Shown when a guest hits the free-message cap — the sign-up ask lands at the
 *  moment of proven value, inside the conversation, not as a wall before it. */
export default function GuestUpsell() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: EASE.out }}
      className="mx-1 mt-3 rounded-xl border border-primary/25 bg-primary/5 p-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            Create a free account to keep chatting
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Your conversation carries over — plus you can book appointments,
            save clinics, and pick up any chat where you left off.
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Link to="/register" className="flex-1">
          <Button size="sm" className="w-full">Create account</Button>
        </Link>
        <Link to="/login" className="flex-1">
          <Button size="sm" variant="secondary" className="w-full">Sign in</Button>
        </Link>
      </div>
    </motion.div>
  );
}
