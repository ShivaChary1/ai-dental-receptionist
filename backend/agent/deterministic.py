"""Deterministic (non-LLM) logic for the dental graph: red-flag triage,
retrieval reranking, and the safety post-processor. Unit-tested in tests/."""
import re
from datetime import date, datetime

# ── red flags ────────────────────────────────────────────────────────────────
# Each entry: (flag name, compiled pattern). Patterns are deliberately broad —
# a false positive costs a strong "seek care" message; a false negative costs
# far more.
RED_FLAG_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("swelling_with_fever",
     re.compile(r"(?=.*\b(swell\w*|swollen)\b)(?=.*\bfever\w*\b)", re.I | re.S)),
    ("airway_difficulty",
     re.compile(r"\b(difficult\w*|trouble|hard|can'?t|cannot|unable)\b.{0,30}\b(swallow\w*|breath\w*)\b", re.I | re.S)),
    ("tooth_avulsion",
     re.compile(r"\b(knocked[\s-]?out|avuls\w*|fell out)\b.{0,40}\btooth|\btooth\b.{0,40}\b(knocked[\s-]?out|fell out)\b", re.I | re.S)),
    ("dental_trauma",
     re.compile(r"\b(accident|hit|fell|injur\w*|trauma)\b.{0,50}\b(tooth|teeth|jaw|mouth)\b", re.I | re.S)),
    ("uncontrolled_bleeding",
     re.compile(r"\bbleed\w*\b.{0,40}\b(won'?t stop|not stop\w*|uncontroll\w*|heavily|profus\w*)\b"
                r"|\b(won'?t stop|can'?t stop)\b.{0,30}\bbleed\w*", re.I | re.S)),
    ("post_procedure_numbness",
     re.compile(r"\bnumb\w*\b.{0,60}\b(extraction|surgery|procedure|implant|root canal|filling)\b"
                r"|\b(extraction|surgery|procedure|implant)\b.{0,60}\bnumb\w*", re.I | re.S)),
    ("eye_closing_swelling",
     re.compile(r"\b(swell\w*|swollen)\b.{0,50}\b(eye|eyes)\b", re.I | re.S)),
]


def scan_red_flags(text: str) -> list[str]:
    """Return the names of every red-flag pattern the text matches."""
    return [name for name, pattern in RED_FLAG_PATTERNS if pattern.search(text or "")]


# ── rerank ───────────────────────────────────────────────────────────────────
def _recency_factor(published_date) -> float:
    """1.0 for <2y old (or undated), 0.95 for <5y, 0.9 otherwise."""
    if not published_date:
        return 1.0
    try:
        if isinstance(published_date, str):
            published = datetime.strptime(published_date[:10], "%Y-%m-%d").date()
        elif isinstance(published_date, datetime):
            published = published_date.date()
        elif isinstance(published_date, date):
            published = published_date
        else:
            return 1.0
    except ValueError:
        return 1.0
    age_years = (date.today() - published).days / 365.25
    if age_years < 2:
        return 1.0
    if age_years < 5:
        return 0.95
    return 0.9


def rerank_score(chunk: dict) -> float:
    """similarity * (0.7 + 0.06 * authority) * recency."""
    similarity = float(chunk.get("similarity", 0.0))
    authority = int(chunk.get("authority", 2))
    return similarity * (0.7 + 0.06 * authority) * _recency_factor(chunk.get("published_date"))


def rerank_chunks(chunks: list[dict], top_k: int) -> list[dict]:
    return sorted(chunks, key=rerank_score, reverse=True)[:top_k]


# ── safety post-processor ────────────────────────────────────────────────────
_DOSAGE_RE = re.compile(r"\b\d+(?:\.\d+)?\s?(?:mg|mcg|µg|ml|g)\b(?:\s*(?:per|/|every|q)\s*\w+)?", re.I)
_PRESCRIBED_RE = re.compile(r"as (?:prescribed|directed|advised) by", re.I)
_CITATION_RE = re.compile(r"\[(\d{1,2})\]")

CONSUMER_DISCLAIMER = (
    "\n\n*This is general guidance, not a diagnosis — see a dentist in person "
    "for anything persistent or worsening.*"
)

_DISCLAIMER_ROUTES = {"triage", "clinical_qa", "image_analysis", "report_reading"}


def strip_invalid_citations(answer: str, n_citations: int) -> tuple[str, bool]:
    """Remove [n] markers that don't map to a retrieved chunk. Never fabricate."""
    removed = False

    def repl(m):
        nonlocal removed
        if 1 <= int(m.group(1)) <= n_citations:
            return m.group(0)
        removed = True
        return ""

    return _CITATION_RE.sub(repl, answer), removed


def apply_safety(answer: str, mode: str, route: str, urgency: int,
                 n_citations: int) -> tuple[str, list[str]]:
    """Deterministic post-processing. Returns (answer, safety_flags)."""
    flags: list[str] = []

    answer, removed = strip_invalid_citations(answer, n_citations)
    if removed:
        flags.append("invalid_citation_removed")

    if mode != "professional":
        # Consumer mode: no specific dosages unless framed as prescribed.
        def _dose_repl(m):
            start = max(0, m.start() - 80)
            window = answer[start:m.end() + 80]
            if _PRESCRIBED_RE.search(window):
                return m.group(0)
            flags.append("dosage_removed")
            return "(dose as prescribed by your dentist)"

        answer = _DOSAGE_RE.sub(_dose_repl, answer)

        if route in _DISCLAIMER_ROUTES and "not a diagnosis" not in answer.lower():
            answer = answer.rstrip() + CONSUMER_DISCLAIMER
            flags.append("disclaimer_added")

    if urgency >= 2:
        flags.append("emergency_banner")

    return answer, sorted(set(flags))
