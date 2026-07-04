import { useState } from "react";
import StatusBadge from "./StatusBadge.jsx";
import Button from "./ui/Button.jsx";
import { Select } from "./ui/Input.jsx";

const STATUSES = ["scheduled", "completed", "cancelled", "rescheduled"];

export default function AppointmentCard({ appt, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(appt.status);

  const save = () => {
    onUpdate(appt.id, { status });
    setEditing(false);
  };

  return (
    <tr className="border-b border-border transition-colors last:border-0 hover:bg-muted/40">
      <td className="px-3 py-2 font-medium text-foreground">{appt.patient_name}</td>
      <td className="px-3 py-2 text-muted-foreground">{appt.patient_phone}</td>
      <td className="px-3 py-2 text-foreground">{appt.doctor_name}</td>
      <td className="px-3 py-2 text-foreground">{appt.service_type}</td>
      <td className="tabular whitespace-nowrap px-3 py-2 text-foreground">
        {appt.appointment_date} · {appt.time_slot}
      </td>
      <td className="px-3 py-2">
        {editing ? (
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-8 w-36 text-xs">
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        ) : (
          <StatusBadge status={appt.status} />
        )}
      </td>
      <td className="max-w-[160px] truncate px-3 py-2 text-muted-foreground" title={appt.notes}>
        {appt.notes || "—"}
      </td>
      <td className="whitespace-nowrap px-3 py-2">
        {editing ? (
          <span className="inline-flex gap-1">
            <Button size="sm" onClick={save}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </span>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Change status
          </Button>
        )}
      </td>
    </tr>
  );
}
