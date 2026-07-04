import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, useReducedMotion } from "framer-motion";
import { FileText } from "lucide-react";
import { DURATION, EASE } from "../lib/motion.js";

/** Reveal streamed text a few characters per frame — the reply reads as if
 *  it's being written live, even when the model delivers big chunks. */
function useTypewriter(text, active) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(active ? "" : text);
  const idxRef = useRef(active ? 0 : text.length);

  useEffect(() => {
    if (!active || reduce) {
      idxRef.current = text.length;
      setShown(text);
      return;
    }
    let raf;
    const step = () => {
      if (idxRef.current < text.length) {
        // ~180 chars/s at 60fps — fast enough to keep up, slow enough to read.
        idxRef.current = Math.min(idxRef.current + 3, text.length);
        setShown(text.slice(0, idxRef.current));
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [text, active, reduce]);

  return active && !reduce ? shown : text;
}

/**
 * A chat turn. Assistant replies render as plain open text — no bubble box,
 * no avatar — like a document being written; user messages sit in a quiet
 * muted bubble on the right. User messages can carry an attachment.
 */
export default function ChatBubble({ role, content, attachment, streaming }) {
  const isUser = role === "user";
  const displayed = useTypewriter(content || "", !isUser && !!streaming);

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DURATION.base, ease: EASE.out }}
        className="mb-5 flex justify-end"
      >
        <div className="max-w-[78%]">
          {attachment?.type === "image" && attachment.url && (
            <img
              src={attachment.url}
              alt="Shared photo"
              className="mb-1.5 ml-auto block max-h-64 rounded-2xl rounded-br-md border border-border object-cover shadow-sm"
            />
          )}
          {attachment?.type === "file" && (
            <div className="mb-1.5 ml-auto flex w-fit items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-xs">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-3.5 w-3.5" />
              </span>
              <span className="max-w-[220px] truncate">{attachment.name}</span>
            </div>
          )}
          {content && (
            <div className="w-fit max-w-full rounded-2xl rounded-br-md bg-muted px-4 py-2.5 text-sm leading-relaxed text-foreground ml-auto">
              <span className="whitespace-pre-wrap">{content}</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.base, ease: EASE.out }}
      className="mb-5"
    >
      <div className="markdown min-w-0 text-sm leading-relaxed text-foreground">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayed}</ReactMarkdown>
        {streaming && (
          <span
            aria-hidden
            className="ml-0.5 inline-block h-4 w-0.5 animate-pulse rounded-full bg-primary align-middle motion-reduce:animate-none"
          />
        )}
      </div>
    </motion.div>
  );
}

/** Minimal thinking indicator for the instant before step events arrive. */
export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ duration: DURATION.base, ease: EASE.out }}
      className="mb-6"
    >
      <span
        className="thinking-shimmer text-sm font-medium"
        role="status"
        aria-label="Assistant is thinking"
      >
        Thinking…
      </span>
    </motion.div>
  );
}
