import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarClock, CalendarOff, CalendarX2, Check, Eye, Link2, Plus, Trash2,
} from "lucide-react";
import api from "../../api/axios.js";
import Button from "../../components/ui/Button.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Skeleton from "../../components/ui/Skeleton.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Field, Input, Select } from "../../components/ui/Input.jsx";
import { ALL_SLOTS } from "../../lib/slots.js";
import { cn } from "../../lib/cn.js";
import { staggerContainer, listItem } from "../../lib/motion.js";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABEL = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

/** "09:00-18:00" <-> {start, end}; "off"/empty = day off. */
const parseRange = (spec) => {
  const m = /^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/.exec((spec || "").trim());
  return m ? { start: m[1].padStart(5, "0"), end: m[2].padStart(5, "0") } : null;
};

// ---------- Per-doctor hours + calendar connect ----------
function DoctorScheduleCard({ doctor, onSaved }) {
  const [hours, setHours] = useState(() => {
    const src = doctor.working_hours || {};
    return Object.fromEntries(DAYS.map((d) => [d, src[d] ?? (d === "sun" ? "off" : "09:00-18:00")]));
  });
  const [email, setEmail] = useState(doctor.email || "");
  const [icalUrl, setIcalUrl] = useState(doctor.calendar_ical_url || "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const setDay = (day, next) => setHours((h) => ({ ...h, [day]: next }));

  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/api/hospital/doctors/${doctor.id}`, {
        name: doctor.name,
        photo: doctor.photo || null,
        qualification: doctor.qualification || null,
        years_experience: doctor.years_experience ?? null,
        specialization: doctor.specialization || null,
        bio: doctor.bio || null,
        email: email || null,
        calendar_ical_url: icalUrl || null,
        working_hours: hours,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved?.();
    } finally {
      setBusy(false);
    }
  };

  const connected = Boolean(doctor.calendar_ical_url);

  return (
    <motion.div variants={listItem}>
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-medium text-foreground">{doctor.name}</h3>
            <p className="text-xs text-muted-foreground">{doctor.specialization || "General dentistry"}</p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              connected ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
            )}
          >
            <Link2 className="h-3 w-3" />
            {connected ? "Calendar linked" : "No calendar linked"}
          </span>
        </div>

        {/* Weekly working hours */}
        <div className="mt-4 space-y-1.5">
          {DAYS.map((day) => {
            const range = parseRange(hours[day]);
            const off = !range;
            return (
              <div key={day} className="flex items-center gap-2 text-sm">
                <span className="w-9 shrink-0 text-xs font-medium text-muted-foreground">{DAY_LABEL[day]}</span>
                <button
                  type="button"
                  onClick={() => setDay(day, off ? "09:00-18:00" : "off")}
                  className={cn(
                    "w-14 shrink-0 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                    off ? "bg-muted text-muted-foreground hover:text-foreground" : "bg-primary/10 text-primary"
                  )}
                >
                  {off ? "Off" : "Open"}
                </button>
                {!off && (
                  <>
                    <Input
                      type="time"
                      value={range.start}
                      onChange={(e) => setDay(day, `${e.target.value}-${range.end}`)}
                      className="h-8 w-28 text-xs"
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      type="time"
                      value={range.end}
                      onChange={(e) => setDay(day, `${range.start}-${e.target.value}`)}
                      className="h-8 w-28 text-xs"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Calendar connect */}
        <div className="mt-4 border-t border-border pt-4">
          <Field label="Doctor's email" hint="New bookings are sent as calendar invites — they land on the doctor's Google Calendar automatically.">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="dr.mehta@clinic.com" />
          </Field>
          <Field
            label="Google Calendar link (iCal)"
            hint="Google Calendar → Settings → your calendar → 'Secret address in iCal format'. Busy events there are removed from bookable slots."
            className="mb-0"
          >
            <Input value={icalUrl} onChange={(e) => setIcalUrl(e.target.value)} placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" />
          </Field>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button size="sm" onClick={save} loading={busy}>Save schedule</Button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ---------- Blocks / holidays ----------
function BlocksPanel({ doctors }) {
  const [blocks, setBlocks] = useState(null);
  const [form, setForm] = useState({ date: "", doctor_name: "", all_day: true, slots: [], reason: "" });
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/api/hospital/blocks").then(({ data }) => setBlocks(data.items));
  useEffect(() => { load(); }, []);

  const toggleSlot = (s) =>
    setForm((f) => ({
      ...f,
      slots: f.slots.includes(s) ? f.slots.filter((x) => x !== s) : [...f.slots, s],
    }));

  const add = async () => {
    setBusy(true);
    try {
      await api.post("/api/hospital/blocks", {
        date: form.date,
        doctor_name: form.doctor_name || null,
        all_day: form.all_day,
        slots: form.all_day ? null : form.slots,
        reason: form.reason || null,
      });
      setForm({ date: "", doctor_name: "", all_day: true, slots: [], reason: "" });
      load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    await api.delete(`/api/hospital/blocks/${id}`);
    load();
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <CalendarOff className="h-4 w-4 text-primary" />
        <h3 className="font-medium text-foreground">Holidays & blocked time</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Blocked dates and slots disappear from patient booking and the AI assistant instantly.
      </p>

      <div className="mt-4 grid gap-x-3 sm:grid-cols-3">
        <Field label="Date" className="mb-3">
          <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
        </Field>
        <Field label="Applies to" className="mb-3">
          <Select value={form.doctor_name} onChange={(e) => setForm((f) => ({ ...f, doctor_name: e.target.value }))}>
            <option value="">Whole clinic (holiday)</option>
            {doctors.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="Reason (optional)" className="mb-3">
          <Input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Diwali, conference…" />
        </Field>
      </div>

      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={form.all_day}
          onChange={(e) => setForm((f) => ({ ...f, all_day: e.target.checked }))}
          className="h-4 w-4 accent-[oklch(var(--primary))]"
        />
        Block the whole day
      </label>

      {!form.all_day && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ALL_SLOTS.map((s) => {
            const on = form.slots.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSlot(s)}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
              </button>
            );
          })}
        </div>
      )}

      <Button
        size="sm"
        leftIcon={Plus}
        className="mt-4"
        onClick={add}
        loading={busy}
        disabled={!form.date || (!form.all_day && form.slots.length === 0)}
      >
        Add block
      </Button>

      <div className="mt-5 border-t border-border pt-4">
        {blocks === null ? (
          <Skeleton className="h-16 w-full" />
        ) : blocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming blocks.</p>
        ) : (
          <ul className="space-y-2">
            {blocks.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <span className="tabular font-medium text-foreground">{b.date}</span>
                  <span className="mx-1.5 text-muted-foreground">·</span>
                  <span className="text-foreground">{b.doctor_name || "Whole clinic"}</span>
                  <span className="mx-1.5 text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    {b.all_day ? "All day" : b.slots.join(", ")}
                    {b.reason ? ` — ${b.reason}` : ""}
                  </span>
                </div>
                <button
                  onClick={() => remove(b.id)}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Remove block"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

// ---------- Availability preview ----------
function PreviewPanel({ doctors }) {
  const [doctor, setDoctor] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!doctor || !date) { setSlots(null); return; }
    let live = true;
    setLoading(true);
    api.get("/api/hospital/availability", { params: { doctor_name: doctor, date } })
      .then(({ data }) => live && setSlots(data.slots))
      .catch(() => live && setSlots([]))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [doctor, date]);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-primary" />
        <h3 className="font-medium text-foreground">Availability preview</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Exactly what patients and the AI assistant can book — after hours, blocks, bookings, and linked calendars.
      </p>
      <div className="mt-4 grid gap-x-3 sm:grid-cols-2">
        <Field label="Doctor" className="mb-3">
          <Select value={doctor} onChange={(e) => setDoctor(e.target.value)}>
            <option value="">Pick a doctor</option>
            {doctors.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="Date" className="mb-3">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      {loading ? (
        <Skeleton className="h-10 w-full" />
      ) : slots === null ? null : slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">No bookable slots that day.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {slots.map((s) => (
            <span key={s} className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{s}</span>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function HospitalSchedule() {
  const [profile, setProfile] = useState(null);

  const load = () => api.get("/api/hospital/profile").then(({ data }) => setProfile(data));
  useEffect(() => { load(); }, []);

  const doctors = useMemo(() => profile?.doctors || [], [profile]);

  if (!profile) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <BlocksPanel doctors={doctors} />
        <PreviewPanel doctors={doctors} />
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          <h2 className="font-medium text-foreground">Doctor hours & calendars</h2>
        </div>
        {doctors.length === 0 ? (
          <EmptyState
            icon={CalendarX2}
            title="No doctors yet"
            description="Add doctors in Clinic profile, then set their hours and link their calendars here."
          />
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid items-start gap-4 lg:grid-cols-2"
          >
            {doctors.map((d) => <DoctorScheduleCard key={d.id} doctor={d} onSaved={load} />)}
          </motion.div>
        )}
      </div>
    </div>
  );
}
