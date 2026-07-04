import { motion } from "framer-motion";
import { AlertTriangle, Clock3, Info, Leaf, PhoneCall } from "lucide-react";
import { EASE } from "../../lib/motion.js";
import { cn } from "../../lib/cn.js";

const LEVELS = {
  emergency: {
    icon: PhoneCall,
    label: "Seek care now",
    detail: "This needs immediate attention — contact an emergency dentist or ER right away.",
    classes: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  urgent: {
    icon: AlertTriangle,
    label: "See a dentist within 24–48 hours",
    detail: "Don't wait this one out — book as soon as you can.",
    classes: "border-warning/40 bg-warning/10 text-warning",
  },
  routine: {
    icon: Clock3,
    label: "Book a routine visit",
    detail: "Not time-critical, but a dentist should take a look.",
    classes: "border-info/40 bg-info/10 text-info",
  },
  selfcare: {
    icon: Leaf,
    label: "Manageable at home",
    detail: "Follow the guidance below and watch for changes.",
    classes: "border-success/40 bg-success/10 text-success",
  },
};

/** Structured triage verdict rendered above the assistant's reply. */
export default function UrgencyBanner({ urgency }) {
  const cfg = LEVELS[urgency?.level];
  if (!cfg) return null;
  const Icon = cfg.icon || Info;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE.out }}
      className={cn(
        "mb-2 flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5",
        cfg.classes
      )}
      role={urgency.level === "emergency" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 text-sm leading-snug">
        <span className="font-semibold">{cfg.label}</span>
        <span className="mx-1.5 opacity-50">·</span>
        <span className="opacity-90">{urgency.reason || cfg.detail}</span>
      </div>
    </motion.div>
  );
}
