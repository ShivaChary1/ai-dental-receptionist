import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Heart, HeartPulse, PhoneCall, ShieldCheck, UserRound } from "lucide-react";
import api from "../../api/axios.js";
import HospitalCard from "../../components/HospitalCard.jsx";
import AccountShell from "./AccountShell.jsx";
import Button from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Field, Input, Select, Textarea } from "../../components/ui/Input.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Skeleton from "../../components/ui/Skeleton.jsx";
import { staggerContainer, EASE } from "../../lib/motion.js";
import { cn } from "../../lib/cn.js";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];
const RELATIONS = ["Spouse", "Parent", "Child", "Sibling", "Friend", "Other"];

const NAV = [
  { id: "personal", label: "Personal", icon: UserRound },
  { id: "health", label: "Health profile", icon: HeartPulse },
  { id: "emergency", label: "Emergency", icon: PhoneCall },
  { id: "insurance", label: "Insurance", icon: ShieldCheck },
  { id: "saved", label: "Saved clinics", icon: Heart },
];

/** Fields that count toward profile completeness — the ring nudges users to
 *  fill the healthcare data clinics actually need. */
function completeness(p) {
  if (!p) return 0;
  const values = [
    p.name, p.phone, p.date_of_birth, p.gender, p.address,
    p.blood_group, p.allergies, p.medications, p.conditions, p.last_dental_visit,
    p.emergency_contact?.name, p.emergency_contact?.phone, p.insurance?.provider,
  ];
  const filled = values.filter((v) => (v ?? "").toString().trim() !== "").length;
  return Math.round((filled / values.length) * 100);
}

/** Animated SVG completeness ring. */
function CompletenessRing({ pct }) {
  const R = 26;
  const C = 2 * Math.PI * R;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
      <div className="relative h-16 w-16 shrink-0">
        <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
          <circle cx="32" cy="32" r={R} fill="none" strokeWidth="6" className="stroke-muted" />
          <motion.circle
            cx="32" cy="32" r={R} fill="none" strokeWidth="6" strokeLinecap="round"
            className="stroke-[oklch(var(--primary))]"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: C * (1 - pct / 100) }}
            transition={{ duration: 0.9, ease: EASE.out }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular text-foreground">
          {pct}%
        </span>
      </div>
      <div className="min-w-0 leading-tight">
        <p className="text-sm font-semibold text-foreground">Profile completeness</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {pct === 100 ? "All set — clinics have what they need." : "Complete it so your dentist can prepare."}
        </p>
      </div>
    </div>
  );
}

function Section({ id, icon: Icon, title, hint, children }) {
  return (
    <Card id={id} className="scroll-mt-4 p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {hint && <p className="text-2xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

export default function AccountProfile() {
  const [profile, setProfile] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("personal");
  const scrollRef = useRef(null);

  useEffect(() => {
    (async () => {
      const [p, f] = await Promise.all([
        api.get("/api/patients/me"),
        api.get("/api/patients/favorites"),
      ]);
      setProfile(p.data);
      setFavorites(f.data.items);
    })();
  }, []);

  // Scrollspy: highlight the section currently in view.
  useEffect(() => {
    if (!profile) return;
    const root = scrollRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActiveSection(visible[0].target.id);
      },
      { root, rootMargin: "-20% 0px -70% 0px" }
    );
    NAV.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [profile]);

  const jumpTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const set = (k) => (e) => setProfile((p) => ({ ...p, [k]: e.target.value }));
  const setNested = (group, k) => (e) =>
    setProfile((p) => ({ ...p, [group]: { ...(p[group] || {}), [k]: e.target.value } }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const { data } = await api.put("/api/patients/me", {
        name: profile.name,
        phone: profile.phone,
        date_of_birth: profile.date_of_birth,
        gender: profile.gender,
        address: profile.address,
        blood_group: profile.blood_group,
        allergies: profile.allergies,
        medications: profile.medications,
        conditions: profile.conditions,
        last_dental_visit: profile.last_dental_visit,
        medical_notes: profile.medical_notes,
        emergency_contact: profile.emergency_contact,
        insurance: profile.insurance,
      });
      setProfile(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2400);
    } finally {
      setSaving(false);
    }
  };

  const pct = useMemo(() => completeness(profile), [profile]);
  const ec = profile?.emergency_contact || {};
  const ins = profile?.insurance || {};

  return (
    <AccountShell name={profile?.name} email={profile?.email} scrollRef={scrollRef}>
          {/* Mobile section chips */}
          <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
            {NAV.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => jumpTo(id)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  activeSection === id
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-8 lg:grid-cols-[230px_1fr]">
            {/* Settings rail */}
            <aside className="hidden lg:block">
              <div className="sticky top-0 space-y-4">
                <CompletenessRing pct={pct} />
                <nav className="space-y-0.5">
                  {NAV.map(({ id, label, icon: Icon }) => {
                    const active = activeSection === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => jumpTo(id)}
                        className={cn(
                          "relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="profileNav"
                            className="absolute inset-0 rounded-lg bg-primary/10"
                            transition={{ type: "spring", stiffness: 420, damping: 34 }}
                          />
                        )}
                        <Icon className="relative h-4 w-4 shrink-0" />
                        <span className="relative">{label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* Content column */}
            <div className="min-w-0">
              {!profile ? (
                <div className="space-y-4">
                  {[0, 1].map((i) => (
                    <Card key={i} className="p-5">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="mt-4 h-9 w-full" />
                      <Skeleton className="mt-3 h-9 w-full" />
                    </Card>
                  ))}
                </div>
              ) : (
                <form onSubmit={save}>
                  <div className="space-y-5">
                    <Section id="personal" icon={UserRound} title="Personal details">
                      <div className="grid gap-x-3 sm:grid-cols-2">
                        <Field label="Full name">
                          <Input value={profile.name || ""} onChange={set("name")} autoComplete="name" />
                        </Field>
                        <Field label="Email" hint="Contact support to change your email.">
                          <Input value={profile.email || ""} disabled />
                        </Field>
                        <Field label="Phone">
                          <Input type="tel" value={profile.phone || ""} onChange={set("phone")} autoComplete="tel" />
                        </Field>
                        <Field label="Date of birth">
                          <Input type="date" value={profile.date_of_birth || ""} onChange={set("date_of_birth")} />
                        </Field>
                        <Field label="Gender">
                          <Select value={profile.gender || ""} onChange={set("gender")}>
                            <option value="">Select…</option>
                            {GENDERS.map((g) => <option key={g}>{g}</option>)}
                          </Select>
                        </Field>
                        <Field label="Address">
                          <Input value={profile.address || ""} onChange={set("address")} autoComplete="street-address" />
                        </Field>
                      </div>
                    </Section>

                    <Section
                      id="health"
                      icon={HeartPulse}
                      title="Health profile"
                      hint="Shared with a clinic only when you book — helps your dentist prepare."
                    >
                      <div className="grid gap-x-3 sm:grid-cols-2">
                        <Field label="Blood group">
                          <Select value={profile.blood_group || ""} onChange={set("blood_group")}>
                            <option value="">Select…</option>
                            {BLOOD_GROUPS.map((b) => <option key={b}>{b}</option>)}
                          </Select>
                        </Field>
                        <Field label="Last dental visit">
                          <Input type="date" value={profile.last_dental_visit || ""} onChange={set("last_dental_visit")} />
                        </Field>
                        <Field label="Allergies" hint="Medications, latex, anaesthetics…">
                          <Textarea value={profile.allergies || ""} onChange={set("allergies")} rows={2} />
                        </Field>
                        <Field label="Current medications">
                          <Textarea value={profile.medications || ""} onChange={set("medications")} rows={2} />
                        </Field>
                        <Field label="Medical conditions" hint="Diabetes, heart conditions, pregnancy…" className="mb-0 sm:mb-4">
                          <Textarea value={profile.conditions || ""} onChange={set("conditions")} rows={2} />
                        </Field>
                        <Field label="Anything else your dentist should know" className="mb-0">
                          <Textarea value={profile.medical_notes || ""} onChange={set("medical_notes")} rows={2} />
                        </Field>
                      </div>
                    </Section>

                    {/* Two half-width cards break the full-width stack rhythm. */}
                    <div className="grid gap-5 md:grid-cols-2">
                      <Section
                        id="emergency"
                        icon={PhoneCall}
                        title="Emergency contact"
                        hint="Who should a clinic call if needed?"
                      >
                        <Field label="Name">
                          <Input value={ec.name || ""} onChange={setNested("emergency_contact", "name")} />
                        </Field>
                        <Field label="Phone">
                          <Input type="tel" value={ec.phone || ""} onChange={setNested("emergency_contact", "phone")} />
                        </Field>
                        <Field label="Relationship" className="mb-0">
                          <Select value={ec.relation || ""} onChange={setNested("emergency_contact", "relation")}>
                            <option value="">Select…</option>
                            {RELATIONS.map((r) => <option key={r}>{r}</option>)}
                          </Select>
                        </Field>
                      </Section>

                      <Section
                        id="insurance"
                        icon={ShieldCheck}
                        title="Insurance"
                        hint="Optional — speeds up check-in."
                      >
                        <Field label="Provider">
                          <Input value={ins.provider || ""} onChange={setNested("insurance", "provider")} />
                        </Field>
                        <Field label="Policy number" className="mb-0">
                          <Input value={ins.policy_number || ""} onChange={setNested("insurance", "policy_number")} />
                        </Field>
                      </Section>
                    </div>
                  </div>

                  {/* Sticky save bar — reachable from any scroll position. */}
                  <div className="sticky bottom-0 z-10 mt-5 -mx-1 flex items-center gap-3 border-t border-border bg-background/85 px-1 py-3 backdrop-blur-md">
                    <Button type="submit" loading={saving}>Save changes</Button>
                    <AnimatePresence>
                      {saved && (
                        <motion.span
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          className="inline-flex items-center gap-1 text-sm font-medium text-success"
                        >
                          <Check className="h-4 w-4" /> Saved
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <span className="ml-auto hidden text-xs text-muted-foreground sm:block">
                      Profile {pct}% complete
                    </span>
                  </div>
                </form>
              )}

              <h2 id="saved" className="mb-3 mt-8 scroll-mt-4 text-md font-semibold tracking-tight text-foreground">
                Saved clinics
              </h2>
              {favorites.length === 0 ? (
                <EmptyState
                  icon={Heart}
                  title="No saved clinics yet"
                  description="Tap the heart on any clinic to keep it here for quick booking."
                  action={
                    <Link
                      to="/clinics"
                      className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-primary transition-colors hover:bg-primary-hover"
                    >
                      Browse clinics
                    </Link>
                  }
                />
              ) : (
                <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-5 sm:grid-cols-2">
                  {favorites.map((h) => <HospitalCard key={h.id} h={h} variant="featured" />)}
                </motion.div>
              )}
            </div>
          </div>
    </AccountShell>
  );
}
