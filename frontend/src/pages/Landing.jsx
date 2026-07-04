import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useScroll,
  useTransform,
  useInView,
  useReducedMotion,
  animate,
} from "framer-motion";
import {
  ArrowRight,
  Building2,
  CalendarCheck2,
  CalendarDays,
  Clock,
  HeartPulse,
  MapPin,
  Menu,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  X,
} from "lucide-react";
import Logo, { LogoMark } from "../components/ui/Logo.jsx";
import ThemeToggle from "../components/ui/ThemeToggle.jsx";
import Button from "../components/ui/Button.jsx";
import Avatar from "../components/ui/Avatar.jsx";
import { useAuth, homePathFor } from "../auth/AuthContext.jsx";
import Seo from "../components/Seo.jsx";
import { DURATION, EASE, staggerContainer, listItem } from "../lib/motion.js";
import { cn } from "../lib/cn.js";

/* ── Shared reveal: fade + rise when scrolled into view, once ─────────── */
const reveal = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE.out } },
};
const viewportOnce = { once: true, margin: "-80px 0px" };

/* ── Decorative background: teal glow field + faint grid ──────────────── */
function GlowField() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-40 left-1/2 h-[560px] w-[840px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
      <div className="absolute -right-32 top-64 h-96 w-96 rounded-full bg-info/10 blur-[100px]" />
      <div
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.22]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(var(--border)/0.55) 1px, transparent 1px), linear-gradient(90deg, oklch(var(--border)/0.55) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 90% 60% at 50% 0%, black 55%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 60% at 50% 0%, black 55%, transparent 100%)",
        }}
      />
    </div>
  );
}

/* ── Nav: transparent at rest, elevates once the page scrolls ─────────── */
const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { to: "/for-clinics", label: "For clinics" },
];

function LandingNav() {
  const { isAuthenticated, role, user, logout } = useAuth();
  const accountPath = homePathFor(role);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: DURATION.moderate, ease: EASE.out }}
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-moderate ease-out",
        scrolled || menuOpen
          ? "border-b border-border bg-background/80 shadow-xs backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
        <Link to="/" aria-label="SmileDesk home">
          <Logo wordmark />
        </Link>
        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => {
            const cls =
              "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
            return l.to ? (
              <Link key={l.label} to={l.to} className={cls}>{l.label}</Link>
            ) : (
              <a key={l.label} href={l.href} className={cls}>{l.label}</a>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to={accountPath}
              title="My account"
              className="hidden items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-muted sm:flex"
            >
              <Avatar name={user?.name || user?.email || "Account"} size="sm" />
              <span className="max-w-[140px] truncate text-sm font-medium text-foreground">
                {user?.name || "My account"}
              </span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:block"
            >
              Sign in
            </Link>
          )}
          <Link to="/chat" className="hidden sm:block">
            <Button size="md" rightIcon={ArrowRight}>
              Talk to SmileDesk
            </Button>
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0, transition: { duration: 0.15, ease: EASE.in } }}
            transition={{ duration: 0.25, ease: EASE.out }}
            className="overflow-hidden border-t border-border md:hidden"
          >
            <div className="space-y-1 px-5 py-3">
              {NAV_LINKS.map((l) => {
                const cls =
                  "block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
                return l.to ? (
                  <Link key={l.label} to={l.to} onClick={() => setMenuOpen(false)} className={cls}>
                    {l.label}
                  </Link>
                ) : (
                  <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)} className={cls}>
                    {l.label}
                  </a>
                );
              })}
              {isAuthenticated ? (
                <>
                  <Link
                    to={accountPath}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <Avatar name={user?.name || user?.email || "Account"} size="sm" />
                    <span className="truncate">{user?.name || "My account"}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => { logout(); setMenuOpen(false); }}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Sign in
                </Link>
              )}
              <Link to="/chat" className="block" onClick={() => setMenuOpen(false)}>
                <Button className="w-full" rightIcon={ArrowRight}>
                  Talk to SmileDesk
                </Button>
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

/* ── Hero chat mockup: the product, animated, no screenshots needed ───── */
const CHAT_SCRIPT = [
  { role: "user", text: "My tooth aches when I drink cold water" },
  {
    role: "ai",
    text: "That sounds like dentin sensitivity — often treatable in one visit. Want me to find a clinic near you?",
  },
  { role: "user", text: "Yes please, somewhere close by" },
  {
    role: "ai",
    text: "Smile Dental Care is 1.2 km away, rated 4.8 ★. Dr. Rao has a slot tomorrow at 10:30 AM — shall I book it?",
  },
];

function ChatBubbleFx({ role, text, delay }) {
  const isUser = role === "user";
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14, scale: 0.97 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: 0.4, ease: EASE.out, delay },
        },
      }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground shadow-primary"
            : "rounded-bl-md border border-border bg-card text-card-foreground shadow-xs"
        )}
      >
        {text}
      </div>
    </motion.div>
  );
}

function TypingDots() {
  const reduce = useReducedMotion();
  return (
    <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-3 shadow-xs">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70"
          animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.18, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/** Small floating cards around the mockup — slow, weightless drift. */
function FloatCard({ className, children, drift = -8, duration = 6, delay = 0 }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: EASE.out, delay: 0.9 + delay }}
      className={cn("absolute", className)}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, drift, 0] }}
        transition={{ repeat: Infinity, duration, ease: "easeInOut", delay }}
        className="flex items-center gap-2.5 rounded-xl border border-border bg-card/95 px-3.5 py-2.5 shadow-lg backdrop-blur-sm"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function HeroMockup() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [24, -32]);

  return (
    <motion.div ref={ref} style={{ y }} className="relative mx-auto w-full max-w-md">
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-80px 0px" }}
        transition={{ duration: 0.55, ease: EASE.out }}
        className="overflow-hidden rounded-2xl border border-border bg-background/80 shadow-lg backdrop-blur-sm"
      >
        <div className="flex items-center gap-2.5 border-b border-border bg-card/60 px-4 py-3">
          <LogoMark className="h-7 w-7" />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-foreground">SmileDesk Assistant</div>
            <div className="flex items-center gap-1.5 text-2xs text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60 motion-reduce:animate-none" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              </span>
              Online — replies in seconds
            </div>
          </div>
        </div>
        <motion.div
          variants={{ hidden: {}, show: {} }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px 0px" }}
          className="space-y-3 p-4"
        >
          {CHAT_SCRIPT.map((m, i) => (
            <ChatBubbleFx key={i} {...m} delay={0.7 + i * 0.55} />
          ))}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 + CHAT_SCRIPT.length * 0.55, duration: 0.3 }}
            className="flex"
          >
            <TypingDots />
          </motion.div>
        </motion.div>
      </motion.div>

      <FloatCard className="-left-6 top-8 hidden sm:block" drift={-8} duration={6}>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/12 text-success">
          <CalendarCheck2 className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <div className="text-xs font-semibold text-foreground">Booking confirmed</div>
          <div className="text-2xs text-muted-foreground">Tomorrow · 10:30 AM</div>
        </div>
      </FloatCard>

      <FloatCard className="-right-8 bottom-16 hidden sm:block" drift={-10} duration={7} delay={0.6}>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/12 text-warning">
          <Star className="h-4 w-4 fill-current" />
        </span>
        <div className="leading-tight">
          <div className="text-xs font-semibold text-foreground">4.8 rating</div>
          <div className="text-2xs text-muted-foreground">1.2 km away</div>
        </div>
      </FloatCard>
    </motion.div>
  );
}

/* ── Hero copy: word-by-word headline reveal ──────────────────────────── */
function Headline() {
  const words = ["Your", "dental", "front", "desk,"];
  return (
    <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
      <span className="sr-only">Your dental front desk, awake around the clock</span>
      <span aria-hidden>
        {words.map((w, i) => (
          <motion.span
            key={i}
            className="inline-block"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE.out, delay: 0.1 + i * 0.06 }}
          >
            {w}&nbsp;
          </motion.span>
        ))}
        <motion.span
          className="inline-block bg-gradient-to-r from-primary to-info bg-clip-text text-transparent"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE.out, delay: 0.1 + words.length * 0.06 }}
        >
          awake around the clock.
        </motion.span>
      </span>
    </h1>
  );
}

/* ── Hero chat bar: talk to SmileDesk straight from the fold ──────────────── */
const HERO_PROMPTS = [
  "My tooth aches when I drink cold water",
  "I chipped a tooth — is it urgent?",
  "Find a clinic near me for a cleaning",
];

function HeroChatBar() {
  const [value, setValue] = useState("");
  const navigate = useNavigate();

  // The chat bar is the front door to the full assistant page — asking here
  // lands you in /chat with the question already sent, not in the widget.
  const ask = (text) => {
    const message = (text ?? value).trim();
    if (!message) return;
    setValue("");
    navigate("/chat", { state: { ask: message } });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: EASE.out, delay: 0.45 }}
      className="mx-auto mt-9 w-full max-w-2xl"
    >
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-lg",
          "transition-[border-color,box-shadow] duration-base ease-out",
          "focus-within:border-primary/50 focus-within:shadow-primary"
        )}
      >
        <span className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="Describe your dental concern — SmileDesk replies in seconds…"
          aria-label="Ask SmileDesk"
          className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-md text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <Button size="lg" rightIcon={ArrowRight} onClick={() => ask()} disabled={!value.trim()}>
          <span className="hidden sm:inline">Ask SmileDesk</span>
          <span className="sm:hidden">Ask</span>
        </Button>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mt-4 flex flex-wrap justify-center gap-2"
      >
        {HERO_PROMPTS.map((p) => (
          <motion.button
            key={p}
            variants={listItem}
            onClick={() => ask(p)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-xs backdrop-blur-sm transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
          >
            <MessagesSquare className="h-3 w-3 text-primary" /> {p}
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden pb-16 pt-32 sm:pb-20 sm:pt-40">
      <GlowField />
      <div className="relative mx-auto max-w-4xl px-5 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE.out }}
          className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-xs font-medium text-primary"
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI receptionist for dental care
        </motion.div>

        <Headline />

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE.out, delay: 0.4 }}
          className="mx-auto mt-5 max-w-xl text-md leading-relaxed text-muted-foreground"
        >
          Ask about a symptom, find a verified clinic, or book a visit — right
          here, no account needed.
        </motion.p>

        <HeroChatBar />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground"
        >
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-success" /> Verified clinics only
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" /> Available 24/7
          </span>
          <span className="inline-flex items-center gap-1.5">
            <HeartPulse className="h-3.5 w-3.5 text-destructive" /> Symptom-aware triage
          </span>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Showcase: the former hero split, now the "see it in action" section ── */
function Showcase() {
  return (
    <section className="relative mx-auto max-w-6xl px-5 pb-20 sm:pb-28">
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <motion.div variants={reveal} initial="hidden" whileInView="show" viewport={viewportOnce}>
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">
            See it in action
          </div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            One conversation, start to booked
          </h2>
          <p className="mt-4 max-w-lg text-md leading-relaxed text-muted-foreground">
            SmileDesk triages symptoms, recommends nearby clinics, and books
            appointments in one conversation — so patients get care faster and
            clinics never miss a call.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/chat">
              <Button size="lg" rightIcon={ArrowRight}>
                Start a conversation
              </Button>
            </Link>
            <Link to="/clinics">
              <Button size="lg" variant="secondary" leftIcon={MapPin}>
                Find a clinic
              </Button>
            </Link>
          </div>
        </motion.div>

        <HeroMockup />
      </div>
    </section>
  );
}

/* ── Animated counters ────────────────────────────────────────────────── */
function Counter({ to, suffix = "", decimals = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px 0px" });
  const reduce = useReducedMotion();
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setVal(to);
      return;
    }
    const controls = animate(0, to, {
      duration: 1.4,
      ease: EASE.out,
      onUpdate: (v) => setVal(v),
    });
    return () => controls.stop();
  }, [inView, to, reduce]);

  return (
    <span ref={ref} className="tabular-nums">
      {decimals ? val.toFixed(decimals) : Math.round(val).toLocaleString()}
      {suffix}
    </span>
  );
}

const STATS = [
  { to: 24, suffix: "/7", label: "Always answering" },
  { to: 90, suffix: "s", label: "Median time to booking" },
  { to: 4.8, decimals: 1, label: "Average clinic rating" },
  { to: 100, suffix: "%", label: "Calls never missed" },
];

function StatsBand() {
  return (
    <section className="border-y border-border bg-card/50">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-5 py-12 sm:grid-cols-4"
      >
        {STATS.map((s) => (
          <motion.div key={s.label} variants={listItem} className="text-center">
            <div className="text-3xl font-semibold tracking-tight text-foreground">
              <Counter to={s.to} suffix={s.suffix} decimals={s.decimals} />
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

/* ── Features: bento grid — varied card sizes, visuals inside the big ones ── */
function BentoCard({ className, icon: Icon, title, body, children }) {
  return (
    <motion.div
      variants={listItem}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn(
        "group flex flex-col rounded-xl border border-border bg-card p-6 shadow-xs",
        "transition-shadow duration-moderate ease-out hover:shadow-md",
        className
      )}
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-base group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-md font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
      {children}
    </motion.div>
  );
}

/** Static mini chat exchange for the triage bento card. */
function TriageVisual() {
  return (
    <div className="mt-5 space-y-2 rounded-lg border border-border bg-background/60 p-3">
      <div className="flex justify-end">
        <span className="rounded-xl rounded-br-sm bg-primary px-2.5 py-1.5 text-xs text-primary-foreground">
          I chipped a tooth — is it urgent?
        </span>
      </div>
      <div className="flex">
        <span className="rounded-xl rounded-bl-sm border border-border bg-card px-2.5 py-1.5 text-xs text-foreground">
          If there's no pain or bleeding it can wait until tomorrow — I found 3 clinics with morning slots.
        </span>
      </div>
    </div>
  );
}

/** Timeline strip for the 24/7 bento card — a 3 AM booking highlighted. */
function AlwaysOnVisual() {
  const slots = ["11 PM", "1 AM", "3 AM", "5 AM", "7 AM", "9 AM"];
  return (
    <div className="mt-5 rounded-lg border border-border bg-background/60 p-4">
      <div className="flex items-center justify-between">
        {slots.map((t) => (
          <div key={t} className="flex flex-col items-center gap-1.5">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                t === "3 AM" ? "bg-primary ring-4 ring-primary/20" : "bg-border"
              )}
            />
            <span className={cn("text-2xs", t === "3 AM" ? "font-semibold text-primary" : "text-muted-foreground")}>
              {t}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-2xs text-muted-foreground">
        <span className="font-medium text-foreground">3:04 AM</span> — cleaning booked while the clinic slept
      </p>
    </div>
  );
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20 sm:py-28">
      <motion.div
        variants={reveal}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        className="mx-auto max-w-2xl text-center"
      >
        <div className="text-xs font-semibold uppercase tracking-wider text-primary">Features</div>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Everything a great front desk does — without the hold music
        </h2>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        <BentoCard
          className="sm:col-span-2"
          icon={HeartPulse}
          title="Symptom-aware triage"
          body="Describe your pain the way you'd say it out loud. SmileDesk understands dental symptoms, knows when it's urgent, and says so plainly."
        >
          <TriageVisual />
        </BentoCard>

        <BentoCard
          icon={MapPin}
          title="Clinics near you"
          body="Recommendations ranked by distance and rating, from a directory of verified clinics only."
        />

        <BentoCard
          icon={CalendarDays}
          title="Instant booking"
          body="Pick a doctor and a slot inside the chat. Confirmation lands before the conversation ends."
        />

        <BentoCard
          icon={MessagesSquare}
          title="One continuous thread"
          body="Your history follows the conversation — no repeating yourself to a new receptionist."
        />

        <BentoCard
          icon={ShieldCheck}
          title="Verified providers"
          body="Every clinic is licence-checked and reviewed before it can take a single booking."
        />

        <BentoCard
          className="sm:col-span-2 lg:col-span-3"
          icon={Clock}
          title="No opening hours"
          body="Toothaches don't wait for 9 AM. SmileDesk answers at 3 AM with the same care as 3 PM."
        >
          <AlwaysOnVisual />
        </BentoCard>
      </motion.div>
    </section>
  );
}

/* ── How it works: 3 steps on a gradient rail ─────────────────────────── */
const STEPS = [
  {
    icon: MessagesSquare,
    title: "Tell SmileDesk what hurts",
    body: "Type it like you'd say it. \"My tooth aches when I drink cold water\" is a perfectly good start.",
  },
  {
    icon: Stethoscope,
    title: "Get triaged and matched",
    body: "SmileDesk assesses urgency, explains what's likely going on, and shortlists nearby clinics that fit.",
  },
  {
    icon: CalendarCheck2,
    title: "Book in the same breath",
    body: "Choose a doctor and time without leaving the chat. Manage or reschedule from your account.",
  },
];

function HowItWorks() {
  return (
    <section id="how" className="relative scroll-mt-24 border-y border-border bg-card/40 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <motion.div
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mx-auto max-w-2xl text-center"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">
            How it works
          </div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            From “ow” to appointment in three steps
          </h2>
        </motion.div>

        <div className="relative mt-16">
          <motion.div
            aria-hidden
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={viewportOnce}
            transition={{ duration: 0.9, ease: EASE.out, delay: 0.2 }}
            className="absolute left-[16.6%] right-[16.6%] top-6 hidden h-px origin-left bg-gradient-to-r from-primary/60 via-primary/25 to-primary/60 lg:block"
          />
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            className="grid grid-cols-1 gap-10 lg:grid-cols-3"
          >
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <motion.div key={title} variants={listItem} className="relative text-center">
                <div className="relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-primary/25 bg-background text-primary shadow-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-4 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {i + 1}
                </div>
                <h3 className="mt-1.5 text-md font-semibold text-foreground">{title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ── For clinics: split with animated mini-dashboard ──────────────────── */
function MiniBar({ value, delay }) {
  return (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={viewportOnce}
        transition={{ duration: 0.7, ease: EASE.out, delay }}
        style={{ width: `${value}%` }}
        className="h-full origin-left rounded-full bg-primary"
      />
    </div>
  );
}

function DashboardMockup() {
  const rows = [
    { label: "Mon", value: 62 },
    { label: "Tue", value: 84 },
    { label: "Wed", value: 71 },
    { label: "Thu", value: 96 },
    { label: "Fri", value: 78 },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={viewportOnce}
      transition={{ duration: 0.55, ease: EASE.out }}
      className="rounded-2xl border border-border bg-background/80 p-5 shadow-lg backdrop-blur-sm"
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">This week</div>
        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-2xs font-medium text-success">
          <span className="h-1 w-1 rounded-full bg-success" /> Live
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          { label: "Bookings", value: "128", trend: "+18%" },
          { label: "AI conversations", value: "342", trend: "+41%" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-3">
            <div className="text-2xs text-muted-foreground">{s.label}</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-semibold tabular-nums text-foreground">{s.value}</span>
              <span className="text-2xs font-medium text-success">{s.trend}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2.5">
        {rows.map((r, i) => (
          <div key={r.label} className="flex items-center gap-3">
            <span className="w-8 text-2xs text-muted-foreground">{r.label}</span>
            <MiniBar value={r.value} delay={0.2 + i * 0.08} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ForClinics() {
  const points = [
    "SmileDesk answers every patient enquiry, day or night",
    "Bookings, conversations, and insights in one dashboard",
    "Get listed after a quick licence verification",
  ];
  return (
    <section id="clinics" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20 sm:py-28">
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <motion.div variants={reveal} initial="hidden" whileInView="show" viewport={viewportOnce}>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-info/25 bg-info/8 px-3 py-1 text-xs font-medium text-info">
            <Building2 className="h-3.5 w-3.5" /> For clinics
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Fill the chairs, skip the phone tag
          </h2>
          <p className="mt-4 max-w-lg text-md leading-relaxed text-muted-foreground">
            SmileDesk becomes your always-on receptionist: it answers patient
            questions with your clinic's own knowledge, books straight into
            your calendar, and shows you exactly what's working.
          </p>
          <ul className="mt-6 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm text-foreground">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/12 text-success">
                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" aria-hidden>
                    <path d="M2.5 6.5 5 9l4.5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {p}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/apply">
              <Button size="lg" rightIcon={ArrowRight}>List your clinic</Button>
            </Link>
            <Link to="/for-clinics">
              <Button size="lg" variant="secondary">Clinic sign in</Button>
            </Link>
          </div>
        </motion.div>

        <DashboardMockup />
      </div>
    </section>
  );
}

/* ── Closing CTA ──────────────────────────────────────────────────────── */
function ClosingCta() {
  return (
    <section className="px-5 pb-24">
      <motion.div
        variants={reveal}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        className="relative mx-auto max-w-5xl overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/12 via-background to-info/10 px-6 py-16 text-center shadow-lg sm:py-20"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[480px] -translate-x-1/2 rounded-full bg-primary/20 blur-[90px]"
        />
        <LogoMark className="relative mx-auto h-12 w-12" />
        <h2 className="relative mt-6 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Your smile shouldn't wait on hold
        </h2>
        <p className="relative mx-auto mt-3 max-w-md text-md text-muted-foreground">
          Describe your symptom, get matched to a verified clinic, and walk out
          with an appointment — all in one chat.
        </p>
        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/chat">
            <Button size="lg" rightIcon={ArrowRight}>
              Talk to SmileDesk — it's free
            </Button>
          </Link>
          <Link to="/for-clinics">
            <Button size="lg" variant="secondary">I run a clinic</Button>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
        <Logo wordmark subtitle="AI dental receptionist" />
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <Link to="/clinics" className="transition-colors hover:text-foreground">Find a clinic</Link>
          <Link to="/for-clinics" className="transition-colors hover:text-foreground">For clinics</Link>
          <Link to="/for-clinics" className="transition-colors hover:text-foreground">Clinic sign in</Link>
          <Link to="/login" className="transition-colors hover:text-foreground">Patient sign in</Link>
        </nav>
        <div className="text-2xs text-muted-foreground">
          © {new Date().getFullYear()} SmileDesk
        </div>
      </div>
    </footer>
  );
}

/* ── Scroll progress: thin brand line under the nav ───────────────────── */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <motion.div
      style={{ scaleX: scrollYProgress }}
      className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-gradient-to-r from-primary to-info"
      aria-hidden
    />
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="Your dental front desk, awake around the clock"
        description="SmileDesk triages dental symptoms, recommends verified clinics near you, and books appointments in one conversation — free, 24/7."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "SmileDesk",
          description: "AI dental receptionist — symptom triage, clinic discovery, and instant booking.",
        }}
      />
      <ScrollProgress />
      <LandingNav />
      <main>
        <Hero />
        <Showcase />
        <StatsBand />
        <Features />
        <HowItWorks />
        <ForClinics />
        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}
