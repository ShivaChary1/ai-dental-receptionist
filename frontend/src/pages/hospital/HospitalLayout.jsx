import { LayoutGrid, MessagesSquare, CalendarDays, CalendarClock, Building2, BarChart3 } from "lucide-react";
import AppSidebar from "../../components/AppSidebar.jsx";

const NAV = [
  { to: "overview", label: "Overview", icon: LayoutGrid },
  { to: "conversations", label: "Conversations", icon: MessagesSquare },
  { to: "bookings", label: "Bookings", icon: CalendarDays },
  { to: "schedule", label: "Schedule", icon: CalendarClock },
  { to: "profile", label: "Clinic profile", icon: Building2 },
  { to: "insights", label: "Insights", icon: BarChart3 },
];

export default function HospitalLayout() {
  return (
    <AppSidebar
      title="Clinic dashboard"
      subtitle="Clinic admin"
      nav={NAV}
      base="/hospital"
      logoutTo="/hospital/login"
    />
  );
}
