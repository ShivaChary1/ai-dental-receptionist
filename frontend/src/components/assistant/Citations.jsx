import { BookOpenText, ExternalLink } from "lucide-react";
import { cn } from "../../lib/cn.js";

/** Numbered source chips under an assistant reply. Only sources actually cited
 *  in the text are shown; each links out when the source has a URL. */
export default function Citations({ citations, content }) {
  if (!citations?.length) return null;
  // Show only citation numbers that appear in the reply text.
  const used = new Set([...(content || "").matchAll(/\[(\d{1,2})\]/g)].map((m) => +m[1]));
  const shown = citations.filter((c) => used.has(c.n));
  if (shown.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
        <BookOpenText className="h-3 w-3" /> Sources
      </span>
      {shown.map((c) => {
        const chip = (
          <span
            className={cn(
              "inline-flex max-w-[16rem] items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs",
              c.url && "transition-colors hover:border-primary/40 hover:bg-primary/5"
            )}
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xs font-semibold text-primary">
              {c.n}
            </span>
            <span className="truncate text-foreground">{c.title}</span>
            {c.url && <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />}
          </span>
        );
        return c.url ? (
          <a key={c.n} href={c.url} target="_blank" rel="noreferrer" title={c.title}>
            {chip}
          </a>
        ) : (
          <span key={c.n} title={c.title}>{chip}</span>
        );
      })}
    </div>
  );
}
