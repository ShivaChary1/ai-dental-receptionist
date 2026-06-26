import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import StatusBadge from "../../components/StatusBadge.jsx";

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${accent}`}>{value}</div>
    </div>
  );
}

export default function Overview() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/api/dashboard/stats").then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  if (!stats) return <div className="text-slate-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Appointments" value={stats.total_appointments} accent="text-primary" />
        <StatCard label="Today's Appointments" value={stats.todays_appointments} accent="text-green-600" />
        <StatCard label="This Week's Cancellations" value={stats.cancellations_this_week} accent="text-red-500" />
        <StatCard label="Active Conversations Today" value={stats.active_conversations_today} accent="text-yellow-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent appointments */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-3">Recent Appointments</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-slate-400 border-b">
              <tr>
                <th className="py-2">Patient</th>
                <th>Doctor</th>
                <th>Service</th>
                <th>Date/Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent_appointments.map((a) => (
                <tr key={a.id} className="border-b border-slate-50">
                  <td className="py-2 font-medium text-slate-700">{a.patient_name}</td>
                  <td className="text-slate-600">{a.doctor_name}</td>
                  <td className="text-slate-600">{a.service_type}</td>
                  <td className="text-slate-600 whitespace-nowrap">{a.appointment_date} {a.time_slot}</td>
                  <td><StatusBadge status={a.status} /></td>
                </tr>
              ))}
              {stats.recent_appointments.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-slate-400">No appointments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Recent conversations */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-3">Recent Conversations</h2>
          <ul className="space-y-3">
            {stats.recent_conversations.map((c) => (
              <li key={c.session_id} className="border-b border-slate-50 pb-2">
                <div className="flex justify-between">
                  <span className="font-medium text-slate-700">{c.patient_name}</span>
                  <span className="text-xs text-slate-400">
                    {c.last_active ? new Date(c.last_active).toLocaleString() : ""}
                  </span>
                </div>
                <p className="text-sm text-slate-500 truncate">{c.last_message}</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {c.intents.map((t) => (
                    <span key={t} className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              </li>
            ))}
            {stats.recent_conversations.length === 0 && (
              <li className="text-slate-400 text-sm">No conversations yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
