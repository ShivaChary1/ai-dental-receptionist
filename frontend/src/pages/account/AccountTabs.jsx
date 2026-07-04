import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarDays, UserRound } from "lucide-react";
import { cn } from "../../lib/cn.js";

const TABS = [
  { to: "/account", label: "Profile", icon: UserRound, end: true },
  { to: "/account/bookings", label: "My bookings", icon: CalendarDays },
];

/** Account section switcher — bookings live under the profile, not the nav. */
export default function AccountTabs() {
  return (
    <div className="mb-4 inline-flex rounded-lg border border-border bg-muted/60 p-0.5">
      {TABS.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className="relative rounded-md px-3.5 py-1.5">
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="accountTab"
                  className="absolute inset-0 rounded-md bg-primary shadow-primary"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span
                className={cn(
                  "relative inline-flex items-center gap-1.5 text-xs font-medium transition-colors",
                  isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}
