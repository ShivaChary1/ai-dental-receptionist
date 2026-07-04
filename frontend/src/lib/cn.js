/** Tiny class combiner — filters falsy, joins with spaces. Later classes win by order. */
export function cn(...parts) {
  return parts.flat().filter(Boolean).join(" ");
}
