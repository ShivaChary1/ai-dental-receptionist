"""Knowledge base models."""
from typing import Any, Optional

from pydantic import BaseModel, Field


class KnowledgeIn(BaseModel):
    """Create / update payload for a knowledge entry."""

    category: str = Field(..., description="static | dynamic")
    key: str
    title: str
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)
