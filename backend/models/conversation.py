"""Conversation models."""
from typing import Optional

from pydantic import BaseModel


class ChatRequest(BaseModel):
    session_id: str
    message: str
    patient_name: Optional[str] = None


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    intent: Optional[str] = None
