import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";
import api from "../api/axios.js";
import ChatBubble, { TypingIndicator } from "../components/ChatBubble.jsx";
import Button from "../components/ui/Button.jsx";
import Logo from "../components/ui/Logo.jsx";
import ThemeToggle from "../components/ui/ThemeToggle.jsx";
import Badge from "../components/ui/Badge.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { staggerContainer, listItem } from "../lib/motion.js";

const QUICK_ACTIONS = ["Book Appointment", "Cancel Appointment", "Clinic Timings", "Our Doctors"];

function getSessionId() {
  let id = localStorage.getItem("dental_session_id");
  if (!id) {
    id = uuidv4();
    localStorage.setItem("dental_session_id", id);
  }
  return id;
}

export default function UserChat() {
  const { isPatient, user, logout } = useAuth();
  const [sessionId] = useState(getSessionId);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm the **SmileDesk AI Receptionist**. I can help you book, reschedule, or cancel " +
        "appointments, and answer questions about our clinic. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const message = (text ?? input).trim();
    if (!message || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: message }]);
    setLoading(true);
    try {
      const { data } = await api.post("/api/chat", { session_id: sessionId, message });
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Sorry, I couldn't reach the clinic system. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const showQuickActions = messages.length <= 1;

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col border-x border-border bg-background">
      <header className="flex items-center gap-3 border-b border-border px-5 py-3">
        <Logo wordmark subtitle="AI Receptionist" />
        <Badge tone="success" dot className="ml-1">Online</Badge>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {isPatient ? (
            <>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {user?.name || user?.email || user?.phone}
              </span>
              <button onClick={logout} className="text-xs text-muted-foreground transition-colors hover:text-primary">
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="text-xs text-muted-foreground transition-colors hover:text-primary">
              Login
            </Link>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role} content={m.content} />
        ))}
        <AnimatePresence>{loading && <TypingIndicator />}</AnimatePresence>
      </div>

      {showQuickActions && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="flex flex-wrap gap-2 px-4 pb-2"
        >
          {QUICK_ACTIONS.map((q) => (
            <motion.button
              key={q}
              variants={listItem}
              onClick={() => send(q)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              {q}
            </motion.button>
          ))}
        </motion.div>
      )}

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 rounded-xl border border-input bg-card p-1.5 shadow-sm transition-colors focus-within:border-primary">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type your message…"
            className="flex-1 bg-transparent px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <Button size="icon" onClick={() => send()} disabled={loading || !input.trim()} aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
