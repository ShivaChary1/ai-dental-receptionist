import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import api from "../api/axios.js";
import { useAuth } from "../auth/AuthContext.jsx";
import Button from "./ui/Button.jsx";
import Avatar from "./ui/Avatar.jsx";
import { Textarea } from "./ui/Input.jsx";
import { cn } from "../lib/cn.js";
import { staggerContainer, listItem } from "../lib/motion.js";

function Stars({ value, onChange, size = "h-6 w-6" }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= (hover || value);
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange?.(n)}
            onMouseEnter={() => onChange && setHover(n)}
            className={cn("transition-transform", onChange && "hover:scale-110")}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            <Star className={cn(size, filled ? "fill-warning text-warning" : "text-muted-foreground/40")} />
          </button>
        );
      })}
    </div>
  );
}

/** Static star row for a submitted review. */
function StarRow({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("h-3.5 w-3.5", n <= rating ? "fill-warning text-warning" : "text-muted-foreground/30")} />
      ))}
    </div>
  );
}

export default function ReviewsSection({ hospitalId, onRatingChange }) {
  const { isPatient } = useAuth();
  const [items, setItems] = useState([]);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await api.get(`/api/hospitals/${hospitalId}/reviews`);
    setItems(data.items);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [hospitalId]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/api/hospitals/${hospitalId}/reviews`, { rating, text });
      setText("");
      await load();
      onRatingChange?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-8">
      <h2 className="mb-3 text-md font-semibold tracking-tight text-foreground">Reviews</h2>

      {isPatient ? (
        <form onSubmit={submit} className="mb-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className="mb-2 block text-sm font-medium text-foreground">Rate your visit</span>
          <Stars value={rating} onChange={setRating} />
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="Share your experience…"
            className="mt-3"
          />
          <div className="mt-3 flex justify-end">
            <Button type="submit" size="sm" loading={busy}>Submit review</Button>
          </div>
        </form>
      ) : (
        <p className="mb-4 text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link> to leave a review.
        </p>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet — be the first.</p>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
          {items.map((r) => (
            <motion.div
              key={r.id}
              variants={listItem}
              className="rounded-xl border border-border bg-card p-4 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Avatar name={r.patient_name} size="sm" />
                  <span className="text-sm font-medium text-foreground">{r.patient_name}</span>
                </div>
                <StarRow rating={r.rating} />
              </div>
              {r.text && <p className="mt-2 text-sm text-muted-foreground">{r.text}</p>}
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
