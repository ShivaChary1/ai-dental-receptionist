import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Building2, LogIn, Send, X } from "lucide-react";
import api from "../../api/axios.js";
import { useAuth } from "../../auth/AuthContext.jsx";
import { getGuestSession } from "../../lib/useTriageChat.js";
import ChatBubble, { TypingIndicator } from "../ChatBubble.jsx";
import Button from "../ui/Button.jsx";
import Badge from "../ui/Badge.jsx";
import Skeleton from "../ui/Skeleton.jsx";

/** Clinic-scoped assistant panel: on /clinics/:id the floating widget talks
 *  as that clinic (booking, doctors, hours) instead of the general triage agent.
 *  Guests can ask questions (capped server-side); booking requires sign-in. */
export default function ClinicPanel({ hospitalId, onClose }) {
  const { isPatient } = useAuth();
  const [hospital, setHospital] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get(`/api/hospitals/${hospitalId}`);
        if (!alive) return;
        setHospital(data);
        const greeting = {
          role: "assistant",
          content:
            `Hi! I'm the assistant at **${data.name}** — ask me anything about this ` +
            `clinic: doctors, services, timings, insurance — or say something like ` +
            `"book a cleaning tomorrow at 10am".`,
        };
        try {
          const params = isPatient ? {} : { session_id: getGuestSession() };
          const res = await api.get(`/api/hospitals/${hospitalId}/chat`, { params });
          if (!alive) return;
          setMessages([greeting, ...(res.data.messages || [])]);
          if (res.data.guest_remaining === 0) setLimitReached(true);
          return;
        } catch { /* fall through to greeting only */ }
        setMessages([greeting]);
      } catch { /* leave hospital null */ }
    })();
    return () => { alive = false; };
  }, [hospitalId, isPatient]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const message = input.trim();
    if (!message || loading || limitReached) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: message }]);
    setLoading(true);
    try {
      const body = isPatient ? { message } : { message, session_id: getGuestSession() };
      const { data } = await api.post(`/api/hospitals/${hospitalId}/chat`, body);
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      if (data.limit_reached || data.guest_remaining === 0) setLimitReached(true);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2.5 border-b border-border bg-card/60 px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Building2 className="h-4 w-4" />
        </span>
        <div className="min-w-0 leading-tight">
          {hospital ? (
            <div className="truncate text-sm font-semibold text-foreground">Ask {hospital.name}</div>
          ) : (
            <Skeleton className="h-4 w-32" />
          )}
          <div className="text-2xs text-muted-foreground">Clinic assistant</div>
        </div>
        <Badge tone="success" dot className="ml-auto shrink-0">Live</Badge>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close assistant"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {messages.length === 0 && (
          <div className="space-y-3 px-1 pt-2">
            <Skeleton className="h-14 w-3/4 rounded-xl" />
            <Skeleton className="ml-auto h-9 w-1/2 rounded-xl" />
          </div>
        )}
        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role} content={m.content} />
        ))}
        <AnimatePresence>{loading && <TypingIndicator />}</AnimatePresence>

        {limitReached && !isPatient && (
          <div className="mt-2 rounded-xl border border-primary/25 bg-primary/5 p-3 text-center">
            <p className="text-sm text-foreground">
              Sign in (it's free) to keep chatting and book — this conversation carries over.
            </p>
            <div className="mt-3 flex gap-2">
              <Link to="/login" className="flex-1">
                <Button size="sm" leftIcon={LogIn} className="w-full">Sign in</Button>
              </Link>
              <Link to="/register" className="flex-1">
                <Button size="sm" variant="secondary" className="w-full">Register</Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border bg-background/80 px-3 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-1.5 rounded-xl border border-input bg-card p-1 shadow-sm transition-colors focus-within:border-primary">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={limitReached && !isPatient ? "Sign in to continue…" : "Ask or book…"}
            disabled={limitReached && !isPatient}
            className="min-w-0 flex-1 bg-transparent px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
          />
          <Button
            size="icon"
            onClick={send}
            disabled={loading || !input.trim() || (limitReached && !isPatient)}
            aria-label="Send"
            className="h-8 w-8 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 text-center text-2xs text-muted-foreground">
          {isPatient
            ? "Bookings are confirmed by the clinic's own assistant."
            : "Ask anything — sign in when you're ready to book."}
        </p>
      </div>
    </div>
  );
}
