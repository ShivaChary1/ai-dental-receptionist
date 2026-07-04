import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Crosshair, Loader2, MapPin, Search } from "lucide-react";
import { Input } from "./ui/Input.jsx";
import Button from "./ui/Button.jsx";
import { EASE } from "../lib/motion.js";
import { cn } from "../lib/cn.js";

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }; // India centroid until a point is chosen

/** Brand pin as a divIcon — avoids Leaflet's bundler-hostile default marker PNGs. */
const pinIcon = L.divIcon({
  className: "",
  iconSize: [34, 34],
  iconAnchor: [17, 32],
  html: `
    <div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;">
      <svg viewBox="0 0 24 24" width="34" height="34" style="filter:drop-shadow(0 2px 4px rgb(0 0 0 / .35))">
        <path d="M12 2a7 7 0 0 0-7 7c0 4.9 5.4 10.6 6.6 11.8a.6.6 0 0 0 .8 0C13.6 19.6 19 13.9 19 9a7 7 0 0 0-7-7Z" fill="#0FA6A0"/>
        <circle cx="12" cy="9" r="2.8" fill="white"/>
      </svg>
    </div>`,
});

/** Fly the map when the chosen point changes (search / locate-me). */
function Recenter({ point }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), 15), { duration: 0.8 });
  }, [point?.lat, point?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function ClickToPlace({ onPick }) {
  useMapEvents({
    click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }),
  });
  return null;
}

/** Location picker: search an address (OpenStreetMap Nominatim, keyless),
 *  use the device's location, or click/drag the pin — no coordinates asked. */
export default function LocationPicker({ value, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef(null);

  const point = value?.lat && value?.lng ? { lat: Number(value.lat), lng: Number(value.lng) } : null;

  const pick = (p, label) => {
    setResults([]);
    setError("");
    if (label) setQuery(label);
    onChange({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) });
  };

  // Debounced address search against Nominatim.
  useEffect(() => {
    clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`,
          { headers: { Accept: "application/json" } }
        );
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const locateMe = () => {
    setError("");
    if (!navigator.geolocation) {
      setError("Location isn't available in this browser — search your address instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        pick({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocating(false);
        setError("Couldn't get your location — search your address instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div>
      {/* Search + locate */}
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Input
            leftIcon={Search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            placeholder="Search your clinic's address…"
            aria-label="Search address"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
          <AnimatePresence>
            {results.length > 0 && (
              <motion.ul
                initial={{ opacity: 0, y: 6, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, transition: { duration: 0.12 } }}
                transition={{ duration: 0.2, ease: EASE.out }}
                className="absolute z-[1000] mt-1.5 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
              >
                {results.map((r) => (
                  <li key={r.place_id}>
                    <button
                      type="button"
                      onClick={() => pick({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) }, r.display_name)}
                      className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="line-clamp-2">{r.display_name}</span>
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
        <Button
          type="button"
          variant="secondary"
          leftIcon={locating ? undefined : Crosshair}
          loading={locating}
          onClick={locateMe}
          className="shrink-0"
        >
          <span className="hidden sm:inline">Use my location</span>
          <span className="sm:hidden">Locate</span>
        </Button>
      </div>

      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}

      {/* Map: click to place, drag to fine-tune */}
      <div className="relative mt-3 overflow-hidden rounded-xl border border-border">
        <MapContainer
          center={point ? [point.lat, point.lng] : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
          zoom={point ? 15 : 4}
          scrollWheelZoom={false}
          style={{ height: 260, width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToPlace onPick={pick} />
          <Recenter point={point} />
          {point && (
            <Marker
              position={[point.lat, point.lng]}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const p = e.target.getLatLng();
                  pick({ lat: p.lat, lng: p.lng });
                },
              }}
            />
          )}
        </MapContainer>
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 z-[500] px-3 py-2 text-2xs",
            "bg-gradient-to-t from-background/90 to-transparent"
          )}
        >
          {point ? (
            <span className="inline-flex items-center gap-1 font-medium text-success">
              <Check className="h-3 w-3" /> Pin set — drag it to fine-tune the entrance
            </span>
          ) : (
            <span className="font-medium text-foreground/80">
              Search, use your location, or click the map to drop a pin
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
