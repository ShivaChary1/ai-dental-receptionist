import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Star, MapPin } from "lucide-react";

/** Brand pin as a divIcon — avoids Leaflet's bundler-hostile default marker PNGs. */
const pinIcon = L.divIcon({
  className: "",
  iconSize: [34, 34],
  iconAnchor: [17, 32],
  popupAnchor: [0, -30],
  html: `
    <div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;">
      <svg viewBox="0 0 24 24" width="34" height="34" style="filter:drop-shadow(0 2px 4px rgb(0 0 0 / .35))">
        <path d="M12 2a7 7 0 0 0-7 7c0 4.9 5.4 10.6 6.6 11.8a.6.6 0 0 0 .8 0C13.6 19.6 19 13.9 19 9a7 7 0 0 0-7-7Z" fill="#0FA6A0"/>
        <circle cx="12" cy="9" r="2.8" fill="white"/>
      </svg>
    </div>`,
});

/** Pulsing dot for the visitor's own location. */
const youIcon = L.divIcon({
  className: "",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: `
    <div style="position:relative;width:18px;height:18px;">
      <div style="position:absolute;inset:0;border-radius:9999px;background:rgb(59 130 246 / .35);animation:ping 1.8s cubic-bezier(0,0,.2,1) infinite;"></div>
      <div style="position:absolute;inset:4px;border-radius:9999px;background:#3b82f6;border:2px solid white;box-shadow:0 1px 3px rgb(0 0 0 / .3);"></div>
    </div>`,
});

const DEFAULT_CENTER = [20.5937, 78.9629]; // India centroid

/** Fit the viewport around all markers whenever the result set changes. */
function FitBounds({ points }) {
  const map = useMap();
  const key = JSON.stringify(points);
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 14 });
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Map view of the clinic directory: one pin per located clinic, with a
 *  booking-ready popup. Clinics without a saved location can't be pinned. */
export default function ClinicsMap({ items, coords }) {
  const located = useMemo(
    () => items.filter((h) => h.location?.lat != null && h.location?.lng != null),
    [items]
  );
  const points = useMemo(() => {
    const pts = located.map((h) => [h.location.lat, h.location.lng]);
    if (coords) pts.push([coords.lat, coords.lng]);
    return pts;
  }, [located, coords]);

  const missing = items.length - located.length;

  return (
    <div className="overflow-hidden rounded-xl border border-border shadow-sm">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={4}
        scrollWheelZoom
        style={{ height: "clamp(380px, 62vh, 640px)", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {coords && <Marker position={[coords.lat, coords.lng]} icon={youIcon} interactive={false} />}
        {located.map((h) => (
          <Marker key={h.id} position={[h.location.lat, h.location.lng]} icon={pinIcon}>
            <Popup minWidth={210}>
              <div style={{ fontFamily: "inherit" }}>
                <div className="text-sm font-semibold text-foreground">{h.name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
                  {h.rating_avg != null && (
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3 fill-warning text-warning" />
                      {Number(h.rating_avg).toFixed(1)}
                    </span>
                  )}
                  {h.distance_km != null && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {h.distance_km.toFixed(1)} km
                    </span>
                  )}
                  {h.open_now != null && (
                    <span className={h.open_now ? "font-medium text-success" : "text-muted-foreground"}>
                      {h.open_now ? "Open now" : "Closed"}
                    </span>
                  )}
                </div>
                {h.address && (
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{h.address}</div>
                )}
                <Link
                  to={`/clinics/${h.id}`}
                  className="mt-2 inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                  style={{ color: "white", textDecoration: "none" }}
                >
                  View &amp; book
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {missing > 0 && (
        <div className="border-t border-border bg-card px-3 py-2 text-2xs text-muted-foreground">
          {missing} clinic{missing === 1 ? "" : "s"} without a map location {missing === 1 ? "is" : "are"} only shown in the list view.
        </div>
      )}
    </div>
  );
}
