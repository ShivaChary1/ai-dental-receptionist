import { Suspense, lazy, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { EASE } from "../../lib/motion.js";
import { cn } from "../../lib/cn.js";
import { track } from "../../lib/analytics.js";

// Panels carry the chat stack (markdown, Lottie) — keep them off the initial bundle.
const AssistantPanel = lazy(() => import("./AssistantPanel.jsx"));
const ClinicPanel = lazy(() => import("./ClinicPanel.jsx"));

const OPEN_EVENT = "ivory:open-assistant";

/** Open the assistant from anywhere (hero chat bar, nav) without prop-drilling.
 *  Pass a message to have the assistant send it immediately on open. */
export function openAssistant(message) {
  // Guard: this is often used directly as onClick, where the arg is an event.
  const msg = typeof message === "string" ? message : undefined;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { message: msg } }));
}

/** Routes where the floating assistant would be redundant or in the way. */
const HIDDEN_PREFIXES = ["/chat", "/login", "/register", "/hospital", "/superadmin", "/dashboard"];

function PanelFallback() {
  return (
    <div className="flex h-full items-center justify-center bg-background">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-pulse rounded-full bg-primary/40 motion-reduce:animate-none"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [initialMessage, setInitialMessage] = useState(null);
  const location = useLocation();
  const reduce = useReducedMotion();

  useEffect(() => {
    const onOpen = (e) => {
      if (e.detail?.message) setInitialMessage(e.detail.message);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (open) track("assistant_opened", { path: location.pathname });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close when navigating so the panel never lingers over a new page.
  useEffect(() => { setOpen(false); setInitialMessage(null); }, [location.pathname]);

  // On a clinic page, the clinic's assistant introduces itself: auto-open once
  // per clinic per session. Desktop only — on mobile the panel is full-screen
  // and would hijack the page the patient just opened.
  useEffect(() => {
    const id = location.pathname.match(/^\/clinics\/([^/]+)$/)?.[1];
    if (!id || window.innerWidth < 640) return;
    const key = `smiledesk:clinic-widget-shown:${id}`;
    if (sessionStorage.getItem(key)) return;
    const t = setTimeout(() => {
      sessionStorage.setItem(key, "1");
      setOpen(true);
    }, 1200);
    return () => clearTimeout(t);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const hidden = HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p));
  if (hidden) return null;

  // On a clinic page the widget speaks as that clinic — one agent per page,
  // never the general assistant floating over a clinic conversation.
  const clinicId = location.pathname.match(/^\/clinics\/([^/]+)$/)?.[1] ?? null;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="assistant-panel"
            role="dialog"
            aria-label="SmileDesk assistant"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={
              reduce
                ? { opacity: 0, transition: { duration: 0.12 } }
                : { opacity: 0, y: 12, scale: 0.97, transition: { duration: 0.15, ease: EASE.in } }
            }
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={cn(
              "fixed z-50 flex flex-col overflow-hidden bg-background",
              // Mobile: full-screen sheet. Desktop: anchored panel above the launcher.
              "inset-0",
              "sm:inset-auto sm:bottom-24 sm:right-5 sm:h-[600px] sm:max-h-[calc(100vh-120px)] sm:w-[380px]",
              "sm:origin-bottom-right sm:rounded-2xl sm:border sm:border-border sm:shadow-lg"
            )}
          >
            <Suspense fallback={<PanelFallback />}>
              {clinicId ? (
                <ClinicPanel hospitalId={clinicId} onClose={() => setOpen(false)} />
              ) : (
                <AssistantPanel
                  onClose={() => setOpen(false)}
                  initialMessage={initialMessage}
                  onInitialMessageConsumed={() => setInitialMessage(null)}
                />
              )}
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close SmileDesk assistant" : "Chat with SmileDesk"}
        aria-expanded={open}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.4 }}
        whileHover={reduce ? undefined : { scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full",
          "bg-primary text-primary-foreground shadow-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          // On mobile the open panel is full-screen and has its own close button.
          open && "hidden sm:flex"
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? "close" : "chat"}
            initial={{ opacity: 0, rotate: -40, scale: 0.7 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 40, scale: 0.7 }}
            transition={{ duration: 0.15, ease: EASE.out }}
            className="flex"
          >
            {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
          </motion.span>
        </AnimatePresence>
        {!open && (
          <span
            aria-hidden
            className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-primary bg-success"
          />
        )}
      </motion.button>
    </>
  );
}
