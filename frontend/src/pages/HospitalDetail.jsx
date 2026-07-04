import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ExternalLink,
  Heart,
  MapPin,
  MessageCircle,
  Star,
  Stethoscope,
} from "lucide-react";
import api from "../api/axios.js";
import { useAuth } from "../auth/AuthContext.jsx";
import PatientTopBar from "../components/PatientTopBar.jsx";
import BookingModal from "../components/BookingModal.jsx";
import ReviewsSection from "../components/ReviewsSection.jsx";
import NearbyClinics from "../components/NearbyClinics.jsx";
import { openAssistant } from "../components/assistant/AssistantWidget.jsx";
import Seo from "../components/Seo.jsx";
import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";
import Skeleton from "../components/ui/Skeleton.jsx";
import { Card } from "../components/ui/Card.jsx";
import useGeo from "../lib/useGeo.js";
import { cn } from "../lib/cn.js";
import { staggerContainer, listItem, fadeInUp } from "../lib/motion.js";

function MetaRow({ h }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
      <span className="inline-flex items-center gap-1 font-medium text-foreground tabular">
        <Star className="h-4 w-4 fill-warning text-warning" />
        {h.rating_avg?.toFixed?.(1) ?? "0.0"}
        <span className="font-normal text-muted-foreground">({h.rating_count || 0} reviews)</span>
      </span>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-medium",
          h.open_now ? "text-success" : "text-muted-foreground"
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", h.open_now ? "bg-success" : "bg-muted-foreground/50")} />
        {h.open_now ? "Open now" : "Closed"}
      </span>
      {h.distance_km != null && (
        <span className="inline-flex items-center gap-1 text-muted-foreground tabular">
          <MapPin className="h-3.5 w-3.5" /> {h.distance_km} km away
        </span>
      )}
    </div>
  );
}

function DoctorCard({ d }) {
  return (
    <motion.div variants={listItem} className="rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Stethoscope className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{d.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {d.specialization} · {d.qualification}
          </div>
        </div>
        {d.years_experience != null && (
          <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular">
            {d.years_experience} yrs
          </span>
        )}
      </div>
      {d.bio && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{d.bio}</p>}
    </motion.div>
  );
}

/** Sticky action rail: the one place to book, save, ask, or navigate. */
function BookingSidebar({ h, fav, isPatient, onBook, onToggleFav }) {
  return (
    <Card className="p-5 lg:sticky lg:top-20">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-foreground">Book a visit</span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium",
            h.open_now ? "text-success" : "text-muted-foreground"
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", h.open_now ? "bg-success" : "bg-muted-foreground/50")} />
          {h.open_now ? "Open now" : "Closed"}
        </span>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Pick a doctor and a time — confirmation is instant.
      </p>

      <Button size="lg" className="mt-4 w-full" onClick={onBook}>
        Book appointment
      </Button>
      <Button
        size="md"
        variant="secondary"
        leftIcon={MessageCircle}
        className="mt-2 w-full"
        onClick={openAssistant}
      >
        Ask the clinic
      </Button>

      <div className="mt-4 space-y-1 border-t border-border pt-4">
        {isPatient && (
          <button
            type="button"
            onClick={onToggleFav}
            aria-pressed={fav}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted",
              fav ? "text-destructive" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <motion.span
              key={fav ? "on" : "off"}
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className="flex"
            >
              <Heart className={cn("h-4 w-4", fav && "fill-current")} />
            </motion.span>
            {fav ? "Saved to favourites" : "Save clinic"}
          </button>
        )}
        {h.maps_link && (
          <a
            href={h.maps_link}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" /> Open in Google Maps
          </a>
        )}
      </div>
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="mt-2 h-4 w-2/3" />
        <Skeleton className="mt-4 h-4 w-64" />
        <div className="mt-4 flex gap-1.5">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
        <Skeleton className="mt-8 h-32 w-full rounded-xl" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export default function HospitalDetail() {
  const { id } = useParams();
  const { coords } = useGeo();
  const { isPatient } = useAuth();
  const [h, setH] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [fav, setFav] = useState(false);

  useEffect(() => {
    if (!isPatient) return;
    api.get("/api/patients/favorites")
      .then(({ data }) => setFav(data.items.some((x) => x.id === id)))
      .catch(() => {});
  }, [isPatient, id]);

  const toggleFav = async () => {
    const { data } = await api.post(`/api/patients/favorites/${id}`);
    setFav(data.favorited);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = coords ? `?lat=${coords.lat}&lng=${coords.lng}` : "";
        const { data } = await api.get(`/api/hospitals/${id}${params}`);
        setH(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, coords]);

  const refresh = () => {
    const params = coords ? `?lat=${coords.lat}&lng=${coords.lng}` : "";
    api.get(`/api/hospitals/${id}${params}`).then(({ data }) => setH(data));
  };

  return (
    <div className="flex h-full flex-col">
      {h && (
        <Seo
          title={h.name}
          description={`Book a dental appointment at ${h.name}${h.address ? `, ${h.address}` : ""}. ${(h.services || []).slice(0, 5).join(", ")}.`}
          jsonLd={{
            "@context": "https://schema.org",
            "@type": "SmileDeskst",
            name: h.name,
            address: h.address,
            ...(h.rating_count > 0 && {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: h.rating_avg?.toFixed?.(1),
                reviewCount: h.rating_count,
              },
            }),
            ...(h.location?.lat && {
              geo: { "@type": "GeoCoordinates", latitude: h.location.lat, longitude: h.location.lng },
            }),
          }}
        />
      )}
      <PatientTopBar />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <Link
            to="/clinics"
            className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All clinics
          </Link>

          {loading ? (
            <DetailSkeleton />
          ) : !h ? (
            <p className="text-sm text-muted-foreground">Clinic not found.</p>
          ) : (
            <>
              <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
                {/* Main column */}
                <motion.div variants={fadeInUp} initial="hidden" animate="show" className="min-w-0">
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground">{h.name}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">{h.address}</p>
                  <MetaRow h={h} />

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {(h.services || []).map((s) => (
                      <Badge key={s} tone="primary">{s}</Badge>
                    ))}
                  </div>

                  {/* On mobile the booking rail sits far below — surface the CTA up top. */}
                  <Button size="lg" className="mt-5 w-full sm:w-auto lg:hidden" onClick={() => setBooking(true)}>
                    Book appointment
                  </Button>

                  {h.photos?.length > 0 && (
                    <div className="-mx-1 mt-6 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
                      {h.photos.map((p, i) => (
                        <img
                          key={i}
                          src={p}
                          alt=""
                          className="h-40 shrink-0 snap-start rounded-lg border border-border object-cover"
                        />
                      ))}
                    </div>
                  )}

                  {h.description && (
                    <section className="mt-8">
                      <h2 className="mb-2 text-md font-semibold tracking-tight text-foreground">About</h2>
                      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{h.description}</p>
                    </section>
                  )}

                  {(h.doctors || []).length > 0 && (
                    <section className="mt-8">
                      <h2 className="mb-3 text-md font-semibold tracking-tight text-foreground">
                        Our doctors
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {h.doctors.length} on staff
                        </span>
                      </h2>
                      <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="show"
                        className="grid gap-3 sm:grid-cols-2"
                      >
                        {h.doctors.map((d) => <DoctorCard key={d.id} d={d} />)}
                      </motion.div>
                    </section>
                  )}

                  <ReviewsSection hospitalId={h.id} onRatingChange={refresh} />
                </motion.div>

                {/* Sticky action rail */}
                <motion.aside
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                >
                  <BookingSidebar
                    h={h}
                    fav={fav}
                    isPatient={isPatient}
                    onBook={() => setBooking(true)}
                    onToggleFav={toggleFav}
                  />
                </motion.aside>
              </div>

              <NearbyClinics excludeId={h.id} coords={coords} />
            </>
          )}
        </div>
      </div>

      {booking && h && (
        <BookingModal hospital={h} onClose={() => setBooking(false)} onBooked={() => {}} />
      )}
    </div>
  );
}
