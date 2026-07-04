import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, CalendarX2, MessagesSquare, Inbox } from "lucide-react";
import api from "../../api/axios.js";
import Stat from "../../components/ui/Stat.jsx";
import Badge from "../../components/ui/Badge.jsx";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card.jsx";
import { SkeletonStat, SkeletonRow } from "../../components/ui/Skeleton.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { staggerContainer, listItem } from "../../lib/motion.js";

function Panel({ title, children }) {
  return (
    <motion.div variants={listItem}>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">{children}</CardContent>
      </Card>
    </motion.div>
  );
}

function Row({ left, sub, badge }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="min-w-0">
        <div className="truncate text-foreground">{left}</div>
        <div className="truncate text-xs text-muted-foreground">{sub}</div>
      </div>
      {badge}
    </div>
  );
}

const Empty = () => <p className="text-sm text-muted-foreground">Nothing yet.</p>;

export default function HospitalOverview() {
  const [data, setData] = useState(null);
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    api.get("/api/hospital/overview").then(({ data }) => setData(data));
    api.get("/api/hospital/notifications").then(({ data }) => setNotifs(data.items)).catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <SkeletonStat /><SkeletonStat /><SkeletonStat />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <SkeletonRow /><SkeletonRow /><SkeletonRow />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Total bookings" value={data.total_bookings} icon={CalendarDays} />
        <Stat label="Cancellations (7d)" value={data.cancellations_this_week} icon={CalendarX2} />
        <Stat label="AI conversations" value={data.conversations} icon={MessagesSquare} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Recent bookings">
          {data.recent_bookings.length === 0 ? <Empty /> : data.recent_bookings.map((b) => (
            <Row
              key={b.id}
              left={`${b.doctor_name} · ${b.service_type}`}
              sub={`${b.appointment_date} ${b.time_slot}`}
              badge={<StatusBadge status={b.status} />}
            />
          ))}
        </Panel>
        <Panel title="Recent conversations">
          {data.recent_conversations.length === 0 ? <Empty /> : data.recent_conversations.map((c) => (
            <Row
              key={c.id}
              left={c.patient_name}
              sub={c.last_message}
              badge={<Badge tone="primary">{c.message_count} msgs</Badge>}
            />
          ))}
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Booking-system calls (adapter log)">
          {data.recent_adapter_calls.length === 0 ? <Empty /> : data.recent_adapter_calls.map((l, i) => (
            <Row
              key={i}
              left={l.action}
              sub={new Date(l.created_at).toLocaleString()}
              badge={<Badge tone={l.ok ? "success" : "destructive"} dot>{l.ok ? "ok" : "failed"}</Badge>}
            />
          ))}
        </Panel>
        <Panel title="Notifications">
          {notifs.length === 0 ? <Empty /> : notifs.slice(0, 8).map((n) => (
            <Row
              key={n.id}
              left={n.subject}
              sub={n.body}
              badge={<Badge tone={n.read ? "neutral" : "info"}>{n.read ? "read" : "new"}</Badge>}
            />
          ))}
        </Panel>
      </div>
    </motion.div>
  );
}
