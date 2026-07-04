import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, MapPin, ArrowRight } from "lucide-react";
import Badge from "./ui/Badge.jsx";
import { LogoMark } from "./ui/Logo.jsx";
import { listItem } from "../lib/motion.js";
import { cn } from "../lib/cn.js";

function OpenBadge({ open }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium",
        open ? "text-success" : "text-muted-foreground"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", open ? "bg-success" : "bg-muted-foreground/50")} />
      {open ? "Open now" : "Closed"}
    </span>
  );
}

function Rating({ h, className }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 text-sm font-medium text-foreground tabular", className)}>
      <Star className="h-3.5 w-3.5 fill-warning text-warning" />
      {h.rating_avg?.toFixed?.(1) ?? "0.0"}
    </span>
  );
}

/** Compact card — dense lists and carousels. */
function CompactCard({ h }) {
  return (
    <Link
      to={`/clinics/${h.id}`}
      className={cn(
        "group block rounded-xl border border-border bg-card p-4 shadow-sm",
        "transition-[transform,box-shadow,border-color] duration-base ease-out",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
          {h.name}
        </h3>
        <Rating h={h} />
      </div>
      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{h.address}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(h.services || []).slice(0, 4).map((s) => (
          <Badge key={s} tone="neutral">{s}</Badge>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        {h.distance_km != null && (
          <span className="inline-flex items-center gap-1 tabular">
            <MapPin className="h-3 w-3" /> {h.distance_km} km
          </span>
        )}
        <OpenBadge open={h.open_now} />
        <span className="ml-auto text-muted-foreground/70 tabular">{h.rating_count || 0} reviews</span>
      </div>
    </Link>
  );
}

/** Featured card — directory and favourites: photo header, larger type,
 *  explicit view-and-book affordance. */
function FeaturedCard({ h }) {
  const photo = h.photos?.[0];
  return (
    <Link
      to={`/clinics/${h.id}`}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        "transition-[transform,box-shadow,border-color] duration-base ease-out",
        "hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
      )}
    >
      {/* Visual header: photo when the clinic has one, brand placeholder otherwise */}
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-primary/12 via-muted to-info/10">
        {photo ? (
          <img
            src={photo}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-slow ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <LogoMark className="h-12 w-12 opacity-60" />
          </div>
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/85 px-2 py-0.5 text-xs font-medium text-foreground shadow-xs backdrop-blur-sm tabular">
          <Star className="h-3 w-3 fill-warning text-warning" />
          {h.rating_avg?.toFixed?.(1) ?? "0.0"}
          <span className="font-normal text-muted-foreground">({h.rating_count || 0})</span>
        </span>
        {h.distance_km != null && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/85 px-2 py-0.5 text-xs font-medium text-foreground shadow-xs backdrop-blur-sm tabular">
            <MapPin className="h-3 w-3 text-primary" /> {h.distance_km} km
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-md font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
            {h.name}
          </h3>
        </div>
        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{h.address}</p>

        <div className="mb-4 mt-3 flex flex-wrap gap-1.5">
          {(h.services || []).slice(0, 4).map((s) => (
            <Badge key={s} tone="neutral">{s}</Badge>
          ))}
          {(h.services || []).length > 4 && (
            <Badge tone="outline">+{h.services.length - 4}</Badge>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs">
          <OpenBadge open={h.open_now} />
          <span className="inline-flex items-center gap-1 font-medium text-primary transition-transform duration-base ease-out group-hover:translate-x-0.5">
            View & book <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function HospitalCard({ h, variant = "compact" }) {
  return (
    <motion.div variants={listItem} className="h-full">
      {variant === "featured" ? <FeaturedCard h={h} /> : <CompactCard h={h} />}
    </motion.div>
  );
}
