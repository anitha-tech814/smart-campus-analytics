import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.database import get_db
from app.models import Student, SystemSetting
from app.config import DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS, ScoringWeights, RiskThresholds
from app.services.data_service import seed_database_with_demo_data
from app.api.routes_students import get_current_settings, invalidate_enriched_cache

router = APIRouter(prefix="/api/config", tags=["Configuration"])

@router.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    weights, thresholds = get_current_settings(db)
    return {
        "scoring_weights": weights.dict(),
        "risk_thresholds": thresholds.dict()
    }

@router.post("/settings")
def save_settings(payload: Dict[str, Any], db: Session = Depends(get_db)):
    if "scoring_weights" in payload:
        w_json = json.dumps(payload["scoring_weights"])
        row = db.query(SystemSetting).filter(SystemSetting.key == "scoring_weights").first()
        if not row:
            row = SystemSetting(key="scoring_weights", value_json=w_json)
            db.add(row)
        else:
            row.value_json = w_json

    if "risk_thresholds" in payload:
        t_json = json.dumps(payload["risk_thresholds"])
        row = db.query(SystemSetting).filter(SystemSetting.key == "risk_thresholds").first()
        if not row:
            row = SystemSetting(key="risk_thresholds", value_json=t_json)
            db.add(row)
        else:
            row.value_json = t_json

    db.commit()
    invalidate_enriched_cache()
    return {"success": True, "message": "Settings updated successfully."}

@router.post("/reset-demo")
def reset_to_demo_data(db: Session = Depends(get_db)):
    seeded_count = seed_database_with_demo_data(db, force=True)
    invalidate_enriched_cache()
    return {
        "success": True,
        "message": f"Successfully reset and loaded {seeded_count} realistic synthetic student records.",
        "student_count": seeded_count,
        "is_demo_data": True
    }

@router.delete("/clear-all")
def clear_all_data(db: Session = Depends(get_db)):
    db.query(Student).delete()
    db.commit()
    invalidate_enriched_cache()
    return {
        "success": True,
        "message": "All student records cleared. System is in fresh state.",
        "student_count": 0
    }
