import Badge from "./ui/Badge.jsx";

/** Maps a booking/appointment status to a semantic badge tone. */
const TONE = {
  scheduled: "success",
  booked: "success",
  rescheduled: "warning",
  completed: "info",
  no_show: "destructive",
  cancelled: "destructive",
  read: "neutral",
  new: "primary",
  ok: "success",
  failed: "destructive",
};

const LABEL = {
  no_show: "No-show",
  completed: "Visited",
};

export default function StatusBadge({ status, dot = false, className }) {
  return (
    <Badge tone={TONE[status] || "neutral"} dot={dot} className={`capitalize ${className || ""}`}>
      {LABEL[status] || status}
    </Badge>
  );
}
