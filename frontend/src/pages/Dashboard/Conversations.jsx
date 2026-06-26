import { useEffect, useState } from "react";
import api from "../../api/axios.js";

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-160px)]">
      {/* List */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-y-auto">
        <h2 className="font-semibold text-slate-800 p-4 border-b">Conversations</h2>
        <ul>
          {list.map((c) => (
            <li
              key={c.session_id}
              onClick={() => setSelected(c.session_id)}
              className={`px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 ${
                selected === c.session_id ? "bg-primary/5" : ""
              }`}
            >
              <div className="flex justify-between">
                <span className="font-medium text-slate-700">{c.patient_name}</span>
                <span className="text-xs text-slate-400">{c.message_count} msgs</span>
              </div>
              <p className="text-sm text-slate-500 truncate">{c.last_message}</p>
            </li>
          ))}
          {list.length === 0 && <li className="p-4 text-slate-400 text-sm">No conversations.</li>}
        </ul>
      </div>

      {/* Thread */}
      <div className="lg:col-span-2 bg-white border border-slate-100 rounded-xl shadow-sm flex flex-col overflow-hidden">
        {!thread ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            Select a conversation
          </div>
        ) : (
          <>
            <div className="p-4 border-b">
              <div className="font-semibold text-slate-800">{thread.patient_name || "Anonymous"}</div>
              <div className="flex gap-1 mt-1 flex-wrap">
                {[...new Set(thread.intent_log || [])].map((t) => (
                  <span key={t} className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
              {(thread.messages || []).map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                    m.role === "user" ? "bg-primary text-white" : "bg-white border border-slate-200 text-slate-700"
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
