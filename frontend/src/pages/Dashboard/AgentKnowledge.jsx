import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, RefreshCw, BrainCircuit } from "lucide-react";
import api from "../../api/axios.js";
import KnowledgeForm from "../../components/KnowledgeForm.jsx";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { staggerContainer, listItem } from "../../lib/motion.js";

function KnowledgeCard({ entry, onEdit, onDelete }) {
  return (
    <motion.div variants={listItem}>
      <Card className="flex h-full flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{entry.title}</h3>
          <Badge tone="outline">{entry.key}</Badge>
        </div>
        <p className="mt-2 line-clamp-4 flex-1 whitespace-pre-wrap text-sm text-muted-foreground">
          {entry.content}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-2xs text-muted-foreground">
            {entry.last_updated ? new Date(entry.last_updated).toLocaleString() : ""}
          </span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => onEdit(entry)}>Edit</Button>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete(entry)}>
              Delete
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export default function AgentKnowledge() {
  const [data, setData] = useState({ static: [], dynamic: [] });
  const [modal, setModal] = useState(null); // entry being edited or {} for new
  const [saving, setSaving] = useState(false);
  const [reindexing, setReindexing] = useState(false);

  const load = () => api.get("/api/knowledge").then(({ data }) => setData(data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const save = async (form) => {
    setSaving(true);
    try {
      if (form.id) {
        await api.put(`/api/knowledge/${form.id}`, form);
      } else {
        await api.post("/api/knowledge", form);
      }
      setModal(null);
      load();
    } catch (e) {
      alert(e?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (entry) => {
    if (!confirm(`Delete "${entry.title}"?`)) return;
    await api.delete(`/api/knowledge/${entry.id}`);
    load();
  };

  const reindex = async () => {
    setReindexing(true);
    try {
      await api.post("/api/knowledge/reindex");
    } finally {
      setReindexing(false);
    }
  };

  const Section = ({ title, items }) => (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No entries.</p>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {items.map((e) => (
            <KnowledgeCard key={e.id} entry={e} onEdit={setModal} onDelete={remove} />
          ))}
        </motion.div>
      )}
    </section>
  );

  const isEmpty = data.static.length === 0 && data.dynamic.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Agent knowledge</h1>
        <div className="flex gap-2">
          <Button variant="secondary" leftIcon={RefreshCw} loading={reindexing} onClick={reindex}>
            {reindexing ? "Refreshing…" : "Refresh AI index"}
          </Button>
          <Button leftIcon={Plus} onClick={() => setModal({})}>
            Add knowledge
          </Button>
        </div>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={BrainCircuit}
          title="No knowledge yet"
          description="Add facts, policies, and FAQs so the AI receptionist can answer patients accurately."
          action={<Button leftIcon={Plus} onClick={() => setModal({})}>Add knowledge</Button>}
        />
      ) : (
        <>
          <Section title="Dynamic knowledge" items={data.dynamic} />
          <Section title="Static knowledge" items={data.static} />
        </>
      )}

      {modal && (
        <KnowledgeForm
          initial={modal.id ? modal : null}
          onSave={save}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
