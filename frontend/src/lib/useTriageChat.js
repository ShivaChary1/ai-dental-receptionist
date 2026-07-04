import { useEffect, useState } from "react";
import api from "../api/axios.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { track } from "./analytics.js";
import useGeo from "./useGeo.js";

export const SUGGESTIONS = [
  "My tooth aches when I drink cold water",
  "I chipped a tooth — is it urgent?",
  "How often should I really floss?",
  "Find a clinic near me for a cleaning",
];

const GUEST_KEY = "ivory_guest_session";

export function getGuestSession() {
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_KEY, id);
  }
  return id;
}

/** Shared state/actions for the SmileDesk triage assistant — used by both the
 *  full-page chat and the floating widget. Guests can chat without an account
 *  (capped server-side); their thread is claimed into the account on sign-up. */
export default function useTriageChat() {
  const { isPatient } = useAuth();
  const { coords, request } = useGeo();
  const [chats, setChats] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestRemaining, setGuestRemaining] = useState(null);
  const [limitReached, setLimitReached] = useState(false);
  const [steps, setSteps] = useState([]); // graph nodes completed this turn
  const [mode, setModeState] = useState(() => localStorage.getItem("smiledesk_mode") || "consumer");

  const setMode = (m) => {
    localStorage.setItem("smiledesk_mode", m);
    setModeState(m);
  };

  const loadChats = async () => {
    try {
      const { data } = await api.get("/api/triage/chats");
      setChats(data.items);
    } catch { /* ignore */ }
  };

  // On sign-in, claim any guest conversation so the history carries over.
  useEffect(() => {
    if (!isPatient) return;
    const sid = localStorage.getItem(GUEST_KEY);
    (async () => {
      if (sid) {
        try {
          await api.post("/api/triage/claim", { session_id: sid });
        } catch { /* best-effort */ }
        localStorage.removeItem(GUEST_KEY);
      }
      setLimitReached(false);
      setGuestRemaining(null);
      loadChats();
    })();
  }, [isPatient]);

  const openChat = async (id) => {
    const { data } = await api.get(`/api/triage/chats/${id}`);
    setChatId(id);
    setMessages(data.messages);
  };

  const newChat = () => {
    setChatId(null);
    setMessages([]);
    setInput("");
  };

  const deleteChat = async (id) => {
    try {
      await api.delete(`/api/triage/chats/${id}`);
      setChats((cs) => cs.filter((c) => c.id !== id));
      if (chatId === id) newChat();
    } catch { /* ignore */ }
  };

  /** Apply the final payload of a turn (shared by stream + fallback paths). */
  const finishTurn = (data) => {
    if (data.limit_reached) {
      setLimitReached(true);
      setGuestRemaining(0);
      track("guest_limit_reached");
      return;
    }
    setChatId(data.chat_id);
    track("chat_message_sent", { guest: !isPatient });
    if (isPatient) {
      loadChats();
    } else if (data.guest_remaining != null) {
      setGuestRemaining(data.guest_remaining);
      if (data.guest_remaining === 0) {
        setLimitReached(true);
        track("guest_limit_reached");
      }
    }
  };

  /** Attach final metadata (cards, urgency, citations) to the streamed message. */
  const finalizeAssistant = (data) =>
    setMessages((m) => {
      const copy = [...m];
      const last = copy[copy.length - 1];
      if (last?.role === "assistant") {
        copy[copy.length - 1] = {
          ...last,
          content: data.reply ?? last.content,
          recommendations: data.recommendations || [],
          urgency: data.urgency || null,
          citations: data.citations || [],
          structured_findings: data.structured_findings || null,
          streaming: false,
        };
      }
      return copy;
    });

  /** Send a file (image or document) with an optional prompt alongside it.
   *  The user's bubble shows the attachment; images go to vision analysis,
   *  PDFs/text to report reading. */
  const sendAttachment = async (file, note = "") => {
    if (loading || limitReached || !file) return;
    const isImage = file.type.startsWith("image/");
    const attachment = {
      type: isImage ? "image" : "file",
      url: isImage ? URL.createObjectURL(file) : null,
      name: file.name,
    };
    setMessages((m) => [...m, {
      role: "user",
      content: note || (isImage ? "What do you see in this photo?" : `Please review ${file.name}.`),
      attachment,
    }]);
    setLoading(true);
    setSteps([isImage ? "validate_image" : "extract_document"]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const endpoint = isImage ? "analyze-image" : "analyze-report";
      const { data } = await api.post(
        `/api/triage/${endpoint}?note=${encodeURIComponent(note)}&mode=${mode}`, fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setMessages((m) => [...m, {
        role: "assistant",
        content: data.reply,
        recommendations: data.recommendations || [],
        urgency: data.urgency || null,
        citations: data.citations || [],
        structured_findings: data.structured_findings || null,
      }]);
      track(isImage ? "image_analyzed" : "report_analyzed", { guest: !isPatient });
    } catch (err) {
      setMessages((m) => [...m, {
        role: "assistant",
        content: err?.response?.data?.detail ||
          (isImage
            ? "Sorry, I couldn't analyse that image. Please try a clear, well-lit photo."
            : "Sorry, I couldn't read that document. Supported formats: PDF, TXT, MD."),
      }]);
    } finally {
      setLoading(false);
      setSteps([]);
    }
  };

  const send = async (text) => {
    const message = (text ?? input).trim();
    if (!message || loading || limitReached) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: message }]);
    setLoading(true);
    setSteps([]);

    const body = {
      message,
      chat_id: isPatient ? chatId : null,
      location: coords || null,
      session_id: isPatient ? null : getGuestSession(),
      mode,
    };

    // Streaming first (SSE): tokens render as the model writes.
    let streamedAny = false;
    try {
      const token = localStorage.getItem("dental_token");
      const res = await fetch(`${api.defaults.baseURL}/api/triage/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = null;
      for (;;) {
        const { value, done: eof } = await reader.read();
        if (eof) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop();
        for (const raw of events) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;
          const evt = JSON.parse(line.slice(5));
          if (evt.type === "step") {
            setSteps((s) => (s.includes(evt.node) ? s : [...s, evt.node]));
          } else if (evt.type === "token") {
            if (!streamedAny) {
              streamedAny = true;
              setLoading(false); // typing indicator out, live text in
              setMessages((m) => [
                ...m,
                { role: "assistant", content: evt.text, recommendations: [], streaming: true },
              ]);
            } else {
              setMessages((m) => {
                const copy = [...m];
                const last = { ...copy[copy.length - 1] };
                last.content += evt.text;
                copy[copy.length - 1] = last;
                return copy;
              });
            }
          } else if (evt.type === "done") {
            done = evt;
          }
        }
      }
      if (!done) throw new Error("stream ended without done event");
      if (streamedAny) {
        finalizeAssistant(done);
      } else if (!done.limit_reached) {
        // No tokens streamed (e.g. static emergency/redirect path) — append whole.
        setMessages((m) => [...m, {
          role: "assistant", content: done.reply,
          recommendations: done.recommendations || [], urgency: done.urgency,
          citations: done.citations || [], structured_findings: done.structured_findings,
        }]);
      }
      finishTurn(done);
      setLoading(false);
      setSteps([]);
      return;
    } catch {
      if (streamedAny) {
        // Partial stream then failure: keep what arrived, stop cleanly.
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { ...copy[copy.length - 1], streaming: false };
          return copy;
        });
        setLoading(false);
        setSteps([]);
        return;
      }
      // Stream never started (proxy/env without SSE) — plain request fallback.
    }

    try {
      const { data } = await api.post("/api/triage/chat", body);
      if (!data.limit_reached) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: data.reply,
            recommendations: data.recommendations,
            urgency: data.urgency,
          },
        ]);
      }
      finishTurn(data);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Sorry, I couldn't reach the assistant. Please try again." },
      ]);
    } finally {
      setLoading(false);
      setSteps([]);
    }
  };

  return {
    isPatient,
    coords,
    requestLocation: request,
    chats,
    chatId,
    messages,
    input,
    setInput,
    loading,
    guestRemaining,
    limitReached,
    steps,
    mode,
    setMode,
    send,
    sendAttachment,
    openChat,
    newChat,
    deleteChat,
  };
}
