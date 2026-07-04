import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import PatientTopBar from "../../components/PatientTopBar.jsx";
import Avatar from "../../components/ui/Avatar.jsx";
import AccountTabs from "./AccountTabs.jsx";

/** Shared frame for the account section. Both the Profile and My bookings
 *  tabs render inside the exact same container, identity header and tab
 *  switcher so switching tabs never shifts the layout. The header and tabs
 *  stay pinned — only the tab content scrolls. */
export default function AccountShell({ name, email, scrollRef, children }) {
  return (
    <div className="flex h-full flex-col">
      <PatientTopBar />

      {/* Pinned identity header + tab switcher */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="mx-auto max-w-5xl px-6 pt-6">
          <div className="mb-5 flex items-center gap-4">
            <Avatar name={name || email || "Patient"} size="lg" />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
                {name || "My account"}
              </h1>
              <p className="truncate text-sm text-muted-foreground">{email}</p>
            </div>
            <Link
              to="/clinics"
              className="ml-auto inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary transition-opacity hover:opacity-80"
            >
              Find a clinic <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <AccountTabs />
        </div>
      </div>

      {/* Scrolling content */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-6">{children}</div>
      </div>
    </div>
  );
}
