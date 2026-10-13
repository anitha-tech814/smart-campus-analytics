import io
import csv
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.database import get_db
from app.models import Student, SystemSetting
from app.config import DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS, ScoringWeights, RiskThresholds
from app.services.scoring_service import calculate_success_score
from app.services.risk_service import evaluate_student_risk, COUNTED_DIMENSIONS, DIMENSION_META
from app.services.segmentation_service import perform_student_segmentation
from app.services import analytics_service
from app.api.routes_students import get_all_enriched, get_current_settings

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

_LABEL_BY_DIM = dict(DIMENSION_META)

@router.get("/overview")
def get_dashboard_overview(db: Session = Depends(get_db)):
    _, thresholds = get_current_settings(db)
    enriched = get_all_enriched(db)

    if not enriched:
        return {
            "total_students": 0,
            "distinct_departments": 0,
            "distinct_years": 0,
            "average_cgpa": 0.0,
            "average_attendance": 0.0,
            "average_success_score": 0.0,
            "placement_ready_percentage": 0.0,
            "students_requiring_support": 0,
            "unique_flagged_students": 0,
            "risk_distribution": {"Critical": 0, "High": 0, "Medium": 0, "Low": 0, "Minimal": 0},
            "department_stats": [],
            "year_distribution": {1: 0, 2: 0, 3: 0, 4: 0},
            "placement_distribution": {"Placed": 0, "Ready": 0, "In Progress": 0, "Needs Training": 0},
            "placement_outcomes": {"readiness": {}, "outcome": {}, "outcome_tracked": False, "outcome_note": ""},
            "actionable_insights": [],
            "recent_interventions": []
        }

    total_count = len(enriched)

    avg_cgpa = round(sum(s["cgpa"] for s in enriched) / total_count, 2)
    avg_att = round(sum(s["attendance"] for s in enriched) / total_count, 1)
    avg_score = round(sum(s["success_score"] for s in enriched) / total_count, 1)

    # Risk counts
    risk_dist = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0, "Minimal": 0}
    for s in enriched:
        lvl = s["risk_level"]
        risk_dist[lvl] = risk_dist.get(lvl, 0) + 1

    requiring_support = risk_dist["Critical"] + risk_dist["High"] + risk_dist["Medium"]

    # Placement metrics
    placement_dist = {"Placed": 0, "Ready": 0, "In Progress": 0, "Needs Training": 0}
    for s in enriched:
        p = s["placement_status"]
        placement_dist[p] = placement_dist.get(p, 0) + 1

    ready_and_placed = placement_dist["Placed"] + placement_dist["Ready"]
    placement_ready_pct = round((ready_and_placed / total_count) * 100.0, 1)

    # Department breakdown (counts, enrollment %, averages, readiness, risk)
    dept_stats = analytics_service.compute_department_summary(enriched)
    distinct_departments = len(dept_stats)

    # Year distribution (dynamic across all observed years, not just 1-4)
    year_dist: Dict[Any, int] = {}
    for s in enriched:
        y = s.get("year")
        year_dist[y] = year_dist.get(y, 0) + 1
    distinct_years = len(year_dist)

    unique_flagged_students = sum(1 for s in enriched if analytics_service.flagged_dimensions(s))
    placement_outcomes = analytics_service.compute_placement_outcomes(enriched)

    # Actionable insights computed directly from dataset
    insights = []
    # Attendance insight
    low_att_count = sum(1 for s in enriched if s["attendance"] < thresholds.attendance_warning)
    if low_att_count > 0:
        insights.append({
            "type": "warning",
            "title": "Attendance Compliance Alert",
            "message": f"{low_att_count} students ({round(low_att_count/total_count*100, 1)}%) are currently below the {thresholds.attendance_warning:.0f}% attendance benchmark.",
            "action": "Trigger automated attendance reminders to students and class advisors."
        })

    # Placement skills deficit
    coding_deficits = sum(1 for s in enriched if s["coding_score"] < thresholds.coding_warning and s["year"] >= 3)
    if coding_deficits > 0:
        insights.append({
            "type": "info",
            "title": "Senior Placement Coding Readiness Gap",
            "message": f"{coding_deficits} third and fourth year students have coding lab benchmark scores below {thresholds.coding_warning:.0f}/100.",
            "action": "Schedule specialized hands-on Data Structures & Algorithms bootcamps before upcoming campus placement drives."
        })

    # Critical risk review urgency
    if risk_dist["Critical"] > 0:
        insights.append({
            "type": "urgent",
            "title": "Urgent Faculty Mentor Review Required",
            "message": f"{risk_dist['Critical']} students flagged with compounded risk factors (grades and attendance).",
            "action": "Assign mandatory 1-on-1 counseling with Academic Advisors within 3 days."
        })

    # Positive trend
    if placement_dist["Placed"] > 0:
        insights.append({
            "type": "success",
            "title": "Campus Placement Milestones",
            "message": f"{placement_dist['Placed']} final-year students have secured formal corporate placement offers.",
            "action": "Engage placed students as peer mentors for upcoming mock interview prep batches."
        })

    # Recent interventions list
    recent_interventions = [
        {
            "id": s["id"],
            "name": s["name"],
            "department": s["department"],
            "risk_level": s["risk_level"],
            "intervention_status": s["intervention_status"],
            "intervention_action": s.get("intervention_action") or "Counseling",
            "review_notes": s.get("review_notes") or "",
            "last_reviewed_at": s.get("last_reviewed_at")
        }
        for s in enriched if s.get("reviewed")
    ][:6]

    return {
        "total_students": total_count,
        "distinct_departments": distinct_departments,
        "distinct_years": distinct_years,
        "average_cgpa": avg_cgpa,
        "average_attendance": avg_att,
        "average_success_score": avg_score,
        "placement_ready_percentage": placement_ready_pct,
        "students_requiring_support": requiring_support,
        "unique_flagged_students": unique_flagged_students,
        "risk_distribution": risk_dist,
        "department_stats": dept_stats,
        "year_distribution": year_dist,
        "placement_distribution": placement_dist,
        "placement_outcomes": placement_outcomes,
        "actionable_insights": insights,
        "recent_interventions": recent_interventions
    }

@router.get("/segmentation")
def get_segmentation(n_clusters: int = 4, db: Session = Depends(get_db)):
    enriched = get_all_enriched(db)
    if not enriched:
        return {"clusters": [], "total_students": 0}

    clusters, _ = perform_student_segmentation(enriched, n_clusters=min(n_clusters, len(enriched)))

    return {
        "clusters": clusters,
        "total_students": len(enriched),
        "method": "K-Means (Standardized 6-Dimensional Numerical Features)"
    }

@router.get("/summary-report")
def get_summary_report(db: Session = Depends(get_db)):
    enriched = get_all_enriched(db)

    total = len(enriched)
    critical_cases = [s for s in enriched if s["risk_level"] == "Critical"]
    high_cases = [s for s in enriched if s["risk_level"] == "High"]
    
    return {
        "report_title": "Smart Campus Analytics — Institutional Student Success & Risk Assessment Report",
        "generated_at": datetime.utcnow().strftime("%B %d, %Y - %H:%M UTC"),
        "dataset_scope": f"{total} active student records analyzed",
        "is_demo_data": any(s["id"].startswith("STU-2024-") for s in enriched[:5]),
        "total_cohort": total,
        "average_cgpa": round(sum(s["cgpa"] for s in enriched)/total, 2) if total else 0,
        "average_attendance": round(sum(s["attendance"] for s in enriched)/total, 1) if total else 0,
        "average_success_score": round(sum(s["success_score"] for s in enriched)/total, 1) if total else 0,
        "critical_cases_count": len(critical_cases),
        "high_cases_count": len(high_cases),
        "critical_students": [
            {
                "id": s["id"],
                "name": s["name"],
                "department": s["department"],
                "year": s["year"],
                "cgpa": s["cgpa"],
                "attendance": s["attendance"],
                "success_score": s["success_score"],
                "reasons": s["risk_reasons"]
            }
            for s in critical_cases
        ],
    }

@router.get("/data-quality")
def get_data_quality_report(db: Session = Depends(get_db)):
    students = db.query(Student).all()
    total = len(students)
    
    dept_samples: Dict[str, int] = {}
    missing_fields_count = 0
    duplicate_ids_detected = 0
    seen_ids = set()
    hist_count = 0

    for s in students:
        # Check duplicates
        if s.id in seen_ids:
            duplicate_ids_detected += 1
        else:
            seen_ids.add(s.id)

        # Department distribution
        dept_samples[s.department] = dept_samples.get(s.department, 0) + 1

        # Check completeness of core academic telemetry
        if s.historical_cgpa_prev is not None:
            hist_count += 1
        
        # Check for empty or None required attributes
        for field in [s.cgpa, s.attendance, s.lms_engagement, s.coding_score, s.aptitude_score, s.mock_interview_score]:
            if field is None:
                missing_fields_count += 1

    completeness_pct = round(100.0 - ((missing_fields_count / (total * 6) * 100.0) if total > 0 else 0.0), 1)

    # Optional future-compatible dimensions: report availability vs N/A honestly.
    optional_fields = [
        "backlogs", "lms_login_frequency", "lms_assignment_completion",
        "technical_score", "soft_skill_score", "placement_outcome",
        "certifications", "extracurricular", "feedback",
    ]
    optional_coverage = []
    for field in optional_fields:
        present = sum(1 for s in students if getattr(s, field, None) is not None)
        optional_coverage.append({
            "field": field,
            "available_count": present,
            "missing_count": total - present,
            "coverage_pct": round(present / total * 100.0, 1) if total > 0 else 0.0,
        })

    limitations = [
        f"Historical progression is tracked for {hist_count} of {total} students. For records lacking past semesters, only current semester telemetry is evaluated.",
        "LMS engagement and coding scores represent platform activity logs and may vary based on student workstation availability.",
        "Mock interview evaluations reflect subjective assessor ratings and should be corroborated with portfolio projects.",
        "Sample sizes differ across departments; avoid drawing comparative faculty conclusions without normalizing cohort sizes."
    ]

    fairness_statement = (
        "Zero Demographic Bias Guarantee: Success scores and risk flags are calculated purely from objective academic "
        "and skill metrics (CGPA, Attendance, LMS, Coding, Aptitude, Mock Interviews). No demographic, gender, geographic, "
        "or socioeconomic attributes are collected, stored, or weighted. Risk indicators serve strictly as early assistance triggers "
        "for human academic counseling, never as punitive or exclusionary determinants."
    )

    return {
        "total_records": total,
        "missing_fields_count": missing_fields_count,
        "duplicate_ids_detected": duplicate_ids_detected,
        "data_completeness_pct": completeness_pct,
        "department_sample_sizes": dept_samples,
        "historical_telemetry_coverage": {
            "available_count": hist_count,
            "missing_count": total - hist_count,
            "coverage_pct": round((hist_count / total * 100.0), 1) if total > 0 else 0.0
        },
        "optional_field_coverage": optional_coverage,
        "observed_data_limitations": limitations,
        "fairness_statement": fairness_statement,
        "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    }

@router.get("/risk-roster")
def get_risk_roster(db: Session = Depends(get_db)):
    """
    Full-cohort, compact risk roster for the Faculty Early-Warning Center.
    Returns lightweight enriched rows for every active student (not page-limited)
    so tier summaries and longitudinal trend counts reflect the complete dataset.
    """
    enriched = get_all_enriched(db)

    summary = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0, "Minimal": 0}
    declining = 0
    with_history = 0
    dept_set = set()

    items = []
    for s in enriched:
        level = s["risk_level"]
        summary[level] = summary.get(level, 0) + 1
        dept_set.add(s["department"])

        prev = s.get("historical_cgpa_prev")
        if prev is not None:
            with_history += 1
            if s["cgpa"] < prev:
                declining += 1

        items.append({
            "id": s["id"],
            "name": s["name"],
            "department": s["department"],
            "year": s["year"],
            "cgpa": s["cgpa"],
            "attendance": s["attendance"],
            "coding_score": s["coding_score"],
            "success_score": s["success_score"],
            "risk_level": level,
            "risk_reasons": s["risk_reasons"][:3],
            "historical_cgpa_prev": prev,
            "intervention_status": s.get("intervention_status", "Pending Review"),
            "reviewed": bool(s.get("reviewed"))
        })

    return {
        "items": items,
        "total": len(items),
        "summary": summary,
        "declining_count": declining,
        "with_history_count": with_history,
        "departments": sorted(dept_set)
    }

@router.get("/recommendations")
def get_recommendation_playbooks(db: Session = Depends(get_db)):
    """
    Full-cohort prescriptive recommendation aggregation.
    Groups deterministic action playbooks across the entire student population and
    reports workflow tracking counts, so every metric reflects the complete dataset.
    """
    enriched = get_all_enriched(db)

    playbooks_map: Dict[str, Dict[str, Any]] = {}
    for s in enriched:
        for rec in s.get("recommendations", []):
            key = f"{rec['category']}:::{rec['recommended_action']}"
            if key not in playbooks_map:
                playbooks_map[key] = {
                    "category": rec["category"],
                    "trigger": rec["trigger"],
                    "recommended_action": rec["recommended_action"],
                    "suggested_timeline": rec["suggested_timeline"],
                    "urgency": rec["urgency"],
                    "assigned_role": rec["assigned_role"],
                    "impacted_count": 0,
                    "sample_students": []
                }
            pb = playbooks_map[key]
            pb["impacted_count"] += 1
            if len(pb["sample_students"]) < 20:
                pb["sample_students"].append({
                    "id": s["id"],
                    "name": s["name"],
                    "department": s["department"],
                    "risk_level": s["risk_level"]
                })

    playbooks = sorted(
        playbooks_map.values(),
        key=lambda p: ({"High": 0, "Medium": 1, "Low": 2}.get(p["urgency"], 3), -p["impacted_count"])
    )

    pending = sum(1 for s in enriched if s["intervention_status"] == "Pending Review")
    in_progress = sum(
        1 for s in enriched
        if s["intervention_status"] in ("Mentoring Assigned", "Workshop Scheduled")
    )
    resolved = sum(1 for s in enriched if s["intervention_status"] == "Resolved")

    workflow_students = [
        {
            "id": s["id"],
            "name": s["name"],
            "department": s["department"],
            "risk_level": s["risk_level"],
            "intervention_status": s["intervention_status"],
            "faculty_mentor": s.get("faculty_mentor") or "Prof. Unassigned",
            "review_notes": s.get("review_notes") or "",
            "reviewed": bool(s.get("reviewed"))
        }
        for s in sorted(
            enriched,
            key=lambda x: (x.get("last_reviewed_at") is None, x["id"])
        )
    ][:100]

    return {
        "total_students": len(enriched),
        "playbooks": playbooks,
        "workflow": {
            "pending": pending,
            "in_progress": in_progress,
            "resolved": resolved,
            "total": len(enriched)
        },
        "workflow_students": workflow_students
    }


def _counted_dimensions() -> List[str]:
    return list(COUNTED_DIMENSIONS)


def _csv_response(rows: List[Dict[str, Any]], headers: List[str], filename: str) -> Response:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=headers, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    return Response(
        content="\ufeff" + buf.getvalue(),  # BOM for Excel compatibility
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/departments")
def get_department_analytics(db: Session = Depends(get_db)):
    enriched = get_all_enriched(db)
    departments = analytics_service.compute_department_summary(enriched)
    return {
        "total_students": len(enriched),
        "distinct_departments": len(departments),
        "departments": departments,
    }


@router.get("/risk-dimensions")
def get_risk_dimensions(db: Session = Depends(get_db)):
    _, thresholds = get_current_settings(db)
    enriched = get_all_enriched(db)
    return analytics_service.compute_risk_dimensions(enriched, thresholds)


@router.get("/risk-overlap")
def get_risk_overlap(db: Session = Depends(get_db)):
    enriched = get_all_enriched(db)
    dims = _counted_dimensions()
    return analytics_service.compute_overlap(enriched, dims)


@router.get("/department-risk-matrix")
def get_department_risk_matrix(db: Session = Depends(get_db)):
    enriched = get_all_enriched(db)
    dims = _counted_dimensions()
    return analytics_service.compute_department_risk_matrix(enriched, dims)


@router.get("/risk-register")
def get_risk_register(db: Session = Depends(get_db)):
    enriched = get_all_enriched(db)
    rows = analytics_service.build_risk_register(enriched)
    return {
        "total_students": len(rows),
        "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
        "students": rows,
    }


@router.get("/export/departments.csv")
def export_departments_csv(db: Session = Depends(get_db)):
    enriched = get_all_enriched(db)
    rows = analytics_service.compute_department_summary(enriched)
    headers = [
        "department", "student_count", "enrollment_percentage", "avg_cgpa",
        "avg_attendance", "avg_lms", "avg_success_score", "at_risk_students",
        "risk_percentage", "unique_flagged_students", "readiness_ready_percentage",
        "outcome_tracked",
    ]
    return _csv_response(rows, headers, "department_analytics.csv")


@router.get("/export/risk-dimensions.csv")
def export_risk_dimensions_csv(db: Session = Depends(get_db)):
    _, thresholds = get_current_settings(db)
    enriched = get_all_enriched(db)
    data = analytics_service.compute_risk_dimensions(enriched, thresholds)
    rows = [
        {
            "dimension": d["label"],
            "key": d["dimension"],
            "high_count": d["high_count"],
            "watch_count": d["watch_count"],
            "affected_count": d["affected_count"],
            "available_count": d["available_count"],
            "na_count": d["na_count"],
            "affected_pct_of_available": d["affected_percentage_of_available"],
            "affected_pct_of_cohort": d["affected_percentage_of_cohort"],
        }
        for d in data["dimensions"]
    ]
    headers = [
        "dimension", "key", "high_count", "watch_count", "affected_count",
        "available_count", "na_count", "affected_pct_of_available", "affected_pct_of_cohort",
    ]
    return _csv_response(rows, headers, "risk_dimensions.csv")


@router.get("/export/risk-register.csv")
def export_risk_register_csv(db: Session = Depends(get_db)):
    enriched = get_all_enriched(db)
    rows = analytics_service.build_risk_register(enriched)
    headers = [
        "id", "name", "department", "year", "cgpa", "attendance", "lms_engagement",
        "backlogs", "coding_score", "aptitude_score", "mock_interview_score",
        "technical_score", "soft_skill_score", "placement_status", "placement_readiness",
        "placement_outcome", "success_score", "risk_level", "high_dimensions",
        "watch_dimensions", "na_dimensions", "intervention_status", "reviewed", "faculty_mentor",
    ]
    flat = []
    for r in rows:
        row = dict(r)
        row["high_dimensions"] = "; ".join(_LABEL_BY_DIM.get(x, x) for x in r.get("high_dimensions", []))
        row["watch_dimensions"] = "; ".join(_LABEL_BY_DIM.get(x, x) for x in r.get("watch_dimensions", []))
        row["na_dimensions"] = "; ".join(_LABEL_BY_DIM.get(x, x) for x in r.get("na_dimensions", []))
        flat.append(row)
    return _csv_response(flat, headers, "risk_register.csv")


# ---------------------------------------------------------------------------
# Branch-wise Student Risk Analysis.
# "Branch" is the dataset's department column; all figures are computed live
# from the active dataset (nothing is hardcoded).
# ---------------------------------------------------------------------------

@router.get("/branch-risk-overview")
def get_branch_risk_overview(db: Session = Depends(get_db)):
    _, thresholds = get_current_settings(db)
    enriched = get_all_enriched(db)
    return analytics_service.compute_branch_overview(enriched, thresholds)


@router.get("/branch-detail")
def get_branch_detail(
    branch: str = Query(..., description="Branch (department) name"),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    _, thresholds = get_current_settings(db)
    enriched = get_all_enriched(db)
    return analytics_service.compute_branch_detail(branch, enriched, thresholds, year=year)


def _register_response(
    enriched: List[Dict[str, Any]],
    branch: Optional[str],
    year: Optional[int],
    dimension: Optional[str],
    priority: Optional[str],
    search: Optional[str],
    sort_by: str,
    sort_desc: bool,
    page: int,
    limit: int,
    include_flags: bool = True,
) -> Dict[str, Any]:
    filtered = analytics_service.filter_enriched(
        enriched, branch=branch, year=year, dimension=dimension, priority=priority, search=search
    )
    priority_counts = analytics_service.compute_priority_counts(filtered)
    summary = {
        "total": len(filtered),
        "unique_students": len({s.get("id") for s in filtered}),
        "priority_counts": priority_counts,
        "at_risk_students": priority_counts["Critical"] + priority_counts["High"] + priority_counts["Medium"],
        "unique_flagged_students": sum(1 for s in filtered if analytics_service.flagged_dimensions(s)),
    }
    rows = analytics_service.build_register_rows(filtered, include_flags=include_flags)
    rows = analytics_service.sort_register_rows(rows, sort_by, sort_desc)
    total_count = len(rows)
    start = max(0, (page - 1) * limit)
    paged = rows[start:start + limit]
    return {
        "items": paged,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit if limit else 1,
        "summary": summary,
        "filter_options": {
            "branches": analytics_service.branch_names(enriched),
            "years": analytics_service.observe_years(enriched),
            "dimensions": [
                {"dimension": dim, "label": _LABEL_BY_DIM.get(dim, dim)}
                for dim in _counted_dimensions()
            ],
            "priorities": ["Critical", "High", "Medium", "Low", "Minimal"],
        },
    }


@router.get("/at-risk-register")
def get_at_risk_register(
    branch: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    dimension: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("risk_level"),
    sort_desc: bool = Query(False),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    enriched = get_all_enriched(db)
    return _register_response(
        enriched, branch, year, dimension, priority, search,
        sort_by, sort_desc, page, limit, include_flags=True,
    )


@router.get("/export/branch-summaries.csv")
def export_branch_summaries_csv(db: Session = Depends(get_db)):
    enriched = get_all_enriched(db)
    rows = analytics_service.branch_export_rows(enriched)
    headers = [
        "branch", "total_students", "unique_at_risk_students", "at_risk_students",
        "risk_percentage", "unique_at_risk_percentage", "critical_count", "high_count",
        "medium_count", "low_count", "minimal_count", "avg_cgpa", "avg_attendance",
        "avg_success_score", "readiness_ready_percentage",
    ]
    return _csv_response(rows, headers, "branch_risk_summaries.csv")


@router.get("/export/at-risk-register.csv")
def export_at_risk_register_csv(
    branch: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    dimension: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("risk_level"),
    sort_desc: bool = Query(False),
    db: Session = Depends(get_db),
):
    enriched = get_all_enriched(db)
    data = _register_response(
        enriched, branch, year, dimension, priority, search,
        sort_by, sort_desc, page=1, limit=10 ** 9, include_flags=True,
    )
    rows = []
    for r in data["items"]:
        row = dict(r)
        row["high_dimensions"] = "; ".join(_LABEL_BY_DIM.get(x, x) for x in r.get("high_dimensions", []))
        row["watch_dimensions"] = "; ".join(_LABEL_BY_DIM.get(x, x) for x in r.get("watch_dimensions", []))
        row["na_dimensions"] = "; ".join(_LABEL_BY_DIM.get(x, x) for x in r.get("na_dimensions", []))
        # Human-readable trigger audit: "Label: value (rule)"
        row["triggering_flags"] = " | ".join(
            f"{f.get('label')}: {f.get('display_value', 'N/A')} [{f.get('threshold', '')}]"
            for f in r.get("triggering_flags", [])
        )
        row["risk_reasons"] = " | ".join(r.get("risk_reasons", []))
        rows.append(row)
    headers = [
        "id", "name", "branch", "year", "cgpa", "attendance", "lms_engagement",
        "lms_login_frequency", "lms_assignment_completion", "backlogs", "coding_score",
        "aptitude_score", "mock_interview_score", "technical_score", "soft_skill_score",
        "placement_status", "placement_readiness", "placement_outcome", "success_score",
        "risk_level", "flagged_count", "high_count", "watch_count", "high_dimensions",
        "watch_dimensions", "na_dimensions", "triggering_flags", "risk_reasons",
        "intervention_status", "reviewed", "faculty_mentor",
    ]
    return _csv_response(rows, headers, "at_risk_register.csv")
