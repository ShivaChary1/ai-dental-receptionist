import { motion } from "framer-motion";
import { EASE } from "../lib/motion.js";

/** Lightweight CSS bar chart (no charting dependency). Bars grow in with a
 *  short stagger — scaleX only, so it's GPU-cheap and reduced-motion safe. */
export default function SimpleBars({ data, labelKey, valueKey, color = "bg-primary" }) {
  if (!data?.length) return <p className="text-sm text-muted-foreground">No data yet.</p>;
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div className="space-y-1.5">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-28 truncate text-muted-foreground">{d[labelKey]}</div>
          <div className="h-4 flex-1 overflow-hidden rounded bg-muted">
            <motion.div
              className={`h-full origin-left rounded ${color}`}
              style={{ width: `${(d[valueKey] / max) * 100}%` }}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: EASE.out, delay: i * 0.04 }}
            />
          </div>
          <div className="tabular w-8 text-right text-foreground">{d[valueKey]}</div>
        </div>
      ))}
    </div>
  );
}
