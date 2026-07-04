import { useState } from "react";
import Modal from "./ui/Modal.jsx";
import Button from "./ui/Button.jsx";
import { Field, Input, Textarea, Select } from "./ui/Input.jsx";

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
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Edit knowledge" : "Add knowledge"}
      description="The AI receptionist reads this content when answering patients."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="knowledge-form" loading={saving}>
            {saving ? "Syncing AI knowledge…" : "Save"}
          </Button>
        </>
      }
    >
      <form id="knowledge-form" onSubmit={submit}>
        <Field label="Category">
          <Select value={form.category} onChange={set("category")}>
            <option value="dynamic">Dynamic</option>
            <option value="static">Static</option>
          </Select>
        </Field>
        <Field label="Key" hint={isEdit ? "Keys can't be changed after creation." : undefined}>
          <Input
            value={form.key}
            onChange={set("key")}
            disabled={isEdit}
            placeholder="e.g. doctor_availability"
            required
          />
        </Field>
        <Field label="Title">
          <Input value={form.title} onChange={set("title")} placeholder="Display name" required />
        </Field>
        <Field label="Content (the AI reads this)">
          <Textarea value={form.content} onChange={set("content")} rows={6} required />
        </Field>
      </form>
    </Modal>
  );
}
