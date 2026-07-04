import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, Trash2 } from "lucide-react";
import api from "../../api/axios.js";
import Button from "../../components/ui/Button.jsx";
import Skeleton from "../../components/ui/Skeleton.jsx";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card.jsx";
import { Field, Input, Textarea, Select } from "../../components/ui/Input.jsx";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function Section({ title, children }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function HospitalProfile() {
  const [p, setP] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: "", specialization: "", qualification: "", years_experience: "" });

  const load = async () => { const { data } = await api.get("/api/hospital/profile"); setP(data); };
  useEffect(() => { load(); }, []);

  if (!p) {
    return (
      <div className="max-w-2xl space-y-5">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-9 w-full" />
            <Skeleton className="mt-3 h-9 w-full" />
          </div>
        ))}
      </div>
    );
  }

  const setField = (k, v) => setP((s) => ({ ...s, [k]: v }));
  const setHour = (d, v) => setP((s) => ({ ...s, hours: { ...(s.hours || {}), [d]: v } }));

  const save = async () => {
    setSaved(false);
    setSaving(true);
    try {
      await api.put("/api/hospital/profile", {
        description: p.description,
        address: p.address,
        hours: p.hours,
        services: p.services,
        insurance_accepted: p.insurance_accepted,
        booking_config: p.booking_config,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      load();
    } finally {
      setSaving(false);
    }
  };

  const addDoctor = async () => {
    if (!newDoc.name.trim()) return;
    await api.post("/api/hospital/doctors", {
      name: newDoc.name,
      specialization: newDoc.specialization || null,
      qualification: newDoc.qualification || null,
      years_experience: newDoc.years_experience ? parseInt(newDoc.years_experience, 10) : null,
    });
    setNewDoc({ name: "", specialization: "", qualification: "", years_experience: "" });
    load();
  };
  const removeDoctor = async (id) => { await api.delete(`/api/hospital/doctors/${id}`); load(); };

  return (
    <div className="max-w-2xl space-y-5">
      <Section title="Clinic details">
        <Field label="Description">
          <Textarea rows={3} value={p.description || ""} onChange={(e) => setField("description", e.target.value)} />
        </Field>
        <Field label="Address">
          <Input value={p.address || ""} onChange={(e) => setField("address", e.target.value)} />
        </Field>
        <Field label="Services (comma-separated)">
          <Input
            value={(p.services || []).join(", ")}
            onChange={(e) => setField("services", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
          />
        </Field>
        <Field label="Insurance / payment (comma-separated)">
          <Input
            value={(p.insurance_accepted || []).join(", ")}
            onChange={(e) => setField("insurance_accepted", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
          />
        </Field>
      </Section>

      <Section title="Operating hours">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          {DAYS.map((d) => (
            <Field key={d} label={d.toUpperCase()} className="mb-0">
              <Input
                value={p.hours?.[d] || ""}
                onChange={(e) => setHour(d, e.target.value)}
                placeholder="09:00-18:00 or closed"
              />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Booking integration">
        <Field label="Mode">
          <Select
            value={p.booking_config?.mode || "internal"}
            onChange={(e) => setField("booking_config", { ...(p.booking_config || {}), mode: e.target.value })}
          >
            <option value="internal">Internal (SmileDesk bookings)</option>
            <option value="rest">Forward to CRM API</option>
          </Select>
        </Field>
        {p.booking_config?.mode === "rest" && (
          <Field label="CRM endpoint URL">
            <Input
              value={p.booking_config?.endpoint_url || ""}
              onChange={(e) => setField("booking_config", { ...(p.booking_config || {}), endpoint_url: e.target.value })}
            />
          </Field>
        )}
      </Section>

      <div className="flex items-center gap-3">
        <Button onClick={save} loading={saving}>Save changes</Button>
        <AnimatePresence>
          {saved && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-1 text-sm font-medium text-success"
            >
              <Check className="h-4 w-4" /> Saved
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <Section title="Doctors">
        <div className="mb-4 space-y-2">
          {(p.doctors || []).map((d) => (
            <motion.div
              key={d.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground">{d.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {[d.specialization, d.qualification, `${d.years_experience ?? "?"} yrs`].filter(Boolean).join(" · ")}
                </div>
              </div>
              <Button variant="ghost" size="sm" leftIcon={Trash2} className="text-destructive hover:text-destructive" onClick={() => removeDoctor(d.id)}>
                Remove
              </Button>
            </motion.div>
          ))}
          {(p.doctors || []).length === 0 && (
            <p className="text-sm text-muted-foreground">No doctors listed yet.</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Name" value={newDoc.name} onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })} />
          <Input placeholder="Specialization" value={newDoc.specialization} onChange={(e) => setNewDoc({ ...newDoc, specialization: e.target.value })} />
          <Input placeholder="Qualification" value={newDoc.qualification} onChange={(e) => setNewDoc({ ...newDoc, qualification: e.target.value })} />
          <Input placeholder="Years experience" value={newDoc.years_experience} onChange={(e) => setNewDoc({ ...newDoc, years_experience: e.target.value })} />
        </div>
        <Button variant="secondary" size="sm" leftIcon={Plus} className="mt-3" onClick={addDoctor}>
          Add doctor
        </Button>
      </Section>
    </div>
  );
}
