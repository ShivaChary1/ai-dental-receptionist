import { motion } from "framer-motion";
import { ScanEye } from "lucide-react";
import Badge from "../ui/Badge.jsx";
import { EASE } from "../../lib/motion.js";
import { cn } from "../../lib/cn.js";

const CONF_TONE = { high: "success", medium: "warning", low: "neutral" };

/** Structured image-analysis findings rendered as a card under the reply. */
export default function FindingsCard({ findings }) {
  if (!findings?.findings?.length && !findings?.recommendation) return null;
  const quality = findings.image_quality || "unknown";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE.out }}
      className="mb-3 max-w-[85%] rounded-xl border border-border bg-card p-4 shadow-xs"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ScanEye className="h-4 w-4" />
          </span>
          Image analysis · {findings.image_type || "image"}
        </span>
        <Badge tone={quality === "adequate" ? "success" : "warning"}>
          {quality === "adequate" ? "Good quality" : "Limited quality"}
        </Badge>
      </div>

      {findings.findings?.length > 0 && (
        <ul className="mt-3 space-y-2">
          {findings.findings.map((f, i) => (
            <li key={i} className="flex items-start justify-between gap-3 text-sm">
              <span className="min-w-0 text-foreground">
                {f.observation}
                {f.location && <span className="text-muted-foreground"> — {f.location}</span>}
              </span>
              <Badge tone={CONF_TONE[f.confidence] || "neutral"} className="shrink-0">
                {f.confidence || "low"}
              </Badge>
            </li>
          ))}
        </ul>
      )}

      {findings.recommendation && (
        <p className="mt-3 rounded-lg bg-primary/5 px-3 py-2 text-sm text-foreground">
          <span className="font-medium">Recommendation:</span> {findings.recommendation}
        </p>
      )}
      <p className={cn("mt-3 text-2xs leading-relaxed text-muted-foreground")}>
        {findings.limitations || "A photo review can't replace an in-person dental exam."}
      </p>
    </motion.div>
  );
}
