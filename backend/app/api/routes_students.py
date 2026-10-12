import io
import csv
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Response
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.database import get_db
from app.models import Student, SystemSetting
from app.schemas import StudentDetail, InterventionUpdate, StudentCreate
from app.config import DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS, ScoringWeights, RiskThresholds
from app.services.scoring_service import calculate_success_score
from app.services.risk_service import evaluate_student_risk, evaluate_flags, build_risk_flags
from app.services.recommendation_service import generate_recommendations
from app.services.data_service import parse_and_validate_file

router = APIRouter(prefix="/api/students", tags=["Students"])

# ---------------------------------------------------------------------------
# Shared full-cohort enrichment cache.
# Enriching 12,000+ students (score + risk + recommendations) is the dominant
# cost across the API. Computed values only depend on immutable student columns
# plus the active scoring weights / thresholds, so we cache the enriched list
# and invalidate it whenever the underlying data or settings change.
# ---------------------------------------------------------------------------
_enriched_cache: Dict[str, Any] = {"signature": None, "students": None}


def invalidate_enriched_cache():
    """Force the shared enrichment cache to recompute on next access."""
    _enriched_cache["signature"] = None
    _enriched_cache["students"] = None


def get_dataset_signature(db: Session) -> tuple:
    """Cheap signature that changes whenever student telemetry or settings change."""
    total = db.query(func.count(Student.id)).scalar()
    max_id = db.query(func.max(Student.id)).scalar()
    max_created = db.query(func.max(Student.created_at)).scalar()
    max_review = db.query(func.max(Student.last_reviewed_at)).scalar()
    weights, thresholds = get_current_settings(db)
    return (
        total,
        max_id,
        max_created,
        max_review,
        json.dumps(weights.dict(), sort_keys=True),
        json.dumps(thresholds.dict(), sort_keys=True),
    )


def get_all_enriched(db: Session) -> List[Dict[str, Any]]:
    """
    Returns the enriched dicts for every student in the database.
    Callers MUST treat the returned list as read-only (copy before sorting /
    mutating), because it may come from the shared cache.
    """
    signature = get_dataset_signature(db)
    if _enriched_cache["signature"] == signature and _enriched_cache["students"] is not None:
        return _enriched_cache["students"]

    students = db.query(Student).all()
    weights, thresholds = get_current_settings(db)
    enriched = [enrich_student(s, weights, thresholds) for s in students]

    _enriched_cache["signature"] = signature
    _enriched_cache["students"] = enriched
    return enriched

def get_current_settings(db: Session):
    # Read custom weights & thresholds if saved in DB
    weights = DEFAULT_WEIGHTS
    thresholds = DEFAULT_THRESHOLDS
    w_row = db.query(SystemSetting).filter(SystemSetting.key == "scoring_weights").first()
    if w_row:
        try:
            weights = ScoringWeights(**json.loads(w_row.value_json))
        except Exception:
            pass
    t_row = db.query(SystemSetting).filter(SystemSetting.key == "risk_thresholds").first()
    if t_row:
        try:
            thresholds = RiskThresholds(**json.loads(t_row.value_json))
        except Exception:
            pass
    return weights, thresholds

def enrich_student(stu: Student, weights: ScoringWeights, thresholds: RiskThresholds) -> Dict[str, Any]:
    s_dict = {
        "id": stu.id,
        "name": stu.name,
        "department": stu.department,
        "year": stu.year,
        "cgpa": stu.cgpa,
        "attendance": stu.attendance,
        "lms_engagement": stu.lms_engagement,
        "coding_score": stu.coding_score,
        "aptitude_score": stu.aptitude_score,
        "mock_interview_score": stu.mock_interview_score,
        "placement_status": stu.placement_status,
        "historical_cgpa_prev": stu.historical_cgpa_prev,
        "faculty_mentor": stu.faculty_mentor,
        "reviewed": stu.reviewed,
        "review_notes": stu.review_notes,
        "intervention_status": stu.intervention_status,
        "intervention_action": stu.intervention_action,
        "last_reviewed_at": stu.last_reviewed_at,
        # Optional future-compatible dimensions (None => rendered as N/A)
        "backlogs": getattr(stu, "backlogs", None),
        "lms_login_frequency": getattr(stu, "lms_login_frequency", None),
        "lms_assignment_completion": getattr(stu, "lms_assignment_completion", None),
        "technical_score": getattr(stu, "technical_score", None),
        "soft_skill_score": getattr(stu, "soft_skill_score", None),
        "placement_outcome": getattr(stu, "placement_outcome", None),
        "certifications": getattr(stu, "certifications", None),
        "extracurricular": getattr(stu, "extracurricular", None),
        "feedback": getattr(stu, "feedback", None),
    }

    score, category, contributions = calculate_success_score(s_dict, weights)
    flags = build_risk_flags(s_dict, score, thresholds)
    risk, reasons, flag_summary = evaluate_flags(flags)
    recommendations = generate_recommendations(s_dict, risk, thresholds)

    s_dict["success_score"] = score
    s_dict["success_category"] = category
    s_dict["risk_level"] = risk
    s_dict["risk_reasons"] = reasons
    s_dict["factor_contributions"] = contributions
    s_dict["recommendations"] = recommendations
    s_dict["risk_flags"] = flags
    s_dict["flag_summary"] = flag_summary

    # Derived placement readiness label (never conflated with outcome)
    readiness_map = {
        "Ready": "Ready",
        "Placed": "Ready",
        "In Progress": "Developing",
        "Needs Training": "Needs Preparation",
    }
    s_dict["placement_readiness"] = readiness_map.get(stu.placement_status, "Unknown")

    return s_dict

@router.get("", response_model=Dict[str, Any])
def list_students(
    search: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    risk_level: Optional[str] = Query(None),
    placement_status: Optional[str] = Query(None),
    intervention_status: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("id"),
    sort_desc: Optional[bool] = Query(False),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    enriched_pool = get_all_enriched(db)

    term = search.strip().lower() if search and search.strip() else ""
    dept = department if department and department != "All" else None
    pstat = placement_status if placement_status and placement_status != "All" else None
    istat = intervention_status if intervention_status and intervention_status != "All" else None
    rlevel = risk_level if risk_level and risk_level != "All" else None

    try:
        enriched = [
            s for s in enriched_pool
            if (not dept or s["department"] == dept)
            and (not year or s["year"] == year)
            and (not pstat or s["placement_status"] == pstat)
            and (not istat or s["intervention_status"] == istat)
            and (not rlevel or s["risk_level"].lower() == rlevel.lower())
            and (not term
                 or term in s["name"].lower()
                 or term in s["id"].lower()
                 or term in (s.get("faculty_mentor") or "").lower())
        ]
    except TypeError:
        enriched = enriched_pool

    # Sorting (copy from the comprehension above; cache list is never mutated)
    reverse = bool(sort_desc)
    if sort_by in ["cgpa", "attendance", "coding_score", "aptitude_score", "success_score", "lms_engagement"]:
        enriched.sort(key=lambda x: x.get(sort_by, 0.0), reverse=reverse)
    elif sort_by in ["name", "id", "department", "placement_status", "risk_level"]:
        enriched.sort(key=lambda x: str(x.get(sort_by, "")), reverse=reverse)
    else:
        enriched.sort(key=lambda x: x["id"], reverse=reverse)

    total_count = len(enriched)
    start = (page - 1) * limit
    paged_items = enriched[start:start + limit]

    return {
        "items": paged_items,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit if limit else 1
    }

@router.get("/{student_id}", response_model=StudentDetail)
def get_student(student_id: str, db: Session = Depends(get_db)):
    stu = db.query(Student).filter(Student.id == student_id).first()
    if not stu:
        raise HTTPException(status_code=404, detail=f"Student '{student_id}' not found.")
    weights, thresholds = get_current_settings(db)
    return enrich_student(stu, weights, thresholds)

@router.patch("/{student_id}/intervention", response_model=StudentDetail)
def update_student_intervention(
    student_id: str,
    payload: InterventionUpdate,
    db: Session = Depends(get_db)
):
    stu = db.query(Student).filter(Student.id == student_id).first()
    if not stu:
        raise HTTPException(status_code=404, detail=f"Student '{student_id}' not found.")

    stu.reviewed = payload.reviewed
    if payload.review_notes is not None:
        stu.review_notes = payload.review_notes
    stu.intervention_status = payload.intervention_status
    if payload.intervention_action is not None:
        stu.intervention_action = payload.intervention_action
    stu.last_reviewed_at = datetime.utcnow()

    db.commit()
    db.refresh(stu)
    invalidate_enriched_cache()
    weights, thresholds = get_current_settings(db)
    return enrich_student(stu, weights, thresholds)

@router.post("/upload")
async def upload_students_file(
    file: UploadFile = File(...),
    replace_existing: bool = Query(False),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    records, errors, warnings = parse_and_validate_file(contents, file.filename)

    if errors and not records:
        return {
            "success": False,
            "filename": file.filename,
            "records_imported": 0,
            "errors": errors,
            "warnings": warnings
        }

    if replace_existing:
        db.query(Student).delete()

    imported_count = 0
    updated_count = 0
    for r in records:
        existing = db.query(Student).filter(Student.id == r["id"]).first()
        if existing:
            for k, v in r.items():
                setattr(existing, k, v)
            updated_count += 1
        else:
            db.add(Student(**r))
            imported_count += 1

    db.commit()
    invalidate_enriched_cache()

    return {
        "success": True,
        "filename": file.filename,
        "records_imported": imported_count,
        "records_updated": updated_count,
        "total_processed": len(records),
        "errors": errors,
        "warnings": warnings
    }

@router.get("/export/csv")
def export_students_csv(
    department: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    enriched_pool = get_all_enriched(db)
    enriched = [
        s for s in enriched_pool
        if (not department or department == "All" or s["department"] == department)
        and (not risk_level or risk_level == "All" or s["risk_level"].lower() == risk_level.lower())
    ]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Student ID", "Full Name", "Department", "Year", "CGPA", "Attendance (%)",
        "LMS Engagement", "Coding Score", "Aptitude Score", "Mock Interview",
        "Placement Status", "Success Score", "Success Category", "Risk Level",
        "Primary Risk Reason", "Review Status", "Intervention Plan"
    ])

    for s in enriched:
        primary_reason = s["risk_reasons"][0] if s["risk_reasons"] else "None"
        writer.writerow([
            s["id"], s["name"], s["department"], s["year"], s["cgpa"], s["attendance"],
            s["lms_engagement"], s["coding_score"], s["aptitude_score"], s["mock_interview_score"],
            s["placement_status"], s["success_score"], s["success_category"], s["risk_level"],
            primary_reason, "Reviewed" if s["reviewed"] else "Pending", s.get("intervention_action") or "None"
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=campus_analytics_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"}
    )
