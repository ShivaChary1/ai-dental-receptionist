import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, MapPin, ArrowUpRight } from "lucide-react";
import { staggerContainer, listItem } from "../lib/motion.js";

/** Clinic suggestions the assistant surfaces inline. Staggered so they read as
 *  "the assistant found these," in order. Indented to align under the avatar. */
export default function RecommendationCards({ recommendations }) {
  if (!recommendations?.length) return null;
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="mb-4 grid gap-2"
    >
      {recommendations.map((r) => (
        <motion.div
          key={r.id}
          variants={listItem}
          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-xs transition-shadow hover:shadow-sm"
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">{r.name}</div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 tabular">
                <Star className="h-3 w-3 fill-warning text-warning" /> {r.rating_avg}
              </span>
              {r.distance_km != null && (
                <span className="inline-flex items-center gap-0.5 tabular">
                  <MapPin className="h-3 w-3" /> {r.distance_km} km
                </span>
              )}
              {r.services?.length ? (
                <span className="truncate">· {r.services.slice(0, 2).join(", ")}</span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {r.maps_link && (
              <a
                href={r.maps_link}
                target="_blank"
                rel="noreferrer"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Open in Maps"
              >
                <ArrowUpRight className="h-4 w-4" />
              </a>
            )}
            <Link
              to={`/clinics/${r.id}`}
              className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-primary transition-colors hover:bg-primary-hover"
            >
              Book
            </Link>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
