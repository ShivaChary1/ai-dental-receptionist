import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarX2, Check, UserX } from "lucide-react";
import api from "../../api/axios.js";
import StatusBadge from "../../components/StatusBadge.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Skeleton from "../../components/ui/Skeleton.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { cn } from "../../lib/cn.js";

const FILTERS = ["", "booked", "rescheduled", "cancelled", "completed", "no_show"];

/** True once the booking's 30-minute slot has passed. */
const slotElapsed = (b) => {
  const d = new Date(`${b.appointment_date} ${b.time_slot}`);
  return !isNaN(d) && Date.now() > d.getTime() + 30 * 60 * 1000;
};

function AttendanceActions({ b, onChanged }) {
  const [busy, setBusy] = useState(false);
  const set = async (status) => {
    setBusy(true);
    try {
      await api.post(`/api/hospital/bookings/${b.id}/status`, { status });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const btn =
    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50";

  // Active booking whose time has passed: ask the clinic what happened.
  if ((b.status === "booked" || b.status === "rescheduled") && slotElapsed(b)) {
    return (
      <div className="flex items-center gap-1">
        <button disabled={busy} onClick={() => set("completed")} className={cn(btn, "text-success hover:bg-success/10")}>
          <Check className="h-3.5 w-3.5" /> Visited
        </button>
        <button disabled={busy} onClick={() => set("no_show")} className={cn(btn, "text-destructive hover:bg-destructive/10")}>
          <UserX className="h-3.5 w-3.5" /> No-show
        </button>
      </div>
    );
  }
  // Already resolved — allow correcting a mistake either way.
  if (b.status === "completed") {
    return (
      <button disabled={busy} onClick={() => set("no_show")} className={cn(btn, "text-muted-foreground hover:bg-destructive/10 hover:text-destructive")}>
        <UserX className="h-3.5 w-3.5" /> Mark no-show
      </button>
    );
  }
  if (b.status === "no_show") {
    return (
      <button disabled={busy} onClick={() => set("completed")} className={cn(btn, "text-muted-foreground hover:bg-success/10 hover:text-success")}>
        <Check className="h-3.5 w-3.5" /> Mark visited
      </button>
    );
  }
  return null;
}

export default function HospitalBookings() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    const q = status ? `?status=${status}` : "";
    api.get(`/api/hospital/bookings${q}`).then(({ data }) => setItems(data.items)).finally(() => setLoading(false));
  };
  useEffect(() => {
    setLoading(true);
    load();
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="mb-4 inline-flex rounded-lg border border-border bg-muted/60 p-0.5">
        {FILTERS.map((s) => {
          const activeTab = status === s;
          return (
            <button
              key={s || "all"}
              onClick={() => setStatus(s)}
              className={cn(
                "relative rounded-md px-3 py-1.5 text-xs font-medium capitalize outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                activeTab ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {activeTab && (
                <motion.span
                  layoutId="bookingFilter"
                  className="absolute inset-0 rounded-md bg-primary shadow-primary"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative">{s === "no_show" ? "no-show" : s || "all"}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <Card className="divide-y divide-border p-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="ml-auto h-5 w-16 rounded-full" />
            </div>
          ))}
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title="No bookings"
          description={status ? `No ${status === "no_show" ? "no-show" : status} bookings right now.` : "New appointments will land here."}
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Doctor</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Channel</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id} className="border-t border-border transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium text-foreground">{b.patient_name || "—"}</td>
                  <td className="px-4 py-3 text-foreground">{b.doctor_name}</td>
                  <td className="px-4 py-3 text-foreground">{b.service_type}</td>
                  <td className="tabular whitespace-nowrap px-4 py-3 text-foreground">
                    {b.appointment_date} {b.time_slot}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{b.channel}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={b.status} />
                      {(b.status === "booked" || b.status === "rescheduled") && b.confirmed_at && (
                        <span
                          title="Patient confirmed they're coming"
                          className="inline-flex items-center gap-0.5 rounded-full bg-success/10 px-1.5 py-0.5 text-[11px] font-medium text-success"
                        >
                          <Check className="h-3 w-3" /> Confirmed
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <AttendanceActions b={b} onChanged={load} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
