import { Inbox, Building2, Gauge } from "lucide-react";
import AppSidebar from "../../components/AppSidebar.jsx";

const NAV = [
  { to: "applications", label: "Applications", icon: Inbox },
  { to: "hospitals", label: "Live clinics", icon: Building2 },
  { to: "metrics", label: "Platform metrics", icon: Gauge },
];

export default function SuperAdminLayout() {
  return (
    <AppSidebar
      title="Platform super admin"
      subtitle="Super admin"
      nav={NAV}
      base="/superadmin"
      logoutTo="/superadmin/login"
    />
  );
}
