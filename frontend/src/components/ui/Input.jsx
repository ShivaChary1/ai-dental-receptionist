import { forwardRef } from "react";
import { cn } from "../../lib/cn.js";

const base =
  "w-full rounded-md border bg-card text-foreground placeholder:text-muted-foreground/70 " +
  "transition-colors duration-fast ease-out focus-visible:outline-none " +
  "focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-55";

export const Input = forwardRef(function Input(
  { className, invalid = false, leftIcon: LeftIcon, ...props },
  ref
) {
  if (LeftIcon) {
    return (
      <div className="relative">
        <LeftIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cn(
            base,
            "h-9 pl-9 pr-3 text-sm",
            invalid ? "border-destructive focus-visible:border-destructive" : "border-input",
            className
          )}
          {...props}
        />
      </div>
    );
  }
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        base,
        "h-9 px-3 text-sm",
        invalid ? "border-destructive focus-visible:border-destructive" : "border-input",
        className
      )}
      {...props}
    />
  );
});

export const Textarea = forwardRef(function Textarea(
  { className, invalid = false, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        base,
        "px-3 py-2 text-sm min-h-[80px] resize-y",
        invalid ? "border-destructive focus-visible:border-destructive" : "border-input",
        className
      )}
      {...props}
    />
  );
});

export const Select = forwardRef(function Select(
  { className, invalid = false, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        base,
        "h-9 px-3 text-sm appearance-none bg-no-repeat pr-9",
        "bg-[right_0.6rem_center] bg-[length:1rem]",
        invalid ? "border-destructive focus-visible:border-destructive" : "border-input",
        className
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      }}
      {...props}
    >
      {children}
    </select>
  );
});

export function Label({ className, ...props }) {
  return (
    <label
      className={cn("block text-sm font-medium text-foreground mb-1.5", className)}
      {...props}
    />
  );
}

/** Labeled field with optional hint + error. Error replaces hint when present. */
export function Field({ label, htmlFor, hint, error, children, className }) {
  return (
    <div className={cn("mb-4", className)}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export default Input;
