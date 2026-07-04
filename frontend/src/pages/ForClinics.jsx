import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  KeyRound,
  LayoutGrid,
  MessagesSquare,
  ShieldCheck,
} from "lucide-react";
import api from "../api/axios.js";
import { useAuth } from "../auth/AuthContext.jsx";
import Logo from "../components/ui/Logo.jsx";
import ThemeToggle from "../components/ui/ThemeToggle.jsx";
import Button from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Field, Input } from "../components/ui/Input.jsx";
import Seo from "../components/Seo.jsx";
import { DURATION, EASE, staggerContainer, listItem } from "../lib/motion.js";

const reveal = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE.out } },
};
const viewportOnce = { once: true, margin: "-80px 0px" };

function Nav() {
  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: DURATION.moderate, ease: EASE.out }}
      className="fixed inset-x-0 top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5">
        <Link to="/" aria-label="SmileDesk home">
          <Logo wordmark />
        </Link>
        <span className="hidden rounded-full border border-info/25 bg-info/8 px-2.5 py-0.5 text-xs font-medium text-info sm:inline-flex sm:items-center sm:gap-1">
          <Building2 className="h-3 w-3" /> For clinics
        </span>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/"
            className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:block"
          >
            For patients
          </Link>
          <Link to="/apply">
            <Button size="md" rightIcon={ArrowRight}>List your clinic</Button>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}

/** Clinic sign-in, right on the page — no URL hunting. */
function LoginCard() {
  const { login, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/api/hospital/login", { email, password });
      login(data);
      navigate("/hospital", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated && role === "hospital") {
    return (
      <Card className="p-6 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-success/10 text-success">
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">You're signed in</h3>
        <p className="mt-1 text-sm text-muted-foreground">Your clinic dashboard is ready.</p>
        <Link to="/hospital" className="mt-5 block">
          <Button size="lg" rightIcon={ArrowRight} className="w-full">Open dashboard</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <KeyRound className="h-4 w-4" />
        </span>
        <div>
          <h3 className="font-semibold tracking-tight text-foreground">Clinic sign in</h3>
          <p className="text-xs text-muted-foreground">Use the credentials sent when your clinic was approved.</p>
        </div>
      </div>
      {error && <p className="mt-4 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <form onSubmit={submit} className="mt-5">
        <Field label="Email">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourclinic.com" />
        </Field>
        <Field label="Password">
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button type="submit" size="lg" loading={loading} className="w-full">Sign in to dashboard</Button>
      </form>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Not listed yet?{" "}
        <Link to="/apply" className="font-medium text-primary transition-opacity hover:opacity-80">
          Apply in 5 minutes
        </Link>
      </p>
    </Card>
  );
}

const PERKS = [
  {
    icon: MessagesSquare,
    title: "An AI receptionist that never sleeps",
    body: "SmileDesk answers patient questions with your clinic's own knowledge and books appointments at 3 AM as happily as 3 PM.",
  },
  {
    icon: CalendarClock,
    title: "Your calendar, respected",
    body: "Set doctor hours and holidays, link each doctor's Google Calendar — bookings only land in genuinely free slots and appear on their calendar automatically.",
  },
  {
    icon: CalendarDays,
    title: "Fewer no-shows",
    body: "Patients get WhatsApp and email reminders 24 hours and 1 hour ahead, and confirm attendance with one tap — you see who's coming.",
  },
  {
    icon: BarChart3,
    title: "Know what's working",
    body: "Bookings, conversations, peak slots, and per-doctor demand in one dashboard, updated live.",
  },
];

const STEPS = [
  {
    icon: ClipboardList,
    title: "Apply",
    body: "Tell us about your clinic, doctors, and services — takes about five minutes.",
  },
  {
    icon: ShieldCheck,
    title: "Get verified",
    body: "Our team checks your licence and details. Most clinics are approved within a day.",
  },
  {
    icon: KeyRound,
    title: "Receive your login",
    body: "Approval comes with dashboard credentials for the email on your application.",
  },
  {
    icon: LayoutGrid,
    title: "Go live",
    body: "Patients find you in the directory and the AI books into your schedule from day one.",
  },
];

export default function ForClinics() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="For clinics — grow with SmileDesk"
        description="List your dental clinic on SmileDesk: an AI receptionist that answers patients 24/7, books into your real schedule, and cuts no-shows."
      />
      <Nav />
      <main>
        {/* Hero: pitch left, sign-in right */}
        <section className="relative overflow-hidden pb-16 pt-28 sm:pt-36">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[760px] -translate-x-1/2 rounded-full bg-primary/12 blur-[120px]"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-[1.1fr_0.9fr]">
            <motion.div variants={reveal} initial="hidden" animate="show">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Fill the chairs,{" "}
                <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
                  skip the phone tag
                </span>
              </h1>
              <p className="mt-5 max-w-lg text-md leading-relaxed text-muted-foreground">
                SmileDesk puts your clinic in front of patients the moment they
                describe a symptom — then answers their questions, books into
                your real schedule, and reminds them to show up.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/apply">
                  <Button size="lg" rightIcon={ArrowRight}>List your clinic — free</Button>
                </Link>
                <a href="#how-onboarding">
                  <Button size="lg" variant="secondary">How it works</Button>
                </a>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-success" /> Licence-verified directory
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-primary" /> Google Calendar sync
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: EASE.out, delay: 0.15 }}
            >
              <LoginCard />
            </motion.div>
          </div>
        </section>

        {/* Perks */}
        <section className="border-y border-border bg-card/40 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={viewportOnce}
              className="grid gap-5 sm:grid-cols-2"
            >
              {PERKS.map(({ icon: Icon, title, body }) => (
                <motion.div
                  key={title}
                  variants={listItem}
                  className="rounded-xl border border-border bg-card p-6 shadow-xs transition-shadow duration-moderate ease-out hover:shadow-md"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-md font-semibold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Onboarding steps */}
        <section id="how-onboarding" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16 sm:py-24">
          <motion.div variants={reveal} initial="hidden" whileInView="show" viewport={viewportOnce} className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">Getting listed</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              From application to first booking
            </h2>
          </motion.div>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
          >
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <motion.div key={title} variants={listItem} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-primary/25 bg-background text-primary shadow-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-3 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {i + 1}
                </div>
                <h3 className="mt-1 text-md font-semibold text-foreground">{title}</h3>
                <p className="mx-auto mt-2 max-w-[240px] text-sm leading-relaxed text-muted-foreground">{body}</p>
              </motion.div>
            ))}
          </motion.div>
          <motion.div variants={reveal} initial="hidden" whileInView="show" viewport={viewportOnce} className="mt-12 text-center">
            <Link to="/apply">
              <Button size="lg" rightIcon={ArrowRight}>Start your application</Button>
            </Link>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <Logo wordmark subtitle="AI dental receptionist" />
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <Link to="/" className="transition-colors hover:text-foreground">For patients</Link>
            <Link to="/apply" className="transition-colors hover:text-foreground">List your clinic</Link>
            <Link to="/hospital/login" className="transition-colors hover:text-foreground">Clinic sign in</Link>
          </nav>
          <div className="text-2xs text-muted-foreground">© {new Date().getFullYear()} SmileDesk</div>
        </div>
      </footer>
    </div>
  );
}
