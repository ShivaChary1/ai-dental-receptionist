"""The dental receptionist agent (Gemini + LangChain 1.x create_agent)."""
import time
from datetime import date

from langchain.agents import create_agent
from langchain_core.messages import AIMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from agent.prompts import SYSTEM_PROMPT
from agent.tools import ALL_TOOLS
from config import settings
from logging_config import get_logger

log = get_logger("agent")

_agent = None
_agent_day: str | None = None

# Keywords used for lightweight intent tagging of each turn.
_INTENT_KEYWORDS = {
    "book_appointment": ["book", "schedule", "appointment", "new visit"],
    "reschedule": ["reschedule", "move", "change my appointment", "postpone"],
    "cancel": ["cancel"],
    "faq": ["timing", "hours", "location", "address", "doctor", "service",
            "price", "cost", "insurance", "parking", "offer"],
}


def get_agent():
    """Build (or rebuild for a new day) the compiled tool-calling agent."""
    global _agent, _agent_day
    today = date.today().isoformat()
    if _agent is None or _agent_day != today:
        log.info("Building agent | model=%s | tools=%d", settings.LLM_MODEL, len(ALL_TOOLS))
        if not settings.GOOGLE_API_KEY:
            log.error("GOOGLE_API_KEY is empty — set it in backend/.env")
        llm = ChatGoogleGenerativeAI(
            model=settings.LLM_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.3,
        )
        system_prompt = SYSTEM_PROMPT.format(
            clinic_name=settings.CLINIC_NAME, today=today
        )
        _agent = create_agent(llm, ALL_TOOLS, system_prompt=system_prompt)
        _agent_day = today
        log.info("Agent built successfully.")
    return _agent


def _detect_intent(message: str) -> str | None:
    lower = message.lower()
    for intent, keywords in _INTENT_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return intent
    return None


def _to_lc_messages(history: list[dict], new_message: str) -> list:
    messages = []
    for m in history:
        if m.get("role") == "user":
            messages.append(HumanMessage(content=m.get("content", "")))
        elif m.get("role") == "assistant":
            messages.append(AIMessage(content=m.get("content", "")))
    messages.append(HumanMessage(content=new_message))
    return messages


def _extract_reply(messages: list) -> str:
    """Pull the final assistant text out of the agent's message list."""
    for m in reversed(messages):
        if isinstance(m, AIMessage) or m.__class__.__name__ == "AIMessage":
            content = m.content
            if isinstance(content, list):  # Gemini can return a list of parts
                text = "".join(
                    part.get("text", "") if isinstance(part, dict) else str(part)
                    for part in content
                ).strip()
            else:
                text = (content or "").strip()
            if text:
                return text
    return ""


async def run_agent(message: str, history: list[dict]) -> dict:
    """Run the agent for one turn. Returns {reply, intent}."""
    intent = _detect_intent(message)
    log.info("run_agent | intent=%s | history_len=%d | msg=%r", intent, len(history), message[:120])
    started = time.perf_counter()
    try:
        agent = get_agent()
        result = await agent.ainvoke({"messages": _to_lc_messages(history, message)})
        messages = result.get("messages", [])

        # Log the tool-call trace so we can see what the agent did.
        for m in messages:
            tcs = getattr(m, "tool_calls", None)
            if tcs:
                log.info("agent called tools: %s", [tc.get("name") for tc in tcs])
            if m.__class__.__name__ == "ToolMessage":
                log.info("tool result | %s -> %r", getattr(m, "name", "?"), str(m.content)[:160])

        reply = _extract_reply(messages)
        elapsed = time.perf_counter() - started
        if not reply:
            log.warning("Empty reply after %d messages (%.1fs).", len(messages), elapsed)
            reply = "I'm sorry, I didn't catch that. Could you rephrase?"
        else:
            log.info("run_agent OK in %.1fs | reply=%r", elapsed, reply[:160])
    except Exception as exc:  # graceful fallback — but log the FULL error
        elapsed = time.perf_counter() - started
        log.exception("Agent failed after %.1fs: %s", elapsed, exc)
        reply = _classify_error(exc)
    return {"reply": reply, "intent": intent}


def _classify_error(exc: Exception) -> str:
    """Return a user-facing message that reflects the real failure cause."""
    text = str(exc).lower()
    if "resource_exhausted" in text or "429" in text or "quota" in text:
        log.error("ROOT CAUSE: Gemini quota exhausted for model %r. "
                  "The free tier allows limited requests/day — enable billing or wait for reset.",
                  settings.LLM_MODEL)
        return ("We've hit today's AI usage limit on this clinic's plan. "
                "Please try again later, or call the clinic directly.")
    if "503" in text or "unavailable" in text or "overloaded" in text:
        log.warning("ROOT CAUSE: Gemini model %r temporarily overloaded (503).", settings.LLM_MODEL)
        return "The assistant is briefly overloaded. Please send your message again in a few seconds."
    if "permission" in text or "api key" in text or "401" in text or "403" in text or "not found" in text:
        log.error("ROOT CAUSE: API key / model access problem for %r. Check GOOGLE_API_KEY and model id.",
                  settings.LLM_MODEL)
        return "The assistant is misconfigured right now. Please contact the clinic."
    return ("I'm having a little trouble right now. Please try again in a moment, "
            "or call the clinic directly for urgent matters.")
