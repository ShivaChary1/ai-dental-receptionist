import { Suspense, lazy, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LayoutGrid, Map as MapIcon, Search, MapPin } from "lucide-react";
import api from "../api/axios.js";
import PatientTopBar from "../components/PatientTopBar.jsx";
import HospitalCard from "../components/HospitalCard.jsx";
import Seo from "../components/Seo.jsx";
import { Input } from "../components/ui/Input.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Skeleton from "../components/ui/Skeleton.jsx";
import useGeo from "../lib/useGeo.js";
import { cn } from "../lib/cn.js";
import { staggerContainer } from "../lib/motion.js";
import searchAnim from "../assets/lottie/search.json";

const SORTS = [
  { key: "rating", label: "Highest rated" },
  { key: "nearest", label: "Nearest", needsGeo: true },
];

const VIEWS = [
  { key: "list", label: "List", icon: LayoutGrid },
  { key: "map", label: "Map", icon: MapIcon },
];

// Leaflet only loads if someone actually opens the map view.
const ClinicsMap = lazy(() => import("../components/ClinicsMap.jsx"));

export default function Directory() {
  const { coords, status, request } = useGeo();
  const [sort, setSort] = useState("rating");
  const [view, setView] = useState("list");
  const [openNow, setOpenNow] = useState(false);
  const [service, setService] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort });
      if (coords) {
        params.set("lat", coords.lat);
        params.set("lng", coords.lng);
      }
      if (openNow) params.set("open_now", "true");
      if (service.trim()) params.set("service", service.trim());
      const { data } = await api.get(`/api/hospitals?${params}`);
      setItems(data.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [sort, openNow, coords]);

  return (
    <div className="flex h-full flex-col">
      <Seo
        title="Find a dental clinic near you"
        description="Browse verified dental clinics — compare ratings, distance, and services, then book instantly."
      />
      <PatientTopBar />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Find a clinic</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Approved dental clinics{coords ? " near you" : ""}, ready to book.
            </p>
          </motion.div>

          {/* Controls */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {/* Segmented sort */}
            <div className="inline-flex rounded-lg border border-border bg-muted/60 p-0.5">
              {SORTS.map((s) => {
                const active = sort === s.key;
                const disabled = s.needsGeo && !coords;
                return (
                  <button
                    key={s.key}
                    onClick={() => !disabled && setSort(s.key)}
                    disabled={disabled}
                    className={cn(
                      "relative rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40",
                      active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="dirSort"
                        className="absolute inset-0 rounded-md bg-primary shadow-primary"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative">{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* List / map view toggle */}
            <div className="inline-flex rounded-lg border border-border bg-muted/60 p-0.5">
              {VIEWS.map((v) => {
                const active = view === v.key;
                return (
                  <button
                    key={v.key}
                    onClick={() => setView(v.key)}
                    className={cn(
                      "relative rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="dirView"
                        className="absolute inset-0 rounded-md bg-primary shadow-primary"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative inline-flex items-center gap-1.5">
                      <v.icon className="h-3.5 w-3.5" /> {v.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <span className="relative inline-flex">
                <input
                  type="checkbox"
                  checked={openNow}
                  onChange={(e) => setOpenNow(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="h-5 w-9 rounded-full bg-input transition-colors peer-checked:bg-primary" />
                <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-card shadow-sm transition-transform peer-checked:translate-x-4" />
              </span>
              Open now
            </label>

            <div className="ml-auto w-full sm:w-56">
              <Input
                leftIcon={Search}
                value={service}
                onChange={(e) => setService(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
                placeholder="Filter by service…"
              />
            </div>
          </div>

          {status !== "ok" && (
            <button
              onClick={request}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-opacity hover:opacity-80"
            >
              <MapPin className="h-4 w-4" />
              {status === "locating" ? "Locating…" : "Use my location for distance & nearest sort"}
            </button>
          )}

          {/* Results */}
          <div className="mt-6">
            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                    <Skeleton className="h-40 w-full rounded-none" />
                    <div className="p-5">
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="mt-2 h-3.5 w-1/2" />
                      <div className="mt-3 flex gap-1.5">
                        <Skeleton className="h-5 w-14 rounded-full" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      <Skeleton className="mt-4 h-3.5 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                lottie={searchAnim}
                title="No clinics match your filters"
                description="Try clearing the service filter or turning off “Open now.”"
              />
            ) : view === "map" ? (
              <Suspense fallback={<Skeleton className="h-[380px] w-full rounded-xl" />}>
                <ClinicsMap items={items} coords={coords} />
              </Suspense>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
              >
                {items.map((h) => (
                  <HospitalCard key={h.id} h={h} variant="featured" />
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
