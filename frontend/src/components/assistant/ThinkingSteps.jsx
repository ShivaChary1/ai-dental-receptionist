import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { EASE } from "../../lib/motion.js";

/** Friendly labels for the graph's nodes, in the order they run. */
export const STEP_META = {
  classify: { label: "Understanding your question" },
  red_flag_check: { label: "Checking for warning signs" },
  retrieve: { label: "Searching dental sources" },
  rerank: { label: "Ranking the best sources" },
  validate_image: { label: "Checking the image" },
  vision_analyze: { label: "Analyzing the image" },
  extract_document: { label: "Reading the document" },
  synthesize: { label: "Writing your answer" },
  safety_check: { label: "Safety review" },
  emergency_response: { label: "Preparing emergency guidance" },
  redirect: { label: "Redirecting" },
};

/** What's happening next, once a given step has completed. */
const NEXT_AFTER = {
  classify: "Working through it",
  red_flag_check: "Assessing what you described",
  retrieve: "Ranking the best sources",
  rerank: "Writing your answer",
  validate_image: "Analyzing the image",
  vision_analyze: "Summarising findings",
  extract_document: "Reading through the report",
  synthesize: "Safety review",
};

/** Perplexity-style progress: a quiet timeline that fills in as the agent
 *  works — completed steps as small filled dots on a rail, the current one
 *  pulsing beneath them. */
export default function ThinkingSteps({ steps }) {
  const shown = steps.filter((s) => STEP_META[s]);
  const current = NEXT_AFTER[shown[shown.length - 1]] || "Working on it";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ duration: 0.25, ease: EASE.out }}
      className="mb-6"
    >
      <div className="relative min-w-[230px] pt-1">
        {/* Rail connecting the dots */}
        <span aria-hidden className="absolute bottom-2 left-[5px] top-2 w-px bg-border" />

        <ol className="space-y-2.5">
          <AnimatePresence initial={false}>
            {shown.map((node) => (
              <motion.li
                key={node}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: EASE.out }}
                className="relative flex items-center gap-3 pl-0"
              >
                <span className="relative z-10 flex h-[11px] w-[11px] shrink-0 items-center justify-center rounded-full bg-primary ring-4 ring-background">
                  <Check className="h-2 w-2 text-primary-foreground" strokeWidth={3.5} />
                </span>
                <span className="text-xs text-muted-foreground">{STEP_META[node].label}</span>
              </motion.li>
            ))}
          </AnimatePresence>

          {/* Current step: hollow pulsing dot + shimmer label */}
          <motion.li
            key={`current-${shown.length}`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: EASE.out }}
            className="relative flex items-center gap-3"
          >
            <span className="relative z-10 flex h-[11px] w-[11px] shrink-0">
              <span
                aria-hidden
                className="absolute -inset-1 animate-ping rounded-full bg-primary/30 motion-reduce:animate-none"
                style={{ animationDuration: "1.6s" }}
              />
              <span className="relative h-[11px] w-[11px] rounded-full border-2 border-primary bg-background ring-4 ring-background" />
            </span>
            <span className="thinking-shimmer text-xs font-medium">{current}…</span>
          </motion.li>
        </ol>
      </div>
    </motion.div>
  );
}

/** Compact trace of completed steps, shown above a finished answer. */
export function StepsTrace({ steps }) {
  const shown = (steps || []).filter((s) => STEP_META[s] && s !== "safety_check");
  if (shown.length < 2) return null;
  return (
    <div className="mb-1.5 flex flex-wrap items-center gap-x-1 gap-y-1 text-2xs text-muted-foreground">
      {shown.map((node, i) => (
        <span key={node} className="inline-flex items-center gap-1">
          {i > 0 && <span className="mx-0.5 opacity-40">›</span>}
          <Check className="h-2.5 w-2.5 text-success" />
          {STEP_META[node].label}
        </span>
      ))}
    </div>
  );
}
