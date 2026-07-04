"""The dental agent: a LangGraph StateGraph.

START → classify → { off_topic → redirect,
                     urgency 3 → emergency_response,
                     triage → red_flag_check → retrieve,
                     general_qa/clinical_qa/product → retrieve,
                     booking → synthesize (tool loop),
                     image_analysis → validate_image → vision_analyze → safety_check,
                     report_reading → extract_document → synthesize → safety_check }
retrieve → rerank → synthesize → safety_check → END

Deterministic logic (red flags, rerank, safety post-processing) is plain Python
in `agent.deterministic` with unit tests; every prompt lives in `agent.prompts`.
"""
import json
import time
from datetime import date
from typing import Annotated, Optional, TypedDict

import httpx
from bson import ObjectId
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages

from agent import rag
from agent.booking_tools import BOOKING_TOOLS, set_request_context
from agent.dental_agent import _classify_error, _extract_reply, _to_lc_messages
from agent.deterministic import apply_safety, rerank_chunks, scan_red_flags
from agent import prompts as P
from config import settings
from database import get_db
from logging_config import get_logger

log = get_logger("dental-graph")


class DentalState(TypedDict, total=False):
    messages: Annotated[list, add_messages]
    query: str
    history_text: str
    route: str
    urgency: int
    language: str
    mode: str
    patient_context: str
    retrieved_chunks: list
    citations: list
    image_data: Optional[str]
    document_text: Optional[str]
    structured_findings: Optional[dict]
    safety_flags: list
    final_answer: str
    model_used: str


# ── models ──────────────────────────────────────────────────────────────────
_llms: dict[str, ChatGoogleGenerativeAI] = {}


def _llm(model: str, internal: bool = False) -> ChatGoogleGenerativeAI:
    key = f"{model}:{internal}"
    if key not in _llms:
        llm = ChatGoogleGenerativeAI(
            model=model, google_api_key=settings.GOOGLE_API_KEY, temperature=0.3,
        )
        # "internal" calls (router, vision validation) are excluded from token streaming.
        _llms[key] = llm.with_config(tags=["internal"]) if internal else llm
    return _llms[key]


def _parse_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        text = text[4:] if text.startswith("json") else text
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"no JSON object in: {text[:120]!r}")
    return json.loads(text[start:end + 1])


# ── nodes ───────────────────────────────────────────────────────────────────
async def classify(state: DentalState) -> dict:
    # Attachments decide the route without an LLM call.
    if state.get("image_data"):
        return {"route": "image_analysis", "urgency": 0, "language": "en"}
    if state.get("document_text"):
        return {"route": "report_reading", "urgency": 0, "language": "en"}
    prompt = P.ROUTER_PROMPT.format(
        history=state.get("history_text") or "(none)", message=state["query"]
    )
    try:
        res = await _llm(settings.ROUTER_MODEL, internal=True).ainvoke(prompt)
        data = _parse_json(_extract_reply([res]) or str(res.content))
        route = data.get("route", "general_qa")
        urgency = int(data.get("urgency", 0))
        language = data.get("language", "en")
    except Exception as exc:
        log.warning("classify failed (%s) — defaulting to general_qa", exc)
        route, urgency, language = "general_qa", 0, "en"
    log.info("classify | route=%s urgency=%d lang=%s", route, urgency, language)
    return {"route": route, "urgency": min(max(urgency, 0), 3), "language": language}


def red_flag_check(state: DentalState) -> dict:
    flags = scan_red_flags(state["query"])
    if flags:
        log.info("red flags hit: %s", flags)
        return {"urgency": 3, "safety_flags": list(set((state.get("safety_flags") or []) + flags))}
    return {}


def redirect(state: DentalState) -> dict:
    return {"final_answer": (
        "I'm SmileDesk — I can only help with dental and oral-health topics. "
        "Ask me about a symptom, a treatment, oral hygiene, or finding and booking "
        "a dental clinic near you."
    ), "citations": [], "safety_flags": []}


def emergency_response(state: DentalState) -> dict:
    flags = state.get("safety_flags") or []
    reason = ("Symptoms like these can indicate a serious infection or injury that "
              "gets worse quickly.")
    answer = P.EMERGENCY_RESPONSE.format(reason=reason)
    return {"final_answer": answer, "urgency": 3, "citations": [],
            "safety_flags": list(set(flags + ["emergency_banner"]))}


async def retrieve(state: DentalState) -> dict:
    chunks = await rag.search_structured(state["query"], settings.TOP_K_RETRIEVE)
    return {"retrieved_chunks": chunks}


async def _tavily_search(query: str) -> list[dict]:
    if not settings.TAVILY_API_KEY:
        return []
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            res = await client.post("https://api.tavily.com/search", json={
                "api_key": settings.TAVILY_API_KEY,
                "query": f"dental {query}",
                "include_domains": settings.TAVILY_DOMAINS,
                "max_results": 5,
            })
        res.raise_for_status()
        return [
            {"content": r.get("content", ""), "heading": r.get("title"),
             "source_id": f"web:{r.get('url')}", "source_title": r.get("title", "Web source"),
             "authority": 2, "url": r.get("url"), "published_date": None,
             "similarity": settings.SIMILARITY_THRESHOLD}
            for r in res.json().get("results", []) if r.get("content")
        ]
    except Exception as exc:
        log.warning("Tavily search failed: %s", exc)
        return []


async def rerank(state: DentalState) -> dict:
    chunks = state.get("retrieved_chunks") or []
    top = rerank_chunks(chunks, settings.TOP_K_FINAL)
    max_sim = max((c["similarity"] for c in chunks), default=0.0)
    if max_sim < settings.SIMILARITY_THRESHOLD:
        web = await _tavily_search(state["query"])
        if web:
            log.info("weak retrieval (max sim %.2f) — merged %d web results", max_sim, len(web))
            top = rerank_chunks(chunks + web, settings.TOP_K_FINAL)
    return {"retrieved_chunks": top}


def _context_block(chunks: list) -> tuple[str, list]:
    lines, citations = [], []
    for i, c in enumerate(chunks, start=1):
        title = c.get("source_title") or "Source"
        heading = f" — {c['heading']}" if c.get("heading") else ""
        lines.append(f"[{i}] {title}{heading}\n{c['content'][:1200]}")
        citations.append({"n": i, "title": title, "url": c.get("url"),
                          "authority": c.get("authority", 2),
                          "source_id": str(c.get("source_id"))})
    return ("\n\n".join(lines) if lines
            else "(no sources retrieved — say you lack a vetted source for clinical claims)"), citations


async def synthesize(state: DentalState) -> dict:
    route = state.get("route", "general_qa")
    mode = state.get("mode", "consumer")
    today = date.today().isoformat()
    language = state.get("language", "en")
    patient_context = state.get("patient_context") or "(guest — not signed in)"

    # Booking branch: a bounded tool loop with the clinic/booking tools.
    if route == "booking":
        prompt = P.BOOKING_PROMPT.format(today=today, language=language,
                                         patient_context=patient_context)
        agent = create_agent(_llm(settings.CHEAP_SYNTH_MODEL), BOOKING_TOOLS,
                             system_prompt=prompt)
        result = await agent.ainvoke({"messages": state["messages"]})
        reply = _extract_reply(result.get("messages", [])) or \
            "I'm sorry, I didn't catch that. Could you rephrase?"
        return {"final_answer": reply, "citations": [],
                "model_used": settings.CHEAP_SYNTH_MODEL}

    context, citations = _context_block(state.get("retrieved_chunks") or [])
    template = P.PROFESSIONAL_SYNTHESIS_PROMPT if mode == "professional" else P.CONSUMER_SYNTHESIS_PROMPT

    if route == "report_reading":
        system = P.REPORT_PROMPT.format(
            today=today, language=language, patient_context=patient_context,
            context=context, document=(state.get("document_text") or "")[:20000],
            mode_style="clinical terms" if mode == "professional" else "plain language",
        )
    else:
        system = template.format(today=today, language=language,
                                 patient_context=patient_context, context=context)
        if route == "triage":
            system += P.TRIAGE_ADDENDUM.format(urgency=state.get("urgency", 1))

    model = settings.FRONTIER_SYNTH_MODEL if route in ("clinical_qa", "triage") \
        else settings.CHEAP_SYNTH_MODEL
    res = await _llm(model).ainvoke([SystemMessage(content=system), *state["messages"]])
    reply = _extract_reply([res]) or "I'm sorry, I didn't catch that. Could you rephrase?"
    return {"final_answer": reply, "citations": citations, "model_used": model}


async def validate_image(state: DentalState) -> dict:
    msg = HumanMessage(content=[
        {"type": "text", "text": P.VISION_VALIDATE_PROMPT},
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{state['image_data']}"}},
    ])
    try:
        res = await _llm(settings.VISION_MODEL, internal=True).ainvoke([msg])
        data = _parse_json(_extract_reply([res]))
        if not data.get("valid"):
            return {"final_answer": (
                "That doesn't look like a dental image (an intraoral photo or a dental "
                f"X-ray). {data.get('reason', '')} Please share a clear photo of the tooth "
                "or area you're concerned about."
            ), "route": "image_rejected", "citations": []}
        return {}
    except Exception as exc:
        log.warning("validate_image failed: %s — proceeding to analysis", exc)
        return {}


async def vision_analyze(state: DentalState) -> dict:
    user_note = state.get("query") or ""
    msg = HumanMessage(content=[
        {"type": "text", "text": P.VISION_ANALYZE_PROMPT +
         (f"\n\nPatient's note about the image: {user_note}" if user_note else "")},
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{state['image_data']}"}},
    ])
    try:
        res = await _llm(settings.VISION_MODEL).ainvoke([msg])
        findings = _parse_json(_extract_reply([res]))
    except Exception as exc:
        log.exception("vision_analyze failed: %s", exc)
        return {"final_answer": _classify_error(exc), "citations": []}

    parts = [f"Here's what I can see ({findings.get('image_type', 'image')}, "
             f"image quality {findings.get('image_quality', 'unknown')}):", ""]
    for f in findings.get("findings", []):
        loc = f" ({f['location']})" if f.get("location") else ""
        parts.append(f"- {f.get('observation', '')}{loc} — confidence {f.get('confidence', 'low')}")
    if findings.get("recommendation"):
        parts += ["", f"**Recommendation:** {findings['recommendation']}"]
    if findings.get("limitations"):
        parts += ["", f"*{findings['limitations']}*"]
    return {"final_answer": "\n".join(parts),
            "structured_findings": findings,
            "urgency": min(max(int(findings.get("urgency", 0)), 0), 3),
            "citations": [], "model_used": settings.VISION_MODEL}


def extract_document(state: DentalState) -> dict:
    # Extraction itself happens at the API layer (pymupdf on the upload);
    # this node guards the graph path.
    if not (state.get("document_text") or "").strip():
        return {"final_answer": "I couldn't read any text from that document. "
                                "If it's a scanned image, try sharing it as a photo instead.",
                "route": "report_rejected", "citations": []}
    return {}


def safety_check(state: DentalState) -> dict:
    answer, flags = apply_safety(
        state.get("final_answer") or "",
        mode=state.get("mode", "consumer"),
        route=state.get("route", "general_qa"),
        urgency=state.get("urgency", 0),
        n_citations=len(state.get("citations") or []),
    )
    return {"final_answer": answer,
            "safety_flags": list(set((state.get("safety_flags") or []) + flags))}


# ── graph wiring ────────────────────────────────────────────────────────────
def _after_classify(state: DentalState) -> str:
    if state.get("urgency", 0) >= 3:
        return "emergency_response"
    route = state.get("route", "general_qa")
    if route == "off_topic":
        return "redirect"
    if route == "triage":
        return "red_flag_check"
    if route == "booking":
        return "synthesize"
    if route == "image_analysis":
        return "validate_image"
    if route == "report_reading":
        return "extract_document"
    return "retrieve"  # general_qa | clinical_qa | product


def _after_red_flags(state: DentalState) -> str:
    return "emergency_response" if state.get("urgency", 0) >= 3 else "retrieve"


def _after_validate(state: DentalState) -> str:
    return "safety_check" if state.get("route") == "image_rejected" else "vision_analyze"


def _after_extract(state: DentalState) -> str:
    return "safety_check" if state.get("route") == "report_rejected" else "synthesize"


def build_graph():
    g = StateGraph(DentalState)
    g.add_node("classify", classify)
    g.add_node("red_flag_check", red_flag_check)
    g.add_node("redirect", redirect)
    g.add_node("emergency_response", emergency_response)
    g.add_node("retrieve", retrieve)
    g.add_node("rerank", rerank)
    g.add_node("synthesize", synthesize)
    g.add_node("safety_check", safety_check)
    g.add_node("validate_image", validate_image)
    g.add_node("vision_analyze", vision_analyze)
    g.add_node("extract_document", extract_document)

    g.add_edge(START, "classify")
    g.add_conditional_edges("classify", _after_classify)
    g.add_conditional_edges("red_flag_check", _after_red_flags)
    g.add_edge("redirect", END)
    g.add_edge("emergency_response", END)
    g.add_edge("retrieve", "rerank")
    g.add_edge("rerank", "synthesize")
    g.add_edge("synthesize", "safety_check")
    g.add_conditional_edges("validate_image", _after_validate)
    g.add_edge("vision_analyze", "safety_check")
    g.add_conditional_edges("extract_document", _after_extract)
    g.add_edge("safety_check", END)
    return g.compile()


_graph = None


def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
        log.info("Dental graph compiled.")
    return _graph


# ── run helpers ─────────────────────────────────────────────────────────────
_URGENCY_LEVELS = {3: "emergency", 2: "urgent", 1: "routine", 0: None}
_URGENCY_REASON = {
    3: "Your symptoms may need immediate professional care.",
    2: "This should be looked at by a dentist within 24–48 hours.",
    1: "Worth booking a dental visit soon.",
}


async def _build_patient_context(patient: dict | None) -> str:
    if not patient:
        return "The patient is NOT signed in (guest). Booking requires sign-in."
    db = get_db()
    profile = await db.users.find_one({"_id": ObjectId(patient["id"])}) or {}
    parts = [f"Signed in as {profile.get('name') or profile.get('email') or 'a patient'}."]
    fields = [("Allergies", profile.get("allergies")),
              ("Current medications", profile.get("medications")),
              ("Medical conditions", profile.get("conditions")),
              ("Last dental visit", profile.get("last_dental_visit"))]
    known = [f"- {k}: {v}" for k, v in fields if v and str(v).strip()]
    if known:
        parts.append("Health profile:\n" + "\n".join(known))
    cursor = db.bookings.find(
        {"user_id": patient["id"], "status": {"$in": ["booked", "rescheduled"]}}
    ).sort("appointment_date", -1).limit(3)
    lines = []
    async for b in cursor:
        h = await db.hospitals.find_one({"_id": b.get("hospital_id")}, {"name": 1})
        lines.append(f"- {b.get('appointment_date')} {b.get('time_slot')} at "
                     f"{(h or {}).get('name', 'a clinic')} with {b.get('doctor_name')} ({b.get('status')})")
    if lines:
        parts.append("Upcoming/recent bookings:\n" + "\n".join(lines))
    return "\n".join(parts)


def _history_text(history: list[dict], limit: int = 6) -> str:
    return "\n".join(f"{m.get('role')}: {m.get('content', '')[:200]}" for m in history[-limit:])


async def _initial_state(message, history, location, patient, mode,
                         image_data, document_text) -> tuple[dict, list]:
    reco_sink = set_request_context(location, patient)
    state = {
        "messages": _to_lc_messages(history, message),
        "query": message,
        "history_text": _history_text(history),
        "mode": mode if mode in ("consumer", "professional") else "consumer",
        "patient_context": await _build_patient_context(patient),
        "image_data": image_data,
        "document_text": document_text,
        "safety_flags": [],
    }
    return state, reco_sink


def _final_payload(state: dict, reco_sink: list) -> dict:
    urgency_int = int(state.get("urgency", 0) or 0)
    level = _URGENCY_LEVELS.get(urgency_int)
    return {
        "reply": state.get("final_answer") or "I'm sorry, I didn't catch that. Could you rephrase?",
        "recommendations": _dedupe(reco_sink),
        "urgency": {"level": level, "reason": _URGENCY_REASON.get(urgency_int, "")} if level else None,
        "citations": state.get("citations") or [],
        "route": state.get("route"),
        "safety_flags": state.get("safety_flags") or [],
        "structured_findings": state.get("structured_findings"),
        "model_used": state.get("model_used"),
    }


def _dedupe(sink: list) -> list:
    seen, out = set(), []
    for r in sink:
        if r["id"] not in seen:
            seen.add(r["id"])
            out.append(r)
    return out


async def run_dental(message: str, history: list[dict], location: dict | None,
                     patient: dict | None = None, mode: str = "consumer",
                     image_data: str | None = None, document_text: str | None = None) -> dict:
    """One non-streaming turn through the graph."""
    state, reco_sink = await _initial_state(message, history, location, patient,
                                            mode, image_data, document_text)
    started = time.perf_counter()
    try:
        final = await get_graph().ainvoke(state)
    except Exception as exc:
        log.exception("Graph run failed: %s", exc)
        return {"reply": _classify_error(exc), "recommendations": [], "urgency": None,
                "citations": [], "route": None, "safety_flags": [], "structured_findings": None}
    log.info("run_dental OK in %.1fs | route=%s", time.perf_counter() - started, final.get("route"))
    return _final_payload(final, reco_sink)


async def stream_dental(message: str, history: list[dict], location: dict | None,
                        patient: dict | None = None, mode: str = "consumer",
                        image_data: str | None = None, document_text: str | None = None):
    """Async generator: ("token", text) while user-facing models write, then
    ("done", payload). Internal calls (router, validators) never stream."""
    state, reco_sink = await _initial_state(message, history, location, patient,
                                            mode, image_data, document_text)
    started = time.perf_counter()
    final = None
    try:
        async for stream_mode, payload in get_graph().astream(
            state, stream_mode=["messages", "values", "updates"]
        ):
            if stream_mode == "updates":
                # A node finished — surface it as a progress step (Perplexity-style).
                for node in payload:
                    if not node.startswith("__"):
                        yield "step", node
                continue
            if stream_mode == "messages":
                chunk, meta = payload
                if "internal" in (meta.get("tags") or []):
                    continue
                content = getattr(chunk, "content", None)
                if isinstance(content, list):
                    text = "".join(p.get("text", "") if isinstance(p, dict) else str(p)
                                   for p in content)
                else:
                    text = content or ""
                if text:
                    yield "token", text
            else:  # values — keep the latest full state snapshot
                final = payload
        log.info("stream_dental OK in %.1fs | route=%s",
                 time.perf_counter() - started, (final or {}).get("route"))
    except Exception as exc:
        log.exception("Graph stream failed: %s", exc)
        err = _classify_error(exc)
        yield "token", err
        yield "done", {"reply": err, "recommendations": [], "urgency": None,
                       "citations": [], "route": None, "safety_flags": [],
                       "structured_findings": None}
        return
    yield "done", _final_payload(final or {}, reco_sink)
