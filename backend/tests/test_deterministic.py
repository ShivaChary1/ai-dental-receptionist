"""Unit tests for the graph's deterministic logic — no LLM calls, no DB."""
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from agent.deterministic import (  # noqa: E402
    apply_safety, rerank_chunks, rerank_score, scan_red_flags, strip_invalid_citations,
)
from services.ingestion import chunk_document  # noqa: E402


# ── red flags ────────────────────────────────────────────────────────────────
def test_red_flag_swelling_with_fever():
    assert "swelling_with_fever" in scan_red_flags("my face is swollen and I have a fever")


def test_red_flag_airway():
    assert "airway_difficulty" in scan_red_flags("it's getting hard to swallow")
    assert "airway_difficulty" in scan_red_flags("I have trouble breathing since the swelling")


def test_red_flag_avulsion_and_trauma():
    assert "tooth_avulsion" in scan_red_flags("my tooth got knocked out in a game")
    assert "dental_trauma" in scan_red_flags("I fell off my bike and hit my jaw")


def test_red_flag_bleeding():
    assert "uncontrolled_bleeding" in scan_red_flags("the bleeding won't stop after extraction")


def test_red_flag_numbness_post_procedure():
    assert "post_procedure_numbness" in scan_red_flags("my lip is still numb two days after the extraction")


def test_no_red_flags_on_benign_input():
    assert scan_red_flags("how often should I floss?") == []
    assert scan_red_flags("my tooth is a bit sensitive to cold water") == []


# ── rerank ───────────────────────────────────────────────────────────────────
def _chunk(sim, authority, published=None):
    return {"similarity": sim, "authority": authority, "published_date": published}


def test_rerank_score_formula():
    assert rerank_score(_chunk(0.8, 5)) == 0.8 * (0.7 + 0.06 * 5)  # recent/undated → factor 1.0


def test_rerank_authority_beats_slightly_higher_similarity():
    low_auth = _chunk(0.80, 1)
    high_auth = _chunk(0.78, 5)
    top = rerank_chunks([low_auth, high_auth], 2)
    assert top[0] is high_auth


def test_rerank_recency_penalty():
    old = str(date.today() - timedelta(days=6 * 365))
    recent = str(date.today() - timedelta(days=100))
    assert rerank_score(_chunk(0.8, 3, old)) < rerank_score(_chunk(0.8, 3, recent))


def test_rerank_respects_top_k():
    chunks = [_chunk(0.5 + i / 100, 2) for i in range(20)]
    assert len(rerank_chunks(chunks, 8)) == 8


# ── citations ────────────────────────────────────────────────────────────────
def test_strip_invalid_citations():
    text, removed = strip_invalid_citations("Fact [1] and fake [7].", n_citations=2)
    assert "[1]" in text and "[7]" not in text and removed


def test_valid_citations_kept():
    text, removed = strip_invalid_citations("A [1], B [2].", n_citations=2)
    assert text == "A [1], B [2]." and not removed


# ── safety post-processor ────────────────────────────────────────────────────
def test_consumer_dosage_stripped():
    answer, flags = apply_safety("Take amoxicillin 500 mg three times daily.",
                                 mode="consumer", route="clinical_qa", urgency=0, n_citations=0)
    assert "500 mg" not in answer
    assert "dosage_removed" in flags


def test_consumer_dosage_kept_when_prescribed_framing():
    text = "Take the antibiotic 500 mg as prescribed by your dentist."
    answer, flags = apply_safety(text, mode="consumer", route="clinical_qa",
                                 urgency=0, n_citations=0)
    assert "500 mg" in answer
    assert "dosage_removed" not in flags


def test_professional_dosage_untouched():
    text = "Amoxicillin 500 mg TID for 5 days [1]."
    answer, flags = apply_safety(text, mode="professional", route="clinical_qa",
                                 urgency=0, n_citations=1)
    assert "500 mg" in answer


def test_disclaimer_added_for_consumer_triage():
    answer, flags = apply_safety("Rinse with salt water.", mode="consumer",
                                 route="triage", urgency=1, n_citations=0)
    assert "not a diagnosis" in answer.lower()
    assert "disclaimer_added" in flags


def test_emergency_banner_flag():
    _, flags = apply_safety("Go now.", mode="consumer", route="triage",
                            urgency=3, n_citations=0)
    assert "emergency_banner" in flags


# ── chunker ──────────────────────────────────────────────────────────────────
def test_chunker_prepends_title_and_heading():
    doc = "# Fluoride\n\n" + ("Fluoride strengthens enamel. " * 40)
    chunks = chunk_document(doc, "ADA Guide")
    assert chunks and chunks[0]["heading"] == "Fluoride"
    assert chunks[0]["content"].startswith("ADA Guide — Fluoride")


def test_chunker_respects_max_tokens():
    doc = "\n\n".join("Paragraph %d. " % i + "word " * 300 for i in range(6))
    chunks = chunk_document(doc, "Doc")
    assert len(chunks) >= 2
    assert all(c["token_count"] <= 900 for c in chunks)  # small tolerance over MAX


def test_chunker_empty_doc():
    assert chunk_document("", "Doc") == []
