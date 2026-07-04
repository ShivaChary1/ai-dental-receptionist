import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, CalendarDays, CalendarPlus, CheckCircle2, Clock, Stethoscope, CalendarX2 } from "lucide-react";
import api from "../../api/axios.js";
import { useAuth } from "../../auth/AuthContext.jsx";
import AccountShell from "./AccountShell.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import Button from "../../components/ui/Button.jsx";
import { Input, Select } from "../../components/ui/Input.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { SkeletonRow } from "../../components/ui/Skeleton.jsx";
import { cn } from "../../lib/cn.js";
import { staggerContainer, listItem } from "../../lib/motion.js";

const TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
];

function BookingRow({ b, onChanged }) {
  const [resched, setResched] = useState(false);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [freeSlots, setFreeSlots] = useState(null); // null = no date picked yet
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const cancel = async () => {
    if (!confirm("Cancel this appointment?")) return;
    setBusy(true);
    try { await api.post(`/api/bookings/${b.id}/cancel`); onChanged(); }
    finally { setBusy(false); }
  };
  const doResched = async () => {
    if (!date || !slot) return;
    setBusy(true);
    setError("");
    try {
      await api.post(`/api/bookings/${b.id}/reschedule`, { appointment_date: date, time_slot: slot });
      setResched(false); onChanged();
    } catch (err) {
      setError(err?.response?.data?.detail || "Couldn't reschedule.");
    } finally { setBusy(false); }
  };
  const confirmAttendance = async () => {
    setBusy(true);
    try { await api.post(`/api/bookings/${b.id}/confirm`); onChanged(); }
    finally { setBusy(false); }
  };
  const downloadIcs = async () => {
    const res = await api.get(`/api/bookings/${b.id}/calendar.ics`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = Object.assign(document.createElement("a"), { href: url, download: "appointment.ics" });
    a.click();
    URL.revokeObjectURL(url);
  };

  // Real availability for the chosen reschedule date.
  useEffect(() => {
    if (!resched || !date) { setFreeSlots(null); setSlot(""); return; }
    let live = true;
    api.get(`/api/hospitals/${b.hospital_id}/availability`, {
      params: { doctor_name: b.doctor_name, date },
    }).then(({ data }) => {
      if (!live) return;
      setFreeSlots(data.slots);
      setSlot(data.slots[0] || "");
    }).catch(() => live && setFreeSlots([]));
    return () => { live = false; };
  }, [resched, date, b.hospital_id, b.doctor_name]);

  const active = b.status === "booked" || b.status === "rescheduled";

  return (
    <motion.div
      variants={listItem}
      className="rounded-xl border border-border bg-card p-4 shadow-xs transition-shadow duration-base ease-out hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground">{b.hospital_name}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Stethoscope className="h-3.5 w-3.5 shrink-0" /> {b.doctor_name} · {b.service_type}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground">
              <span className="inline-flex items-center gap-1.5 tabular">
                <CalendarDays className="h-4 w-4 text-primary" /> {b.appointment_date}
              </span>
              <span className="inline-flex items-center gap-1.5 tabular">
                <Clock className="h-4 w-4 text-primary" /> {b.time_slot}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={b.status} dot />
          {active && b.confirmed_at && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" /> Confirmed
            </span>
          )}
        </div>
      </div>

      {active && (
        <div className="mt-3 border-t border-border pt-3">
          <AnimatePresence mode="wait" initial={false}>
            {!resched ? (
              <motion.div
                key="actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-wrap items-center gap-2"
              >
                {!b.confirmed_at && (
                  <Button size="sm" leftIcon={CheckCircle2} onClick={confirmAttendance} loading={busy}>
                    I'll be there
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => setResched(true)}>Reschedule</Button>
                <Button variant="ghost" size="sm" onClick={cancel} loading={busy} className="text-destructive hover:bg-destructive/10">
                  Cancel
                </Button>
                <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                  {b.google_calendar_link && (
                    <a
                      href={b.google_calendar_link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-primary transition-colors hover:bg-primary/10"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" /> Google Calendar
                    </a>
                  )}
                  <button
                    onClick={downloadIcs}
                    className="rounded-md px-2 py-1 font-medium transition-colors hover:bg-muted hover:text-foreground"
                  >
                    .ics
                  </button>
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="resched"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex flex-wrap items-end gap-2">
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
                  <Select
                    value={slot}
                    onChange={(e) => setSlot(e.target.value)}
                    className="w-32"
                    disabled={!date || !freeSlots?.length}
                  >
                    {!date ? (
                      <option value="">Pick a date</option>
                    ) : freeSlots === null ? (
                      <option value="">Checking…</option>
                    ) : freeSlots.length === 0 ? (
                      <option value="">No free slots</option>
                    ) : (
                      freeSlots.map((s) => <option key={s}>{s}</option>)
                    )}
                  </Select>
                  <Button size="sm" onClick={doResched} loading={busy} disabled={!date || !slot}>Save</Button>
                  <Button variant="ghost" size="sm" onClick={() => setResched(false)}>Cancel</Button>
                </div>
                {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

export default function MyBookings() {
  const { user } = useAuth();
  const [data, setData] = useState({ upcoming: [], past: [], cancelled: [] });
  const [tab, setTab] = useState("upcoming");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/bookings");
      setData(data);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const list = data[tab] || [];

  return (
    <AccountShell name={user?.name} email={user?.email}>
      {/* Segmented status tabs */}
      <div className="mb-5 inline-flex rounded-lg border border-border bg-muted/60 p-0.5">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "relative rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors",
                active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="bookingTab"
                  className="absolute inset-0 rounded-md bg-primary shadow-primary"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative">
                {t.label} <span className="tabular opacity-70">({data[t.key]?.length || 0})</span>
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-xs">
              <SkeletonRow />
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title={`No ${tab} appointments`}
          description={tab === "upcoming" ? "Book a visit and it'll show up here." : "Nothing to see here yet."}
        />
      ) : (
        <motion.div
          key={tab}
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid items-start gap-4 md:grid-cols-2"
        >
          {list.map((b) => <BookingRow key={b.id} b={b} onChanged={load} />)}
        </motion.div>
      )}
    </AccountShell>
  );
}
