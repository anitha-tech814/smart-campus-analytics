import io
import csv
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Intervention, Student, SystemSetting
from app.schemas import InterventionCreate, InterventionUpdate, InterventionResponse
from app.config import DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS, ScoringWeights, RiskThresholds
from app.services.scoring_service import calculate_success_score
from app.api.routes_students import invalidate_enriched_cache
import json

router = APIRouter(prefix="/api/interventions", tags=["Interventions"])

def get_current_settings(db: Session):
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

@router.get("", response_model=List[InterventionResponse])
def get_interventions(
    student_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    intervention_type: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Intervention)
    if student_id:
        query = query.filter(Intervention.student_id == student_id)
    if status and status != "All":
        query = query.filter(Intervention.status == status)
    if intervention_type and intervention_type != "All":
        query = query.filter(Intervention.intervention_type == intervention_type)
    if department and department != "All":
        query = query.filter(Intervention.department == department)
    
    interventions = query.order_by(Intervention.created_at.desc()).all()
    return interventions

@router.post("", response_model=InterventionResponse, status_code=201)
def create_intervention(payload: InterventionCreate, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail=f"Student {payload.student_id} not found")
    
    weights, _ = get_current_settings(db)
    calc_score, _, _ = calculate_success_score(
        {
            "cgpa": student.cgpa,
            "attendance": student.attendance,
            "coding_score": student.coding_score,
            "aptitude_score": student.aptitude_score,
            "lms_engagement": student.lms_engagement,
            "mock_interview_score": student.mock_interview_score
        },
        weights
    )

    baseline_cgpa = payload.baseline_cgpa if payload.baseline_cgpa is not None else student.cgpa
    baseline_attendance = payload.baseline_attendance if payload.baseline_attendance is not None else student.attendance
    baseline_score = payload.baseline_success_score if payload.baseline_success_score is not None else calc_score

    intervention = Intervention(
        student_id=student.id,
        student_name=student.name,
        department=student.department,
        intervention_type=payload.intervention_type,
        faculty_member=payload.faculty_member or student.faculty_mentor or "Faculty Advisor",
        status=payload.status or "Planned",
        notes=payload.notes,
        follow_up_date=payload.follow_up_date,
        baseline_cgpa=baseline_cgpa,
        baseline_attendance=baseline_attendance,
        baseline_success_score=baseline_score,
        created_at=datetime.utcnow()
    )
    db.add(intervention)

    # Sync student state
    student.reviewed = True
    student.intervention_status = payload.status or "Planned"
    student.intervention_action = f"{payload.intervention_type} ({payload.faculty_member or 'Assigned'})"
    student.last_reviewed_at = datetime.utcnow()

    db.commit()
    invalidate_enriched_cache()
    db.refresh(intervention)
    return intervention

@router.get("/{intervention_id}", response_model=InterventionResponse)
def get_intervention_detail(intervention_id: int, db: Session = Depends(get_db)):
    item = db.query(Intervention).filter(Intervention.id == intervention_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Intervention record not found")
    return item

@router.patch("/{intervention_id}", response_model=InterventionResponse)
def update_intervention(intervention_id: int, payload: InterventionUpdate, db: Session = Depends(get_db)):
    item = db.query(Intervention).filter(Intervention.id == intervention_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Intervention record not found")

    if payload.status is not None:
        item.status = payload.status
    if payload.notes is not None:
        item.notes = payload.notes
    if payload.follow_up_date is not None:
        item.follow_up_date = payload.follow_up_date
    if payload.subsequent_cgpa is not None:
        item.subsequent_cgpa = payload.subsequent_cgpa
    if payload.subsequent_attendance is not None:
        item.subsequent_attendance = payload.subsequent_attendance
    if payload.subsequent_success_score is not None:
        item.subsequent_success_score = payload.subsequent_success_score
    if payload.outcome_summary is not None:
        item.outcome_summary = payload.outcome_summary
    if payload.faculty_member is not None:
        item.faculty_member = payload.faculty_member

    item.updated_at = datetime.utcnow()

    # Also update student table if relevant
    student = db.query(Student).filter(Student.id == item.student_id).first()
    if student and payload.status is not None:
        student.intervention_status = payload.status
        student.last_reviewed_at = datetime.utcnow()

    db.commit()
    invalidate_enriched_cache()
    db.refresh(item)
    return item

@router.delete("/{intervention_id}")
def delete_intervention(intervention_id: int, db: Session = Depends(get_db)):
    item = db.query(Intervention).filter(Intervention.id == intervention_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Intervention record not found")
    
    db.delete(item)
    db.commit()
    return {"message": f"Intervention {intervention_id} deleted successfully"}

@router.get("/export/csv")
def export_interventions_csv(db: Session = Depends(get_db)):
    interventions = db.query(Intervention).order_by(Intervention.created_at.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Intervention ID",
        "Student ID",
        "Student Name",
        "Department",
        "Intervention Type",
        "Faculty Member",
        "Status",
        "Baseline CGPA",
        "Subsequent CGPA",
        "Baseline Attendance (%)",
        "Subsequent Attendance (%)",
        "Baseline Success Score",
        "Subsequent Success Score",
        "Follow-up Date",
        "Notes",
        "Outcome Summary",
        "Created At",
        "Last Updated"
    ])
    
    for row in interventions:
        writer.writerow([
            row.id,
            row.student_id,
            row.student_name,
            row.department,
            row.intervention_type,
            row.faculty_member,
            row.status,
            row.baseline_cgpa if row.baseline_cgpa is not None else "N/A",
            row.subsequent_cgpa if row.subsequent_cgpa is not None else "Pending Follow-up",
            f"{row.baseline_attendance:.1f}" if row.baseline_attendance is not None else "N/A",
            f"{row.subsequent_attendance:.1f}" if row.subsequent_attendance is not None else "Pending Follow-up",
            f"{row.baseline_success_score:.1f}" if row.baseline_success_score is not None else "N/A",
            f"{row.subsequent_success_score:.1f}" if row.subsequent_success_score is not None else "Pending Follow-up",
            row.follow_up_date or "None scheduled",
            row.notes or "",
            row.outcome_summary or "Pending outcome evaluation",
            row.created_at.strftime("%Y-%m-%d %H:%M") if row.created_at else "",
            row.updated_at.strftime("%Y-%m-%d %H:%M") if row.updated_at else ""
        ])
    
    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=interventions_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )
