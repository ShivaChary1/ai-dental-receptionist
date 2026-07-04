import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Menu, UserRound, X } from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";
import Logo from "./ui/Logo.jsx";
import Button from "./ui/Button.jsx";
import Avatar from "./ui/Avatar.jsx";
import ThemeToggle from "./ui/ThemeToggle.jsx";
import { cn } from "../lib/cn.js";

const TABS = [
  { to: "/chat", label: "Assistant", end: true },
  { to: "/clinics", label: "Find a Clinic" },
];

function Tab({ to, label, end }) {
  return (
    <NavLink to={to} end={end} className="relative px-3 py-1.5">
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="patientTab"
              className="absolute inset-0 rounded-md bg-primary/10"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
          <span
            className={cn(
              "relative text-sm font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export default function PatientTopBar() {
  const { isPatient, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="relative flex items-center gap-4 px-5 py-2.5">
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
        className="-ml-1 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
      >
        {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      <Link to="/" className="shrink-0">
        <Logo wordmark />
      </Link>

      {/* Centered primary nav — absolute so it stays centered regardless of
          how wide the logo and account cluster are. */}
      <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-0.5 sm:flex">
        {TABS.map((t) => (
          <Tab key={t.to} {...t} />
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />
        {isPatient ? (
          <>
            <Link
              to="/account"
              className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-muted"
              title="Account"
            >
              <Avatar name={user?.name || user?.email || "Patient"} size="sm" />
              <span className="hidden max-w-[10rem] truncate text-sm font-medium text-foreground md:block">
                {user?.name || user?.email || user?.phone}
              </span>
            </Link>
            <Button variant="ghost" size="icon" onClick={logout} title="Log out" aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className="inline-flex h-8 items-center gap-1.5 rounded px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <UserRound className="h-3.5 w-3.5" /> Login
            </Link>
            <Link
              to="/apply"
              className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-primary transition-colors hover:bg-primary-hover"
            >
              List your clinic
            </Link>
          </>
        )}
      </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-border sm:hidden"
          >
            <div className="space-y-1 px-4 py-2">
              {TABS.map((t) => {
                const active = t.end
                  ? location.pathname === t.to
                  : location.pathname.startsWith(t.to);
                return (
                  <NavLink
                    key={t.to}
                    to={t.to}
                    end={t.end}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {t.label}
                  </NavLink>
                );
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
