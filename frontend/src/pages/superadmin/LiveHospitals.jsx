import { useEffect, useState } from "react";
import { Building2, Star } from "lucide-react";
import api from "../../api/axios.js";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Skeleton from "../../components/ui/Skeleton.jsx";
import { Card } from "../../components/ui/Card.jsx";

export default function LiveHospitals() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/superadmin/hospitals");
      setItems(data.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (h) => {
    const next = h.status === "active" ? "suspended" : "active";
    await api.post(`/api/superadmin/hospitals/${h.id}/status`, { status: next });
    load();
  };

  if (loading) {
    return (
      <Card className="divide-y divide-border p-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="ml-auto h-5 w-16 rounded-full" />
          </div>
        ))}
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No clinics yet"
        description="Approved clinic applications become live clinics here."
      />
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Clinic</th>
            <th className="px-4 py-3 font-medium">Address</th>
            <th className="px-4 py-3 font-medium">Doctors</th>
            <th className="px-4 py-3 font-medium">Rating</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {items.map((h) => (
            <tr key={h.id} className="border-t border-border transition-colors hover:bg-muted/40">
              <td className="px-4 py-3 font-medium text-foreground">{h.name}</td>
              <td className="px-4 py-3 text-muted-foreground">{h.address}</td>
              <td className="tabular px-4 py-3 text-foreground">{h.doctor_count}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1 text-foreground">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden />
                  <span className="tabular">{h.rating_avg?.toFixed?.(1) ?? "0.0"}</span>
                  <span className="text-xs text-muted-foreground">({h.rating_count || 0})</span>
                </span>
              </td>
              <td className="px-4 py-3">
                <Badge tone={h.status === "active" ? "success" : "destructive"} dot>
                  {h.status}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <Button variant="ghost" size="sm" onClick={() => toggle(h)}>
                  {h.status === "active" ? "Suspend" : "Reactivate"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
