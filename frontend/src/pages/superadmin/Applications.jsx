import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Inbox, ExternalLink, Check, X, HelpCircle, KeyRound, AlertCircle } from "lucide-react";
import api from "../../api/axios.js";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Skeleton from "../../components/ui/Skeleton.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Textarea } from "../../components/ui/Input.jsx";
import { cn } from "../../lib/cn.js";
import { staggerContainer, listItem } from "../../lib/motion.js";

const STATUS_TABS = ["pending", "info_requested", "approved", "rejected"];
const STATUS_TONE = {
  pending: "warning",
  info_requested: "info",
  approved: "success",
  rejected: "destructive",
};

function Detail({ app, onAction }) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  // Credentials belong to one application only — never carry them across.
  useEffect(() => { setResult(null); setNotes(""); }, [app.id]);

  const act = async (kind) => {
    setBusy(true);
    try {
      const { data } = await api.post(`/api/superadmin/applications/${app.id}/${kind}`, { notes });
      setResult(data);
      onAction();
    } catch (e) {
      setResult({ error: e?.response?.data?.detail || "Action failed." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">{app.clinic_name}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{app.address}</p>
        </div>
        <Badge tone={STATUS_TONE[app.status] || "neutral"}>{app.status.replace("_", " ")}</Badge>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
        {[
          ["Contact", `${app.contact?.poc_name || "—"} · ${app.contact?.phone || "—"}`],
          ["Email", app.contact?.email || "—"],
          ["Services", (app.services || []).join(", ") || "—"],
          ["Reg. no.", app.registration_number || "—"],
          ["Booking mode", app.booking_config?.mode || "—"],
          ["Doctors", (app.doctors || []).map((d) => d.name).join(", ") || "—"],
        ].map(([dt, dd]) => (
          <div key={dt}>
            <dt className="text-xs text-muted-foreground">{dt}</dt>
            <dd className="mt-0.5 text-foreground">{dd}</dd>
          </div>
        ))}
      </dl>

      {app.license_document && (
        <a
          href={app.license_document}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary transition-opacity hover:opacity-80"
        >
          View license document <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}

      {app.status === "pending" || app.status === "info_requested" ? (
        <div className="mt-5 border-t border-border pt-4">
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes / reason (optional)"
            className="mb-3"
          />
          <div className="flex gap-2">
            <Button loading={busy} leftIcon={Check} onClick={() => act("approve")}>Approve</Button>
            <Button disabled={busy} variant="destructive" leftIcon={X} onClick={() => act("reject")}>Reject</Button>
            <Button disabled={busy} variant="secondary" leftIcon={HelpCircle} onClick={() => act("request-info")}>
              Request info
            </Button>
          </div>
        </div>
      ) : (
        app.review_notes && (
          <p className="mt-3 text-sm text-muted-foreground">Notes: {app.review_notes}</p>
        )
      )}

      {result?.temp_password && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-start gap-2 rounded-lg border border-success/20 bg-success/10 p-3 text-sm text-success"
        >
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Approved. Staff login: <b>{result.staff_email}</b> / <b>{result.temp_password}</b>
          </span>
        </motion.div>
      )}
      {result?.error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{result.error}</span>
        </div>
      )}
    </Card>
  );
}

export default function Applications() {
  const [tab, setTab] = useState("pending");
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/superadmin/applications?status=${tab}`);
      setItems(data.items);
      // Keep the current detail open even if it just left this tab's list
      // (e.g. right after approving), so the one-time credentials stay visible.
      setSelected((prev) => data.items.find((a) => a.id === prev?.id) || prev || data.items[0] || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setSelected(null); load(); /* eslint-disable-next-line */ }, [tab]);

  return (
    <div>
      <div className="mb-4 inline-flex rounded-lg border border-border bg-muted/60 p-0.5">
        {STATUS_TABS.map((s) => {
          const activeTab = tab === s;
          return (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={cn(
                "relative rounded-md px-3 py-1.5 text-xs font-medium capitalize outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                activeTab ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {activeTab && (
                <motion.span
                  layoutId="appTab"
                  className="absolute inset-0 rounded-md bg-primary shadow-primary"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative">{s.replace("_", " ")}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            ))}
          </div>
          <div className="col-span-2 rounded-xl border border-border bg-card p-5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-3 h-4 w-64" />
            <Skeleton className="mt-6 h-24 w-full" />
          </div>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={`No ${tab.replace("_", " ")} applications`}
          description="New clinic applications will appear here for review."
        />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
            {items.map((a) => (
              <motion.button
                key={a.id}
                variants={listItem}
                onClick={() => setSelected(a)}
                className={cn(
                  "w-full rounded-xl border p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  selected?.id === a.id
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-card hover:border-primary/25"
                )}
              >
                <div className="truncate text-sm font-medium text-foreground">{a.clinic_name}</div>
                <div className="truncate text-xs text-muted-foreground">{a.address}</div>
              </motion.button>
            ))}
          </motion.div>
          <div className="col-span-2">
            {selected && <Detail app={selected} onAction={load} />}
          </div>
        </div>
      )}
    </div>
  );
}
