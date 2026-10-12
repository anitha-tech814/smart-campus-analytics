from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Intervention
from app.schemas import (
    ChatQueryRequest,
    ChatQueryResponse,
    AssistantAskRequest,
    AssistantAnswer,
)
from app.services.assistant_service import process_assistant_query
from app.services.rag import rag_service
from app.api.routes_students import get_all_enriched, get_current_settings

router = APIRouter(prefix="/api/assistant", tags=["Assistant"])


# ---------------------------------------------------------------------------
# Legacy deterministic rule-based assistant (kept for backward compatibility).
# ---------------------------------------------------------------------------
@router.post("/query", response_model=ChatQueryResponse)
def handle_assistant_query(payload: ChatQueryRequest, db: Session = Depends(get_db)):
    weights, thresholds = get_current_settings(db)
    interventions = db.query(Intervention).all()
    enriched = get_all_enriched(db)

    interventions_data = [
        {
            "id": it.id,
            "student_id": it.student_id,
            "student_name": it.student_name,
            "department": it.department,
            "intervention_type": it.intervention_type,
            "faculty_member": it.faculty_member,
            "status": it.status,
            "notes": it.notes,
            "follow_up_date": it.follow_up_date,
            "baseline_cgpa": it.baseline_cgpa,
            "subsequent_cgpa": it.subsequent_cgpa,
        }
        for it in interventions
    ]

    result = process_assistant_query(
        payload.query,
        enriched,
        {"weights": weights.dict(), "thresholds": thresholds.dict()},
        interventions=interventions_data,
    )
    return result


# ---------------------------------------------------------------------------
# RAG assistant (local retrieval + live-data tools + OpenRouter generation).
# ---------------------------------------------------------------------------
@router.post("/ask", response_model=AssistantAnswer)
def assistant_ask(payload: AssistantAskRequest, db: Session = Depends(get_db)):
    history = [m.dict() for m in (payload.history or [])]
    return rag_service.answer(payload.query, history=history, db=db)


@router.get("/health")
def assistant_health():
    """Honest status of the LLM provider, retrieval backend, and index."""
    return rag_service.health_status()


@router.get("/index/status")
def assistant_index_status():
    return rag_service.get_index_status()


@router.post("/index/reindex")
def assistant_reindex(force: bool = False):
    return rag_service.reindex(force=force)


@router.post("/index/reset")
def assistant_index_reset():
    return rag_service.reset_index()
