import { LayoutGrid, CalendarDays, MessagesSquare, BrainCircuit } from "lucide-react";
import AppSidebar from "../../components/AppSidebar.jsx";

const NAV = [
  { to: "overview", label: "Overview", icon: LayoutGrid },
  { to: "appointments", label: "Appointments", icon: CalendarDays },
  { to: "conversations", label: "Conversations", icon: MessagesSquare },
  { to: "knowledge", label: "Agent knowledge", icon: BrainCircuit },
];

export default function DashboardLayout() {
  return (
    <AppSidebar
      title="Admin dashboard"
      subtitle="Legacy admin"
      nav={NAV}
      base="/dashboard"
      logoutTo="/"
    />
  );
}
