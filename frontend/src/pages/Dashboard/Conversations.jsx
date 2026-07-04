import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import ChatBubble from "../../components/ChatBubble.jsx";
import Badge from "../../components/ui/Badge.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { cn } from "../../lib/cn.js";

export default function Conversations() {
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [thread, setThread] = useState(null);

  const loadList = () => {
    api.get("/api/dashboard/conversations").then(({ data }) => setList(data.items)).catch(() => {});
  };

  useEffect(() => {
    loadList();
    const id = setInterval(loadList, 30000); // auto-refresh every 30s
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.get(`/api/dashboard/conversations/${selected}`).then(({ data }) => setThread(data)).catch(() => {});
  }, [selected]);

  return (
    <div className="grid h-[calc(100vh-160px)] grid-cols-1 gap-4 lg:grid-cols-3">
      {/* List */}
      <Card className="overflow-y-auto p-0">
        <h2 className="border-b border-border p-4 text-sm font-semibold text-foreground">Conversations</h2>
        <ul>
          {list.map((c) => (
            <li key={c.session_id}>
              <button
                onClick={() => setSelected(c.session_id)}
                className={cn(
                  "w-full border-b border-border/50 px-4 py-3 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  selected === c.session_id && "bg-primary/5"
                )}
              >
                <div className="flex justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{c.patient_name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{c.message_count} msgs</span>
                </div>
                <p className="truncate text-sm text-muted-foreground">{c.last_message}</p>
              </button>
            </li>
          ))}
          {list.length === 0 && (
            <li className="p-4 text-sm text-muted-foreground">No conversations.</li>
          )}
        </ul>
      </Card>

      {/* Thread */}
      <Card className="flex flex-col overflow-hidden p-0 lg:col-span-2">
        {!thread ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a conversation
          </div>
        ) : (
          <>
            <div className="border-b border-border p-4">
              <div className="text-sm font-semibold text-foreground">{thread.patient_name || "Anonymous"}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {[...new Set(thread.intent_log || [])].map((t) => (
                  <Badge key={t} tone="primary">{t}</Badge>
                ))}
              </div>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto bg-muted/30 p-4">
              {(thread.messages || []).map((m, i) => (
                <ChatBubble key={i} role={m.role} content={m.content} />
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
