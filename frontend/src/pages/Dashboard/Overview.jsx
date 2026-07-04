import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, CalendarClock, CalendarX2, MessagesSquare } from "lucide-react";
import api from "../../api/axios.js";
import StatusBadge from "../../components/StatusBadge.jsx";
import Stat from "../../components/ui/Stat.jsx";
import Badge from "../../components/ui/Badge.jsx";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card.jsx";
import { SkeletonStat, SkeletonRow } from "../../components/ui/Skeleton.jsx";
import { staggerContainer, listItem } from "../../lib/motion.js";

export default function Overview() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/api/dashboard/stats").then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <SkeletonStat /><SkeletonStat /><SkeletonStat /><SkeletonStat />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Stat label="Total appointments" value={stats.total_appointments} icon={CalendarDays} />
        <Stat label="Today's appointments" value={stats.todays_appointments} icon={CalendarClock} />
        <Stat label="Cancellations (7d)" value={stats.cancellations_this_week} icon={CalendarX2} />
        <Stat label="Active conversations today" value={stats.active_conversations_today} icon={MessagesSquare} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={listItem}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Recent appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 font-medium">Patient</th>
                    <th className="font-medium">Doctor</th>
                    <th className="font-medium">Service</th>
                    <th className="font-medium">Date / time</th>
                    <th className="font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_appointments.map((a) => (
                    <tr key={a.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2 font-medium text-foreground">{a.patient_name}</td>
                      <td className="text-foreground">{a.doctor_name}</td>
                      <td className="text-foreground">{a.service_type}</td>
                      <td className="tabular whitespace-nowrap text-foreground">
                        {a.appointment_date} {a.time_slot}
                      </td>
                      <td><StatusBadge status={a.status} /></td>
                    </tr>
                  ))}
                  {stats.recent_appointments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-muted-foreground">
                        No appointments yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={listItem}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Recent conversations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {stats.recent_conversations.map((c) => (
                  <li key={c.session_id} className="border-b border-border/50 pb-2 last:border-0">
                    <div className="flex justify-between gap-2">
                      <span className="truncate text-sm font-medium text-foreground">{c.patient_name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {c.last_active ? new Date(c.last_active).toLocaleString() : ""}
                      </span>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{c.last_message}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {c.intents.map((t) => (
                        <Badge key={t} tone="primary">{t}</Badge>
                      ))}
                    </div>
                  </li>
                ))}
                {stats.recent_conversations.length === 0 && (
                  <li className="text-sm text-muted-foreground">No conversations yet.</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
