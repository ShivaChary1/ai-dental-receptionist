import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import api from "../api/axios.js";
import HospitalCard from "./HospitalCard.jsx";
import Button from "./ui/Button.jsx";
import Skeleton from "./ui/Skeleton.jsx";
import { staggerContainer } from "../lib/motion.js";

/** Horizontal snap carousel of nearby (or top-rated, without location) clinics.
 *  Arrows scroll a page at a time on desktop; mobile swipes with snap points. */
export default function NearbyClinics({ excludeId, coords, title = "More clinics near you" }) {
  const [items, setItems] = useState(null);
  const trackRef = useRef(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sort = coords ? "nearest" : "rating";
        const params = coords ? `&lat=${coords.lat}&lng=${coords.lng}` : "";
        const { data } = await api.get(`/api/hospitals?sort=${sort}${params}`);
        if (!alive) return;
        setItems((data.items || data || []).filter((h) => h.id !== excludeId).slice(0, 8));
      } catch {
        if (alive) setItems([]);
      }
    })();
    return () => { alive = false; };
  }, [excludeId, coords]);

  const updateArrows = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanScroll({
      left: el.scrollLeft > 8,
      right: el.scrollLeft < el.scrollWidth - el.clientWidth - 8,
    });
  };
  useEffect(() => { updateArrows(); }, [items]);

  const scrollByPage = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth - 80), behavior: "smooth" });
  };

  if (items && items.length === 0) return null;

  return (
    <section aria-label={title} className="mt-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 text-md font-semibold tracking-tight text-foreground">
          <MapPin className="h-4 w-4 text-primary" /> {title}
        </h2>
        <div className="hidden gap-1.5 sm:flex">
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            onClick={() => scrollByPage(-1)}
            disabled={!canScroll.left}
            aria-label="Scroll back"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            onClick={() => scrollByPage(1)}
            disabled={!canScroll.right}
            aria-label="Scroll forward"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!items ? (
        <div className="flex gap-4 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-72 shrink-0 rounded-xl border border-border bg-card p-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="mt-2 h-3.5 w-full" />
              <div className="mt-4 flex gap-1.5">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="mt-4 h-3.5 w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          ref={trackRef}
          onScroll={updateArrows}
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px 0px" }}
          className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2"
        >
          {items.map((h) => (
            <div key={h.id} className="w-72 shrink-0 snap-start">
              <HospitalCard h={h} />
            </div>
          ))}
        </motion.div>
      )}
    </section>
  );
}
