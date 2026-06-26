import { useState } from "react";
import StatusBadge from "./StatusBadge.jsx";

const STATUSES = ["scheduled", "completed", "cancelled", "rescheduled"];

export default function AppointmentCard({ appt, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(appt.status);

  const save = () => {
    onUpdate(appt.id, { status });
    setEditing(false);
  };

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-3 py-2 font-medium text-slate-800">{appt.patient_name}</td>
      <td className="px-3 py-2 text-slate-600">{appt.patient_phone}</td>
      <td className="px-3 py-2 text-slate-600">{appt.doctor_name}</td>
      <td className="px-3 py-2 text-slate-600">{appt.service_type}</td>
      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
        {appt.appointment_date} · {appt.time_slot}
      </td>
      <td className="px-3 py-2">
        {editing ? (
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ) : (
          <StatusBadge status={appt.status} />
        )}
      </td>
      <td className="px-3 py-2 text-slate-500 max-w-[160px] truncate" title={appt.notes}>
        {appt.notes || "—"}
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        {editing ? (
          <>
            <button onClick={save} className="text-primary text-sm font-medium mr-2">
              Save
            </button>
            <button onClick={() => setEditing(false)} className="text-slate-400 text-sm">
              Cancel
            </button>
          </>
        ) : (
          <button onClick={() => setEditing(true)} className="text-primary text-sm font-medium">
            Change status
          </button>
        )}
      </td>
    </tr>
  );
}
