"""Compatibility shim: the triage agent is now the dental StateGraph.

Kept so existing imports (`from agent.triage_agent import run_triage, ...`)
continue to work; all logic lives in agent/graph.py."""
from agent.graph import run_dental as run_triage  # noqa: F401
from agent.graph import stream_dental as stream_triage  # noqa: F401
