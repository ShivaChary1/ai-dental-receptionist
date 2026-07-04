import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  FileText,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";
import ChatBubble, { TypingIndicator } from "../components/ChatBubble.jsx";
import RecommendationCards from "../components/RecommendationCards.jsx";
import GuestUpsell from "../components/assistant/GuestUpsell.jsx";
import UrgencyBanner from "../components/assistant/UrgencyBanner.jsx";
import Citations from "../components/assistant/Citations.jsx";
import FindingsCard from "../components/assistant/FindingsCard.jsx";
import ThinkingSteps from "../components/assistant/ThinkingSteps.jsx";
import Button from "../components/ui/Button.jsx";
import Avatar from "../components/ui/Avatar.jsx";
import Logo from "../components/ui/Logo.jsx";
import ThemeToggle from "../components/ui/ThemeToggle.jsx";
import LottieFx from "../components/ui/LottieFx.jsx";
import chatbotAnim from "../assets/lottie/chatbot.json";
import useTriageChat, { SUGGESTIONS } from "../lib/useTriageChat.js";
import { cn } from "../lib/cn.js";
import { staggerContainer, listItem, EASE } from "../lib/motion.js";

function SidebarLink({ to, icon: Icon, children, onNavigate }) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Icon className="h-4 w-4 shrink-0" /> {children}
    </Link>
  );
}

/** Full sidebar body — history in the middle, account & settings pinned to
 *  the bottom, Claude-style. Reused by the desktop rail and the mobile drawer. */
function SidebarInner({ chat, onCollapse, onNavigate }) {
  const { isPatient, user, logout } = useAuth();
  const { chats, chatId, openChat, newChat, deleteChat } = chat;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <Link to="/" onClick={onNavigate} aria-label="SmileDesk home">
          <Logo wordmark />
        </Link>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse sidebar"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {onNavigate ? <X className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <div className="px-3 pb-2">
        <Button leftIcon={Plus} className="w-full justify-start" onClick={() => { newChat(); onNavigate?.(); }}>
          New chat
        </Button>
      </div>

      {/* History */}
      {isPatient ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          <p className="px-2 pb-1.5 pt-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recents
          </p>
          {chats.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">No saved chats yet.</p>
          )}
          {chats.map((ch) => (
            <div
              key={ch.id}
              className={cn(
                "group mb-0.5 flex w-full items-start gap-2 rounded-lg px-2.5 py-2 transition-colors",
                chatId === ch.id ? "bg-primary/10" : "hover:bg-muted"
              )}
            >
              <button
                onClick={() => { openChat(ch.id); onNavigate?.(); }}
                className="flex min-w-0 flex-1 items-start gap-2 text-left"
              >
                <MessageSquare
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    chatId === ch.id ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{ch.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{ch.last_message}</span>
                </span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${ch.title}"?`)) deleteChat(ch.id);
                }}
                title="Delete chat"
                aria-label={`Delete chat ${ch.title}`}
                className="mt-0.5 hidden h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive group-hover:flex"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 text-center">
          <LottieFx animationData={chatbotAnim} size={110} className="-my-2" />
          <p className="mt-2 text-sm font-medium text-foreground">Chat free — no account needed</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Sign up to save conversations and book appointments.
          </p>
        </div>
      )}

      {/* Footer: navigation + settings + account */}
      <div className="border-t border-border p-2">
        <SidebarLink to="/clinics" icon={MapPin} onNavigate={onNavigate}>Find a clinic</SidebarLink>
        {isPatient && (
          <SidebarLink to="/account/bookings" icon={CalendarDays} onNavigate={onNavigate}>
            My bookings
          </SidebarLink>
        )}
        <div className="flex items-center justify-between rounded-lg px-2.5 py-1 text-sm text-muted-foreground">
          Theme
          <ThemeToggle />
        </div>

        <div className="mt-1 border-t border-border pt-2">
          {isPatient ? (
            <div className="flex items-center gap-1">
              <Link
                to="/account"
                onClick={onNavigate}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted"
                title="Profile & settings"
              >
                <Avatar name={user?.name || user?.email || "Patient"} size="sm" />
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {user?.name || user?.email || "My account"}
                  </span>
                  <span className="block truncate text-2xs text-muted-foreground">
                    Profile & settings
                  </span>
                </span>
              </Link>
              <Button variant="ghost" size="icon" onClick={logout} title="Log out" aria-label="Log out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 px-1 py-1">
              <Link to="/register" className="flex-1" onClick={onNavigate}>
                <Button size="sm" className="w-full">Sign up</Button>
              </Link>
              <Link to="/login" className="flex-1" onClick={onNavigate}>
                <Button size="sm" variant="secondary" className="w-full">Sign in</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Slim rail when collapsed: expand, new chat, theme, account. */
function CollapsedRail({ chat, onExpand }) {
  const { isPatient, user } = useAuth();
  return (
    <div className="flex h-full flex-col items-center py-3">
      <button
        type="button"
        onClick={onExpand}
        aria-label="Expand sidebar"
        className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <PanelLeftOpen className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={chat.newChat}
        title="New chat"
        aria-label="New chat"
        className="mt-2 flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-primary transition-colors hover:bg-primary-hover"
      >
        <Plus className="h-4 w-4" />
      </button>
      <div className="mt-auto flex flex-col items-center gap-2">
        <ThemeToggle />
        {isPatient && (
          <Link to="/account" title="Profile & settings">
            <Avatar name={user?.name || user?.email || "Patient"} size="sm" />
          </Link>
        )}
      </div>
    </div>
  );
}

/** Consumer / Professional answer-mode toggle. */
function ModeToggle({ mode, setMode }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-muted/60 p-0.5">
      {[
        { key: "consumer", label: "Patient" },
        { key: "professional", label: "Professional" },
      ].map((m) => (
        <button
          key={m.key}
          type="button"
          onClick={() => setMode(m.key)}
          className={cn(
            "relative rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            mode === m.key ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {mode === m.key && (
            <motion.span
              layoutId="chatMode"
              className="absolute inset-0 rounded-md bg-primary shadow-primary"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
          <span className="relative">{m.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function TriageChat() {
  const chat = useTriageChat();
  const {
    isPatient, coords, requestLocation: request,
    messages, input, setInput, loading,
    guestRemaining, limitReached, steps, mode, setMode, send, sendAttachment,
  } = chat;
  const location = useLocation();
  const scrollRef = useRef(null);
  const sentInitial = useRef(false);
  const fileRef = useRef(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const previewUrl = pendingFile?.type?.startsWith("image/")
    ? URL.createObjectURL(pendingFile)
    : null;

  const submit = () => {
    if (pendingFile) {
      sendAttachment(pendingFile, input.trim());
      setPendingFile(null);
      setInput("");
    } else {
      send();
    }
  };

  // Question handed over from the landing chat bar — send it once, then clear
  // the history state so a refresh doesn't re-send it.
  useEffect(() => {
    const ask = location.state?.ask;
    if (ask && !sentInitial.current) {
      sentInitial.current = true;
      window.history.replaceState({}, "");
      send(ask);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, limitReached]);

  const isFresh = messages.length === 0;

  return (
    <div className="flex h-full">
      {/* Desktop sidebar: expanded panel or slim rail */}
      <motion.aside
        animate={{ width: collapsed ? 56 : 268 }}
        transition={{ duration: 0.25, ease: EASE.out }}
        className="hidden shrink-0 overflow-hidden border-r border-border bg-card/40 md:block"
      >
        {collapsed ? (
          <CollapsedRail chat={chat} onExpand={() => setCollapsed(false)} />
        ) : (
          <div className="h-full w-[268px]">
            <SidebarInner chat={chat} onCollapse={() => setCollapsed(true)} />
          </div>
        )}
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              initial={{ x: -290 }}
              animate={{ x: 0 }}
              exit={{ x: -290, transition: { duration: 0.2, ease: EASE.in } }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-background md:hidden"
            >
              <SidebarInner
                chat={chat}
                onCollapse={() => setMobileOpen(false)}
                onNavigate={() => setMobileOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Chat column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Chat header: menu (mobile), answer-mode toggle (always) */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="md:hidden">
            <Logo wordmark />
          </Link>
          <span className="hidden text-sm font-semibold text-foreground md:block">
            SmileDesk Assistant
          </span>
          <div className="ml-auto">
            <ModeToggle mode={mode} setMode={setMode} />
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {isFresh && !loading && !limitReached ? (
            /* Empty chat: the user speaks first — a centered welcome, no canned
               assistant message. */
            <div className="flex h-full flex-col items-center justify-center px-6 pb-16">
              <LottieFx animationData={chatbotAnim} size={150} className="-my-4" />
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: EASE.out }}
                className="mt-4 text-center text-2xl font-semibold tracking-tight text-foreground"
              >
                How can I help your smile today?
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: EASE.out, delay: 0.06 }}
                className="mt-2 max-w-md text-center text-sm text-muted-foreground"
              >
                Describe a symptom, ask a dental question, or attach a photo,
                X-ray, or report — I'll point you the right way.
              </motion.p>
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="mt-6 flex max-w-lg flex-wrap justify-center gap-2"
              >
                {SUGGESTIONS.map((s) => (
                  <motion.button
                    key={s}
                    variants={listItem}
                    onClick={() => send(s)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground shadow-xs transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <Sparkles className="h-3 w-3 text-primary" /> {s}
                  </motion.button>
                ))}
              </motion.div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8">
              {messages.map((m, i) => (
                <div key={i}>
                  {m.role === "assistant" && m.urgency && <UrgencyBanner urgency={m.urgency} />}
                  <ChatBubble
                    role={m.role}
                    content={m.content}
                    attachment={m.attachment}
                    streaming={m.streaming}
                  />
                  {m.role === "assistant" && (
                    <>
                      {m.structured_findings && <FindingsCard findings={m.structured_findings} />}
                      <Citations citations={m.citations} content={m.content} />
                      <RecommendationCards recommendations={m.recommendations} />
                    </>
                  )}
                </div>
              ))}
              <AnimatePresence>
                {loading && (steps.length > 0
                  ? <ThinkingSteps key="steps" steps={steps} />
                  : <TypingIndicator key="typing" />)}
              </AnimatePresence>
              {limitReached && <GuestUpsell />}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-background/80 backdrop-blur-md">
          <div className="mx-auto w-full max-w-3xl px-5 py-3 sm:px-8">
            {!coords && !limitReached && (
              <button
                onClick={request}
                className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-opacity hover:opacity-80"
              >
                <MapPin className="h-3.5 w-3.5" /> Share location for nearby clinic recommendations
              </button>
            )}
            <div className="rounded-xl border border-input bg-card p-1.5 shadow-sm transition-colors focus-within:border-primary">
              {/* Pending attachment preview — send a prompt along with it. */}
              <AnimatePresence>
                {pendingFile && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
                    className="overflow-hidden"
                  >
                    <div className="mx-1 mb-1.5 flex items-center gap-2.5 rounded-lg border border-border bg-background/60 p-2">
                      {previewUrl ? (
                        <img src={previewUrl} alt="" className="h-12 w-12 rounded-md object-cover" />
                      ) : (
                        <span className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <FileText className="h-5 w-5" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate text-xs font-medium text-foreground">
                          {pendingFile.name}
                        </span>
                        <span className="block text-2xs text-muted-foreground">
                          {previewUrl ? "Photo — add a note and send" : "Document — add a note and send"}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setPendingFile(null)}
                        aria-label="Remove attachment"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.pdf,.txt,.md"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setPendingFile(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => fileRef.current?.click()}
                  disabled={loading || limitReached}
                  title="Attach a photo, X-ray, or report (PDF)"
                  aria-label="Attach a file"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder={
                    limitReached
                      ? "Create an account to continue…"
                      : pendingFile
                        ? "Ask something about this file…"
                        : "Describe your dental concern…"
                  }
                  disabled={limitReached}
                  className="flex-1 bg-transparent px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
                />
                <Button
                  size="icon"
                  onClick={submit}
                  disabled={loading || limitReached || (!input.trim() && !pendingFile)}
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="mt-1.5 text-center text-2xs text-muted-foreground">
              {!isPatient && guestRemaining != null && !limitReached ? (
                <>
                  {guestRemaining} free {guestRemaining === 1 ? "message" : "messages"} left ·{" "}
                  <Link to="/register" className="font-medium text-primary hover:underline">
                    create an account
                  </Link>{" "}
                  to save this chat
                </>
              ) : (
                "SmileDesk offers guidance, not a diagnosis. For emergencies, contact a dentist directly."
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
