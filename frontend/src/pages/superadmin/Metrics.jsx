import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2, PauseCircle, Inbox, CalendarDays, CalendarX2, Users, MessagesSquare,
} from "lucide-react";
import api from "../../api/axios.js";
import Stat from "../../components/ui/Stat.jsx";
import { SkeletonStat } from "../../components/ui/Skeleton.jsx";
import { staggerContainer } from "../../lib/motion.js";

export default function Metrics() {
  const [m, setM] = useState(null);
  useEffect(() => { api.get("/api/superadmin/metrics").then(({ data }) => setM(data)); }, []);

  if (!m) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonStat key={i} />)}
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="grid grid-cols-3 gap-4"
    >
      <Stat label="Active clinics" value={m.hospitals_active} icon={Building2} />
      <Stat label="Suspended clinics" value={m.hospitals_suspended} icon={PauseCircle} />
      <Stat label="Pending applications" value={m.applications_pending} icon={Inbox} />
      <Stat label="Total bookings" value={m.total_bookings} icon={CalendarDays} />
      <Stat label="Cancelled bookings" value={m.cancelled_bookings} icon={CalendarX2} />
      <Stat label="Patients" value={m.patients} icon={Users} />
      <Stat label="Conversations" value={m.conversations} icon={MessagesSquare} />
    </motion.div>
  );
}
