import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Clock,
  Plus,
  ShieldCheck,
  Stethoscope,
  Trash2,
  Upload,
} from "lucide-react";
import api from "../api/axios.js";
import Logo from "../components/ui/Logo.jsx";
import ThemeToggle from "../components/ui/ThemeToggle.jsx";
import Button from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Field, Input, Textarea, Select } from "../components/ui/Input.jsx";
import LottieFx from "../components/ui/LottieFx.jsx";
import LocationPicker from "../components/LocationPicker.jsx";
import doctorAnim from "../assets/lottie/doctor.json";
import successAnim from "../assets/lottie/success.json";
import { celebrate } from "../lib/confetti.js";
import { DURATION, EASE } from "../lib/motion.js";
import { cn } from "../lib/cn.js";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const emptyDoctor = { name: "", qualification: "", years_experience: "", specialization: "", bio: "", email: "", calendar_ical_url: "" };

const STEPS = [
  { key: "basics", title: "Clinic basics", blurb: "Who you are and how to reach you", icon: Building2 },
  { key: "hours", title: "Hours & services", blurb: "When you're open, what you offer", icon: Clock },
  { key: "doctors", title: "Doctors", blurb: "The team patients will book", icon: Stethoscope },
  { key: "verify", title: "Verification & booking", blurb: "Licence, media, and how bookings flow", icon: ShieldCheck },
];

/** Vertical stepper for the sticky rail. Completed steps are clickable. */
function Stepper({ current, onJump }) {
  return (
    <ol className="relative">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const Icon = s.icon;
        return (
          <li key={s.key} className="relative pb-7 last:pb-0">
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[17px] top-9 h-[calc(100%-2.25rem)] w-px",
                  done ? "bg-primary/50" : "bg-border"
                )}
              />
            )}
            <button
              type="button"
              onClick={() => done && onJump(i)}
              disabled={!done}
              className={cn("group flex w-full items-start gap-3 text-left", done && "cursor-pointer")}
            >
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                {active && (
                  <motion.span
                    layoutId="applyStep"
                    className="absolute inset-0 rounded-xl border-2 border-primary bg-primary/10"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span
                  className={cn(
                    "relative flex h-9 w-9 items-center justify-center rounded-xl text-sm",
                    done
                      ? "bg-primary text-primary-foreground shadow-primary"
                      : active
                        ? "text-primary"
                        : "border border-border bg-card text-muted-foreground"
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
              </span>
              <span className="min-w-0 pt-0.5 leading-tight">
                <span
                  className={cn(
                    "block text-sm font-semibold",
                    active ? "text-foreground" : done ? "text-foreground/80 group-hover:text-primary" : "text-muted-foreground"
                  )}
                >
                  {s.title}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{s.blurb}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export default function ApplyClinic() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [f, setF] = useState({
    clinic_name: "", description: "", address: "", lat: "", lng: "", maps_link: "",
    phone: "", email: "", poc_name: "",
    services: "", insurance_accepted: "",
    registration_number: "", license_document: "",
    booking_mode: "internal", endpoint_url: "", auth_type: "none", credentials: "",
  });
  const [hours, setHours] = useState(
    Object.fromEntries(DAYS.map((d) => [d, d === "sun" ? "closed" : "09:00-18:00"]))
  );
  const [doctors, setDoctors] = useState([{ ...emptyDoctor }]);
  const [photos, setPhotos] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const uploadFile = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await api.post("/api/uploads", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.url;
  };

  const onLicense = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file);
    setF((s) => ({ ...s, license_document: url }));
  };
  const onPhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    const urls = [];
    for (const file of files) urls.push(await uploadFile(file));
    setPhotos((p) => [...p, ...urls]);
  };

  const setDoctor = (i, k) => (e) =>
    setDoctors((ds) => ds.map((d, j) => (j === i ? { ...d, [k]: e.target.value } : d)));

  const goTo = (i) => {
    setDirection(i > step ? 1 : -1);
    setStep(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    setStatus(null);
    setLoading(true);
    try {
      const payload = {
        clinic_name: f.clinic_name,
        description: f.description || null,
        address: f.address,
        location: f.lat && f.lng ? { lat: parseFloat(f.lat), lng: parseFloat(f.lng) } : null,
        maps_link: f.maps_link || null,
        contact: { phone: f.phone, email: f.email, poc_name: f.poc_name },
        hours,
        services: f.services.split(",").map((s) => s.trim()).filter(Boolean),
        insurance_accepted: f.insurance_accepted.split(",").map((s) => s.trim()).filter(Boolean),
        doctors: doctors
          .filter((d) => d.name.trim())
          .map((d) => ({
            name: d.name,
            qualification: d.qualification || null,
            years_experience: d.years_experience ? parseInt(d.years_experience, 10) : null,
            specialization: d.specialization || null,
            bio: d.bio || null,
            email: d.email || null,
            calendar_ical_url: d.calendar_ical_url || null,
          })),
        photos,
        booking_config: {
          mode: f.booking_mode,
          endpoint_url: f.endpoint_url || null,
          auth_type: f.auth_type || null,
          credentials: f.credentials || null,
        },
        registration_number: f.registration_number || null,
        license_document: f.license_document || null,
      };
      await api.post("/api/apply", payload);
      setStatus("ok");
      celebrate();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setStatus(err?.response?.data?.detail || "Submission failed. Check required fields.");
    } finally {
      setLoading(false);
    }
  };

  // Each step is its own <form>; Continue is a submit so native `required`
  // validation gates progression without any custom validator code.
  const onStepSubmit = (e) => {
    e.preventDefault();
    if (step < STEPS.length - 1) {
      goTo(step + 1);
    } else {
      submit();
    }
  };

  if (status === "ok") {
    return (
      <div className="flex min-h-full items-center justify-center bg-background p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE.out }}
          className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-lg"
        >
          <LottieFx animationData={successAnim} loop={false} size={150} className="mx-auto -my-5" />
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Application submitted</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Thanks! Our team will review your clinic and email you once it's approved.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-opacity hover:opacity-80"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </motion.div>
      </div>
    );
  }

  const fileNote = "text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-subtle";
  const active = STEPS[step];

  return (
    <div className="min-h-full bg-background">
      <header className="sticky top-0 z-30 flex items-center border-b border-border bg-background/80 px-5 py-2.5 backdrop-blur-md">
        <Link to="/"><Logo wordmark /></Link>
        <ThemeToggle className="ml-auto" />
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.moderate, ease: EASE.out }}
          className="mb-8"
        >
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">List your clinic on SmileDesk</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Join the network so patients can find, chat with, and book your clinic 24/7.
          </p>
        </motion.div>

        {/* Mobile progress: bar + step label */}
        <div className="mb-6 lg:hidden">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-semibold text-foreground">
              Step {step + 1} of {STEPS.length} — {active.title}
            </span>
            <span className="tabular text-muted-foreground">
              {Math.round(((step + 1) / STEPS.length) * 100)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              animate={{ scaleX: (step + 1) / STEPS.length }}
              initial={false}
              transition={{ duration: DURATION.moderate, ease: EASE.out }}
              className="h-full origin-left rounded-full bg-primary"
            />
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
          {/* Sticky stepper rail */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <Stepper current={step} onJump={goTo} />
              <div className="mt-10 rounded-xl border border-border bg-card/60 p-4 text-center">
                <LottieFx animationData={doctorAnim} size={170} className="mx-auto -my-2" />
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Applications are licence-checked and reviewed within{" "}
                  <span className="font-medium text-foreground">2 business days</span>.
                </p>
              </div>
            </div>
          </aside>

          {/* Step panel */}
          <div className="min-w-0">
            {typeof status === "string" && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{status}</span>
              </div>
            )}

            <AnimatePresence mode="wait" initial={false}>
              <motion.form
                key={step}
                onSubmit={onStepSubmit}
                initial={{ opacity: 0, x: direction * 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -20, transition: { duration: 0.15, ease: EASE.in } }}
                transition={{ duration: DURATION.moderate, ease: EASE.out }}
              >
                <Card className="p-6">
                  <div className="mb-5">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">{active.title}</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">{active.blurb}</p>
                  </div>

                  {step === 0 && (
                    <>
                      <div className="grid gap-x-4 sm:grid-cols-2">
                        <Field label="Clinic name *"><Input value={f.clinic_name} onChange={set("clinic_name")} required /></Field>
                        <Field label="Point of contact name *"><Input value={f.poc_name} onChange={set("poc_name")} required /></Field>
                        <Field label="Contact phone *"><Input value={f.phone} onChange={set("phone")} required /></Field>
                        <Field label="Contact email *" hint="This becomes your clinic login.">
                          <Input type="email" value={f.email} onChange={set("email")} required />
                        </Field>
                      </div>
                      <Field label="Description"><Textarea value={f.description} onChange={set("description")} rows={3} /></Field>
                      <Field label="Address *"><Input value={f.address} onChange={set("address")} required /></Field>
                      <Field
                        label="Pin your clinic on the map"
                        hint="Patients see distance and directions from this pin."
                      >
                        <LocationPicker
                          value={f.lat && f.lng ? { lat: f.lat, lng: f.lng } : null}
                          onChange={({ lat, lng }) => setF((s) => ({ ...s, lat: String(lat), lng: String(lng) }))}
                        />
                      </Field>
                      <Field label="Google Maps link" hint="Optional — your clinic's share link." className="mb-0">
                        <Input value={f.maps_link} onChange={set("maps_link")} />
                      </Field>
                    </>
                  )}

                  {step === 1 && (
                    <>
                      <p className="mb-2 text-sm font-medium text-foreground">Operating hours</p>
                      <p className="mb-3 text-xs text-muted-foreground">Use 24h ranges like 09:00-18:00, or “closed.”</p>
                      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {DAYS.map((d) => (
                          <div key={d}>
                            <span className="mb-1 block text-2xs font-semibold uppercase tracking-wider text-muted-foreground">{d}</span>
                            <Input
                              value={hours[d]}
                              onChange={(e) => setHours((h) => ({ ...h, [d]: e.target.value }))}
                              placeholder="09:00-18:00"
                              className="h-8 text-xs"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="grid gap-x-4 sm:grid-cols-2">
                        <Field label="Services offered" hint="Comma-separated." className="mb-0">
                          <Input value={f.services} onChange={set("services")} placeholder="Cleaning, Braces, Root Canal" />
                        </Field>
                        <Field label="Insurance / payment accepted" hint="Comma-separated." className="mb-0">
                          <Input value={f.insurance_accepted} onChange={set("insurance_accepted")} />
                        </Field>
                      </div>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      {doctors.map((d, i) => (
                        <div key={i} className="mb-3 rounded-lg border border-border bg-background/50 p-4">
                          <div className="grid gap-x-4 sm:grid-cols-2">
                            <Field label="Name"><Input value={d.name} onChange={setDoctor(i, "name")} /></Field>
                            <Field label="Qualification"><Input value={d.qualification} onChange={setDoctor(i, "qualification")} /></Field>
                            <Field label="Years of experience"><Input value={d.years_experience} onChange={setDoctor(i, "years_experience")} /></Field>
                            <Field label="Specialization"><Input value={d.specialization} onChange={setDoctor(i, "specialization")} /></Field>
                            <Field label="Email" hint="Bookings are sent here as calendar invites.">
                              <Input type="email" value={d.email} onChange={setDoctor(i, "email")} placeholder="dr.mehta@clinic.com" />
                            </Field>
                            <Field
                              label="Google Calendar link (iCal)"
                              hint="Google Calendar → Settings → 'Secret address in iCal format'. Lets our AI see busy times and book free slots directly."
                              className="mb-0"
                            >
                              <Input value={d.calendar_ical_url} onChange={setDoctor(i, "calendar_ical_url")} placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" />
                            </Field>
                          </div>
                          {doctors.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setDoctors((ds) => ds.filter((_, j) => j !== i))}
                              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-destructive transition-opacity hover:opacity-80"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Remove
                            </button>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="secondary" size="sm" leftIcon={Plus} onClick={() => setDoctors((ds) => [...ds, { ...emptyDoctor }])}>
                        Add doctor
                      </Button>
                    </>
                  )}

                  {step === 3 && (
                    <>
                      <Field label="How should bookings be handled?">
                        <Select value={f.booking_mode} onChange={set("booking_mode")}>
                          <option value="internal">Use SmileDesk's built-in booking (recommended)</option>
                          <option value="rest">Forward to our own CRM API</option>
                        </Select>
                      </Field>
                      {f.booking_mode === "rest" && (
                        <div className="mb-4 grid gap-x-4 rounded-lg border border-border bg-background/50 p-4 sm:grid-cols-3">
                          <Field label="CRM endpoint URL" className="sm:col-span-3"><Input value={f.endpoint_url} onChange={set("endpoint_url")} /></Field>
                          <Field label="Auth type" hint="api_key / bearer / none" className="mb-0 sm:mb-0"><Input value={f.auth_type} onChange={set("auth_type")} /></Field>
                          <Field label="Credential / API key" className="mb-0 sm:col-span-2"><Input value={f.credentials} onChange={set("credentials")} /></Field>
                        </div>
                      )}
                      <div className="grid gap-x-4 sm:grid-cols-2">
                        <Field label="Registration / license number">
                          <Input value={f.registration_number} onChange={set("registration_number")} />
                        </Field>
                      </div>
                      <div className="mb-4">
                        <span className="mb-1.5 block text-sm font-medium text-foreground">License document</span>
                        <div className="flex items-center gap-2">
                          <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={onLicense} className={cn("w-full", fileNote)} />
                          {f.license_document && (
                            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-success">
                              <Check className="h-3.5 w-3.5" /> Uploaded
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="mb-1.5 block text-sm font-medium text-foreground">Clinic photos</span>
                        <div className="flex items-center gap-2">
                          <input type="file" accept="image/*" multiple onChange={onPhotos} className={cn("w-full", fileNote)} />
                          {photos.length > 0 && (
                            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-success">
                              <Check className="h-3.5 w-3.5" /> {photos.length} uploaded
                            </span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </Card>

                {/* Step footer */}
                <div className="mt-5 flex items-center justify-between">
                  {step > 0 ? (
                    <Button type="button" variant="ghost" leftIcon={ArrowLeft} onClick={() => goTo(step - 1)}>
                      Back
                    </Button>
                  ) : (
                    <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary">
                      <ArrowLeft className="h-3.5 w-3.5" /> Back to home
                    </Link>
                  )}
                  {step < STEPS.length - 1 ? (
                    <Button type="submit" size="lg" rightIcon={ArrowRight}>
                      Continue
                    </Button>
                  ) : (
                    <Button type="submit" size="lg" loading={loading} leftIcon={Upload}>
                      Submit application
                    </Button>
                  )}
                </div>
              </motion.form>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
