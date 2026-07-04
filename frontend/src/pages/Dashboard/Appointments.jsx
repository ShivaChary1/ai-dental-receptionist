import { useCallback, useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../../api/axios.js";
import AppointmentCard from "../../components/AppointmentCard.jsx";
import Button from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Input, Select } from "../../components/ui/Input.jsx";

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
      <div className="flex flex-wrap gap-3">
        {Object.entries(data.status_counts).map(([s, c]) => (
          <div key={s} className="rounded-lg border border-border bg-card px-4 py-2 text-sm shadow-xs">
            <span className="capitalize text-muted-foreground">{s}: </span>
            <span className="tabular font-semibold text-foreground">{c}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <div className="w-48">
          <Input leftIcon={Search} placeholder="Search name / phone" value={filters.search} onChange={setFilter("search")} />
        </div>
        <Select value={filters.status} onChange={setFilter("status")} className="w-40">
          {STATUSES.map((s) => <option key={s} value={s}>{s || "All statuses"}</option>)}
        </Select>
        <div className="w-36">
          <Input placeholder="Doctor" value={filters.doctor_name} onChange={setFilter("doctor_name")} />
        </div>
        <div className="w-38">
          <Input type="date" value={filters.date_from} onChange={setFilter("date_from")} />
        </div>
        <div className="w-38">
          <Input type="date" value={filters.date_to} onChange={setFilter("date_to")} />
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-3 font-medium">Patient</th>
              <th className="font-medium">Phone</th>
              <th className="font-medium">Doctor</th>
              <th className="font-medium">Service</th>
              <th className="font-medium">Date & time</th>
              <th className="font-medium">Status</th>
              <th className="font-medium">Notes</th>
              <th className="font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((a) => (
              <AppointmentCard key={a.id} appt={a} onUpdate={update} />
            ))}
            {data.items.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-muted-foreground">
                  No appointments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="tabular">{data.total} total</span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" leftIcon={ChevronLeft} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </Button>
          <span className="tabular px-2">Page {page} / {data.pages || 1}</span>
          <Button variant="secondary" size="sm" rightIcon={ChevronRight} disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
