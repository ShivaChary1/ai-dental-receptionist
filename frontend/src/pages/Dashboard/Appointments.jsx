import { useCallback, useEffect, useState } from "react";
import api from "../../api/axios.js";
import AppointmentCard from "../../components/AppointmentCard.jsx";

const STATUSES = ["", "scheduled", "completed", "cancelled", "rescheduled"];

export default function Appointments() {
  const [data, setData] = useState({ items: [], total: 0, pages: 1, status_counts: {} });
  const [filters, setFilters] = useState({ search: "", status: "", doctor_name: "", date_from: "", date_to: "" });
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    const params = { page, limit: 20 };
    Object.entries(filters).forEach(([k, v]) => v && (params[k] = v));
    const { data } = await api.get("/api/dashboard/appointments", { params });
    setData(data);
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  const update = async (id, payload) => {
    await api.put(`/api/dashboard/appointments/${id}`, payload);
    load();
  };

  const setFilter = (k) => (e) => { setPage(1); setFilters({ ...filters, [k]: e.target.value }); };

  return (
    <div className="space-y-4">
      {/* Status summary */}
      <div className="flex gap-3 flex-wrap">
        {Object.entries(data.status_counts).map(([s, c]) => (
          <div key={s} className="bg-white border border-slate-100 rounded-lg px-4 py-2 text-sm shadow-sm">
            <span className="capitalize text-slate-500">{s}: </span>
            <span className="font-semibold text-slate-800">{c}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
        <input placeholder="Search name/phone" value={filters.search} onChange={setFilter("search")}
          className="border rounded-lg px-3 py-1.5 text-sm" />
        <select value={filters.status} onChange={setFilter("status")} className="border rounded-lg px-3 py-1.5 text-sm">
          {STATUSES.map((s) => <option key={s} value={s}>{s || "All statuses"}</option>)}
        </select>
        <input placeholder="Doctor" value={filters.doctor_name} onChange={setFilter("doctor_name")}
          className="border rounded-lg px-3 py-1.5 text-sm" />
        <input type="date" value={filters.date_from} onChange={setFilter("date_from")} className="border rounded-lg px-3 py-1.5 text-sm" />
        <input type="date" value={filters.date_to} onChange={setFilter("date_to")} className="border rounded-lg px-3 py-1.5 text-sm" />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-400 border-b">
            <tr>
              <th className="px-3 py-2">Patient</th><th>Phone</th><th>Doctor</th><th>Service</th>
              <th>Date & Time</th><th>Status</th><th>Notes</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((a) => (
              <AppointmentCard key={a.id} appt={a} onUpdate={update} />
            ))}
            {data.items.length === 0 && (
              <tr><td colSpan={8} className="text-center py-6 text-slate-400">No appointments found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center text-sm text-slate-500">
        <span>{data.total} total</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 border rounded-lg disabled:opacity-40">Prev</button>
          <span className="px-2 py-1">Page {page} / {data.pages || 1}</span>
          <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border rounded-lg disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}
