import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessagesSquare } from "lucide-react";
import api from "../../api/axios.js";
import ChatBubble from "../../components/ChatBubble.jsx";
import Badge from "../../components/ui/Badge.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { cn } from "../../lib/cn.js";
import { staggerContainer, listItem } from "../../lib/motion.js";

export default function HospitalConversations() {
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null);
  const [thread, setThread] = useState(null);

  useEffect(() => {
    api.get("/api/hospital/conversations").then(({ data }) => setItems(data.items));
  }, []);

  const open = async (id) => {
    setActive(id);
    const { data } = await api.get(`/api/hospital/conversations/${id}`);
    setThread(data);
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon={MessagesSquare}
        title="No conversations yet"
        description="Patient chats with your AI receptionist will appear here."
      />
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
        {items.map((c) => (
          <motion.button
            key={c.id}
            variants={listItem}
            onClick={() => open(c.id)}
            className={cn(
              "w-full rounded-xl border p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              active === c.id
                ? "border-primary/40 bg-primary/5"
                : "border-border bg-card hover:border-primary/25"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium text-foreground">{c.patient_name}</span>
              <Badge tone={active === c.id ? "primary" : "neutral"}>{c.message_count}</Badge>
            </div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">{c.last_message}</div>
          </motion.button>
        ))}
      </motion.div>

      <Card className="col-span-2 min-h-[300px] p-4">
        {!thread ? (
          <div className="flex h-full min-h-[260px] items-center justify-center">
            <p className="text-sm text-muted-foreground">Select a conversation to view the transcript.</p>
          </div>
        ) : (
          <>
            <h3 className="mb-3 text-sm font-semibold text-foreground">{thread.patient_name}</h3>
            {thread.messages.map((m, i) => (
              <ChatBubble key={i} role={m.role} content={m.content} />
            ))}
          </>
        )}
      </Card>
    </div>
  );
}
