import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, AlertCircle, CalendarCheck2, Clock, ShieldCheck } from "lucide-react";
import Logo, { LogoMark } from "../../components/ui/Logo.jsx";
import Button from "../../components/ui/Button.jsx";
import { Input, Field as UIField } from "../../components/ui/Input.jsx";
import ThemeToggle from "../../components/ui/ThemeToggle.jsx";
import LottieFx from "../../components/ui/LottieFx.jsx";
import doctorAnim from "../../assets/lottie/doctor.json";
import { DURATION, EASE } from "../../lib/motion.js";

const BRAND_POINTS = [
  { icon: Clock, text: "An assistant that answers at 3 AM as readily as 3 PM" },
  { icon: ShieldCheck, text: "Every clinic licence-checked before it takes a booking" },
  { icon: CalendarCheck2, text: "From symptom to confirmed appointment in one chat" },
];

/** Split auth layout: brand story on the left (lg+), the form on the right.
 *  Left panel is decorative — it collapses away entirely on smaller screens. */
export default function AuthShell({ title, subtitle, children, footer, backTo = "/", backLabel = "Back to SmileDesk" }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden border-r border-border bg-card/40 lg:flex lg:flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[560px] -translate-x-1/2 rounded-full bg-primary/15 blur-[110px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-info/10 blur-[90px]"
        />

        <div className="relative flex h-full flex-col p-10">
          <Link to="/" aria-label="SmileDesk home">
            <Logo wordmark subtitle="AI dental receptionist" />
          </Link>

          <div className="flex flex-1 flex-col items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: DURATION.slow, ease: EASE.out, delay: 0.15 }}
            >
              <LottieFx animationData={doctorAnim} size={320} />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DURATION.slow, ease: EASE.out, delay: 0.25 }}
              className="mt-2 max-w-sm text-center text-2xl font-semibold tracking-tight text-foreground"
            >
              Care that starts the moment you say hello
            </motion.h2>
            <motion.ul
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.4 } } }}
              className="mt-8 space-y-3.5"
            >
              {BRAND_POINTS.map(({ icon: Icon, text }) => (
                <motion.li
                  key={text}
                  variants={{
                    hidden: { opacity: 0, x: -10 },
                    show: { opacity: 1, x: 0, transition: { duration: DURATION.moderate, ease: EASE.out } },
                  }}
                  className="flex items-start gap-3 text-sm text-muted-foreground"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {text}
                </motion.li>
              ))}
            </motion.ul>
          </div>

          <p className="text-2xs text-muted-foreground">
            Trusted by verified clinics · Available 24/7
          </p>
        </div>
      </aside>

      {/* Form column */}
      <div className="relative flex flex-col">
        <div className="flex items-center justify-between p-5">
          <Link
            to={backTo}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.slow, ease: EASE.out }}
            className="w-full max-w-sm"
          >
            <LogoMark className="mb-6 h-11 w-11 lg:hidden" />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 text-sm text-muted-foreground">{footer}</div>}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, ...props }) {
  return (
    <UIField label={label}>
      <Input {...props} />
    </UIField>
  );
}

export function ErrorText({ children }) {
  if (!children) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.base, ease: EASE.out }}
      className="mb-4 flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </motion.div>
  );
}

export function SubmitButton({ loading, children }) {
  return (
    <Button type="submit" size="lg" loading={loading} className="w-full">
      {children}
    </Button>
  );
}
