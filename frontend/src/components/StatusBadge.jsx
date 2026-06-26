const STYLES = {
  scheduled: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
  rescheduled: "bg-yellow-100 text-yellow-700",
};

export default function StatusBadge({ status }) {
  const cls = STYLES[status] || "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}
