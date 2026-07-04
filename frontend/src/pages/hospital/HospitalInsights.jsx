import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, MessagesSquare, TrendingUp, Repeat } from "lucide-react";
import api from "../../api/axios.js";
import SimpleBars from "../../components/SimpleBars.jsx";
import Stat from "../../components/ui/Stat.jsx";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card.jsx";
import { SkeletonStat } from "../../components/ui/Skeleton.jsx";
import { staggerContainer, listItem } from "../../lib/motion.js";

function Panel({ title, children }) {
  return (
    <motion.div variants={listItem}>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  );
}

export default function HospitalInsights() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/api/hospital/insights").then(({ data }) => setD(data)); }, []);

  if (!d) {
    return (
      <div className="grid grid-cols-4 gap-4">
        <SkeletonStat /><SkeletonStat /><SkeletonStat /><SkeletonStat />
      </div>
    );
  }

  const t = d.totals;
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <Stat label="Bookings" value={t.bookings} icon={CalendarDays} />
        <Stat label="Conversations" value={t.conversations} icon={MessagesSquare} />
        <Stat label="Conversion (bookings / convo)" value={t.booking_conversion_rate} icon={TrendingUp} />
        <Stat label="Cancel / reschedule rate" value={`${Math.round(t.cancel_reschedule_rate * 100)}%`} icon={Repeat} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Conversation volume (last 14 days)">
          <SimpleBars data={d.conversation_volume} labelKey="date" valueKey="count" />
        </Panel>
        <Panel title="Per-doctor bookings">
          <SimpleBars data={d.per_doctor} labelKey="doctor" valueKey="count" color="bg-success" />
        </Panel>
        <Panel title="Peak time slots">
          <SimpleBars data={d.peak_slots} labelKey="slot" valueKey="count" color="bg-warning" />
        </Panel>
        <Panel title="Common patient terms">
          <SimpleBars data={d.common_terms} labelKey="term" valueKey="count" color="bg-info" />
        </Panel>
      </div>
    </motion.div>
  );
}
