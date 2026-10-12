"""
Universal question router.

Classifies a free-form question into one of:
  * ``data``   - numerical / student / risk / branch questions -> live-data engine
  * ``code``   - project / architecture / API / source / README -> retrieval
  * ``both``   - needs retrieval AND live data
  * ``debug``  - something is broken/erroring -> code retrieval + logs
Follow-up questions (pronouns / ellipsis) are flagged so recent conversation
context can resolve references.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

DATA_SIGNALS = [
    "how many", "count", "number of", "total number", "average", "mean", "median",
    "percentage", "percent", "%", "at risk", "at-risk", "need support", "needs support",
    "requiring support", "critical", "high risk", "below", "above", "under", "over",
    "highest", "lowest", "top ", "bottom", "rank", "ranking", "compare", "comparison",
    "distribution", "branch", "department", "dept", "cgpa", "gpa", "attendance",
    "placement", "placed", "readiness", "backlog", "backlogs", "lms", "coding",
    "aptitude", "mock interview", "dimension", "how much", "per branch", "by branch",
    "active dataset", "records", "students with", "which branch", "which department",
]

CODE_SIGNALS = [
    "how does", "how do", "where is", "where are", "where can", "what file", "which file",
    "api", "endpoint", "route", "function", "class", "method", "implement", "implemented",
    "architecture", "readme", "setup", "install", "requirement", "dependency", "dependencies",
    "config", "configuration", "threshold", "weight", "weights", "schema", "database",
    "table", "model", "source code", "codebase", "repo", "project structure",
    "explain the code", "how is it built", "tech stack", "framework", "frontend",
    "backend", "react", "fastapi", "sqlalchemy", "vite", "component", "service",
    "risk rule", "risk logic", "formula", "scoring", "workflow", "pipeline",
]

DEBUG_SIGNALS = [
    "error", "bug", "not working", "doesn't work", "does not work", "broken", "fails",
    "failing", "exception", "traceback", "crash", "issue", "why isn't", "why is",
    "stack trace", "500", "404", "undefined", "cannot", "can't", "unable to", "stuck",
]

FOLLOWUP_SIGNALS = [
    "what about", "how about", "and the", "what if", "those", "these", "them", "that",
    "this", "it ", "same for", "compare with", "and for", "there", "their", "instead",
]


def _score(lowered: str, signals: List[str]) -> int:
    return sum(1 for sig in signals if sig in lowered)


def classify(query: str, history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
    lowered = query.lower().strip()
    data_score = _score(lowered, DATA_SIGNALS)
    code_score = _score(lowered, CODE_SIGNALS)
    debug_score = _score(lowered, DEBUG_SIGNALS)

    # Strong explicit signals.
    if re.search(r"\bstu-\d", lowered):
        data_score += 3
    if re.search(r"/api/|\.py\b|\.tsx?\b|\.md\b", lowered):
        code_score += 3
    if re.search(r"\d", lowered):
        data_score += 1

    has_history = bool(history)
    needs_history = has_history and (
        any(sig in lowered for sig in FOLLOWUP_SIGNALS) or len(lowered.split()) <= 4
    )

    if debug_score > 0 and debug_score >= data_score:
        intent = "debug"
    elif data_score > 0 and code_score > 0:
        intent = "both"
    elif data_score > 0:
        intent = "data"
    elif code_score > 0:
        intent = "code"
    else:
        # Unknown/general questions are treated as project-knowledge retrieval.
        intent = "code"

    return {
        "intent": intent,
        "data_score": data_score,
        "code_score": code_score,
        "debug_score": debug_score,
        "needs_history": needs_history,
        "cleaned_query": query.strip(),
    }
