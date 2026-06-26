import { useState } from "react";

export default function KnowledgeForm({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState(
    initial || { category: "dynamic", key: "", title: "", content: "" }
  );
  const isEdit = Boolean(initial?.id);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4"
      >
        <h3 className="text-lg font-semibold text-slate-800">
          {isEdit ? "Edit Knowledge" : "Add Knowledge"}
        </h3>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Category</label>
          <select
            value={form.category}
            onChange={set("category")}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="dynamic">Dynamic</option>
            <option value="static">Static</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Key</label>
          <input
            value={form.key}
            onChange={set("key")}
            disabled={isEdit}
            placeholder="e.g. doctor_availability"
            className="w-full border rounded-lg px-3 py-2 disabled:bg-slate-100"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Title</label>
          <input
            value={form.title}
            onChange={set("title")}
            placeholder="Display name"
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Content (the AI reads this)
          </label>
          <textarea
            value={form.content}
            onChange={set("content")}
            rows={6}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-primary text-white font-medium disabled:opacity-60"
          >
            {saving ? "Syncing AI Knowledge…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
