"""All LLM prompts for the dental agent graph. No prompts live in node code."""
from agent.prompts.router import ROUTER_PROMPT
from agent.prompts.synthesis_consumer import CONSUMER_SYNTHESIS_PROMPT
from agent.prompts.synthesis_professional import PROFESSIONAL_SYNTHESIS_PROMPT
from agent.prompts.triage import TRIAGE_ADDENDUM, EMERGENCY_RESPONSE
from agent.prompts.vision import VISION_VALIDATE_PROMPT, VISION_ANALYZE_PROMPT
from agent.prompts.report import REPORT_PROMPT
from agent.prompts.receptionist import SYSTEM_PROMPT
from agent.prompts.booking import BOOKING_PROMPT

__all__ = [
    "SYSTEM_PROMPT", "BOOKING_PROMPT",
    "ROUTER_PROMPT", "CONSUMER_SYNTHESIS_PROMPT", "PROFESSIONAL_SYNTHESIS_PROMPT",
    "TRIAGE_ADDENDUM", "EMERGENCY_RESPONSE", "VISION_VALIDATE_PROMPT",
    "VISION_ANALYZE_PROMPT", "REPORT_PROMPT",
]
