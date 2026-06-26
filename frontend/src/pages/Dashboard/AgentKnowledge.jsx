import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import KnowledgeForm from "../../components/KnowledgeForm.jsx";

function KnowledgeCard({ entry, onEdit, onDelete }) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
      <div className="flex justify-between items-start">
        <h3 className="font-semibold text-slate-800">{entry.title}</h3>
        <span className="text-[10px] text-slate-400">{entry.key}</span>
      </div>
      <p className="text-sm text-slate-500 mt-2 line-clamp-4 whitespace-pre-wrap">{entry.content}</p>
      <div className="flex justify-between items-center mt-3">
        <span className="text-[11px] text-slate-400">
          {entry.last_updated ? new Date(entry.last_updated).toLocaleString() : ""}
        </span>
        <div className="flex gap-2">
          <button onClick={() => onEdit(entry)} className="text-primary text-sm font-medium">Edit</button>
          <button onClick={() => onDelete(entry)} className="text-red-500 text-sm font-medium">Delete</button>
        </div>
      </div>
    </div>
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

  const Section = ({ title, items, bg }) => (
    <section>
      <h2 className="font-semibold text-slate-700 mb-3">{title}</h2>
      <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 ${bg} p-4 rounded-xl`}>
        {items.map((e) => (
          <KnowledgeCard key={e.id} entry={e} onEdit={setModal} onDelete={remove} />
        ))}
        {items.length === 0 && <p className="text-slate-400 text-sm">No entries.</p>}
      </div>
    </section>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-slate-800">Agent Knowledge</h1>
        <div className="flex gap-2">
          <button onClick={reindex} disabled={reindexing}
            className="px-4 py-2 rounded-lg border border-primary text-primary text-sm font-medium disabled:opacity-60">
            {reindexing ? "Refreshing…" : "Refresh AI Knowledge Index"}
          </button>
          <button onClick={() => setModal({})}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium">
            + Add Knowledge
          </button>
        </div>
      </div>

      <Section title="Dynamic Knowledge" items={data.dynamic} bg="bg-amber-50/40" />
      <Section title="Static Knowledge" items={data.static} bg="bg-slate-100/60" />

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
