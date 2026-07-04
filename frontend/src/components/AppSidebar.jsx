import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";
import Logo from "./ui/Logo.jsx";
import ThemeToggle from "./ui/ThemeToggle.jsx";
import Avatar from "./ui/Avatar.jsx";
import { DURATION, EASE } from "../lib/motion.js";

/**
 * Shared sidebar shell for the hospital and super-admin apps.
 * `nav` is [{ to, label, icon: LucideIcon, end? }]; routes are relative to `base`.
 * The active pill slides between items via a shared layoutId.
 */
export default function AppSidebar({ title, subtitle, nav, base, logoutTo = "/" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  return (
    <div className="flex h-full bg-background">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card">
        <div className="px-5 pb-4 pt-5">
          <Logo subtitle={subtitle} />
        </div>

        <nav className="flex-1 space-y-0.5 px-3">
          {nav.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to}
                to={`${base}/${n.to}`}
                end={n.end}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                    isActive ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="sidebarNav"
                        className="absolute inset-0 rounded-lg bg-primary/10"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <Icon className="relative h-4 w-4 shrink-0" aria-hidden />
                    <span className="relative">{n.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <Avatar name={user?.name || user?.email} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">
                {user?.name || user?.email}
              </p>
              {user?.name && user?.email && (
                <p className="truncate text-2xs text-muted-foreground">{user.email}</p>
              )}
            </div>
            <button
              onClick={() => {
                logout();
                navigate(logoutTo);
              }}
              title="Log out"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="sr-only">Log out</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-border bg-background/80 px-6 py-3 backdrop-blur-md">
          <h1 className="text-md font-semibold tracking-tight text-foreground">{title}</h1>
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: DURATION.base, ease: EASE.out }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
