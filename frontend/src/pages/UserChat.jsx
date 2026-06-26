import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import api from "../api/axios.js";
import ChatBubble from "../components/ChatBubble.jsx";

const QUICK_ACTIONS = [
  "Book Appointment",
  "Cancel Appointment",
  "Clinic Timings",
  "Our Doctors",
];

function getSessionId() {
  let id = localStorage.getItem("dental_session_id");
  if (!id) {
    id = uuidv4();
    localStorage.setItem("dental_session_id", id);
  }
  return id;
}

export default function UserChat() {
  const [sessionId] = useState(getSessionId);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! 👋 I'm the **SmileCare AI Receptionist**. I can help you book, reschedule, or cancel appointments, and answer questions about our clinic. How can I help you today?",
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
      const { data } = await api.post("/api/chat", {
        session_id: sessionId,
        message,
      });
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Sorry, I couldn't reach the clinic system. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const showQuickActions = messages.length <= 1;

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto bg-white shadow-sm">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-white">
        <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
          🦷
        </div>
        <div className="flex-1">
          <div className="font-semibold text-slate-800">SmileCare AI Receptionist</div>
          <div className="flex items-center gap-1.5 text-xs text-green-600">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Online
          </div>
        </div>
        <Link to="/dashboard" className="text-xs text-slate-400 hover:text-primary">
          Admin →
        </Link>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 bg-slate-50">
        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role} content={m.content} />
        ))}
        {loading && (
          <div className="flex items-center gap-1 ml-10 mb-3">
            <span className="typing-dot w-2 h-2 bg-slate-400 rounded-full" />
            <span className="typing-dot w-2 h-2 bg-slate-400 rounded-full" />
            <span className="typing-dot w-2 h-2 bg-slate-400 rounded-full" />
          </div>
        )}
      </div>

      {/* Quick actions */}
      {showQuickActions && (
        <div className="flex flex-wrap gap-2 px-4 pb-2 bg-slate-50">
          {QUICK_ACTIONS.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="text-sm px-3 py-1.5 rounded-full border border-primary/40 text-primary hover:bg-primary/10"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 p-3 border-t border-slate-100 bg-white">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type your message…"
          className="flex-1 border border-slate-200 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          onClick={() => send()}
          disabled={loading}
          className="bg-primary text-white rounded-full px-5 py-2 font-medium disabled:opacity-60"
        >
          Send
        </button>
      </div>
    </div>
  );
}
