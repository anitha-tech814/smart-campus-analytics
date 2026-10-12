"""
Pure aggregation helpers for department, dimension, overlap, and matrix analytics.

All functions consume the already-enriched student dicts produced by
``routes_students.enrich_student`` (which include ``risk_flags`` and
``flag_summary``). Every percentage is accompanied by an explicit denominator so
KPIs, charts, and tables stay consistent and auditable.
"""
from typing import Dict, List, Any
from app.config import RiskThresholds
from app.services.risk_service import describe_thresholds, COUNTED_DIMENSIONS, DIMENSION_META

_LABEL_BY_DIM = dict(DIMENSION_META)
_RISK_TIERS = ["Critical", "High", "Medium", "Low", "Minimal"]


def flagged_dimensions(student: Dict[str, Any]) -> set:
    summary = student.get("flag_summary") or {}
    return set(summary.get("high_dimensions", [])) | set(summary.get("watch_dimensions", []))


def _mean(values: List[float]) -> float:
    vals = [v for v in values if v is not None]
    return round(sum(vals) / len(vals), 2) if vals else 0.0


def compute_department_summary(enriched: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    total = len(enriched)
    buckets: Dict[str, Dict[str, Any]] = {}

    for s in enriched:
        d = s.get("department") or "Unspecified"
        b = buckets.setdefault(d, {
            "department": d, "count": 0,
            "_cgpa": [], "_att": [], "_lms": [], "_score": [],
            "risk": {t: 0 for t in _RISK_TIERS},
            "readiness": {"Ready": 0, "Developing": 0, "Needs Preparation": 0, "Unknown": 0},
            "outcome": {"Placed": 0, "Not Placed": 0, "Pending": 0, "Unknown": 0},
            "unique_flagged": 0,
            "years": set(),
        })
        b["count"] += 1
        if s.get("cgpa") is not None:
            b["_cgpa"].append(s["cgpa"])
        if s.get("attendance") is not None:
            b["_att"].append(s["attendance"])
        if s.get("lms_engagement") is not None:
            b["_lms"].append(s["lms_engagement"])
        if s.get("success_score") is not None:
            b["_score"].append(s["success_score"])

        b["risk"][s.get("risk_level", "Minimal")] = b["risk"].get(s.get("risk_level", "Minimal"), 0) + 1
        readiness = s.get("placement_readiness", "Unknown")
        b["readiness"][readiness] = b["readiness"].get(readiness, 0) + 1

        outcome = (s.get("placement_outcome") or "Unknown")
        if outcome in ("Placed", "Not Placed", "Pending"):
            b["outcome"][outcome] += 1
        else:
            b["outcome"]["Unknown"] += 1

        if flagged_dimensions(s):
            b["unique_flagged"] += 1
        if s.get("year") is not None:
            b["years"].add(s["year"])

    summary = []
    for d, b in buckets.items():
        count = b["count"]
        at_risk = b["risk"]["Critical"] + b["risk"]["High"] + b["risk"]["Medium"]
        summary.append({
            "department": d,
            "student_count": count,
            "enrollment_percentage": round(count / total * 100.0, 1) if total else 0.0,
            "avg_cgpa": _mean(b["_cgpa"]),
            "avg_attendance": round(_mean(b["_att"]), 1),
            "avg_lms": round(_mean(b["_lms"]), 1),
            "avg_success_score": round(_mean(b["_score"]), 1),
            "years_covered": sorted(b["years"]),
            "risk_distribution": b["risk"],
            "critical_count": b["risk"]["Critical"],
            "high_count": b["risk"]["High"],
            "medium_count": b["risk"]["Medium"],
            "low_count": b["risk"]["Low"],
            "minimal_count": b["risk"]["Minimal"],
            "at_risk_students": at_risk,
            "risk_percentage": round(at_risk / count * 100.0, 1) if count else 0.0,
            "unique_flagged_students": b["unique_flagged"],
            "unique_at_risk_percentage": round(b["unique_flagged"] / count * 100.0, 1) if count else 0.0,
            "readiness_distribution": b["readiness"],
            "readiness_ready_percentage": round(
                (b["readiness"]["Ready"]) / count * 100.0, 1) if count else 0.0,
            "placement_outcome_distribution": b["outcome"],
            "outcome_tracked": (b["outcome"]["Placed"] + b["outcome"]["Not Placed"] + b["outcome"]["Pending"]) > 0,
        })

    summary.sort(key=lambda x: x["student_count"], reverse=True)
    return summary


def compute_risk_dimensions(enriched: List[Dict[str, Any]], thresholds: RiskThresholds) -> Dict[str, Any]:
    total = len(enriched)
    dims: Dict[str, Dict[str, Any]] = {
        dim: {"dimension": dim, "label": _LABEL_BY_DIM.get(dim, dim),
              "high_count": 0, "watch_count": 0, "satisfactory_count": 0,
              "available_count": 0, "na_count": 0,
              "dept_affected": {}, "sample_students": []}
        for dim in COUNTED_DIMENSIONS
    }

    unique_any = 0
    unique_high = 0
    unique_watch_only = 0
    all_na_students = 0

    for s in enriched:
        summary = s.get("flag_summary") or {}
        highs = set(summary.get("high_dimensions", []))
        watches = set(summary.get("watch_dimensions", []))
        if highs or watches:
            unique_any += 1
        if highs:
            unique_high += 1
        elif watches:
            unique_watch_only += 1

        flags = {f["dimension"]: f for f in s.get("risk_flags", [])}
        counted_na = 0
        for dim in COUNTED_DIMENSIONS:
            f = flags.get(dim)
            if not f or f["severity"] == "na":
                dims[dim]["na_count"] += 1
                counted_na += 1
                continue
            dims[dim]["available_count"] += 1
            sev = f["severity"]
            if sev == "high":
                dims[dim]["high_count"] += 1
            elif sev == "watch":
                dims[dim]["watch_count"] += 1
            else:
                dims[dim]["satisfactory_count"] += 1

            if sev in ("high", "watch"):
                dept = s.get("department") or "Unspecified"
                dims[dim]["dept_affected"][dept] = dims[dim]["dept_affected"].get(dept, 0) + 1
                if len(dims[dim]["sample_students"]) < 25:
                    dims[dim]["sample_students"].append({
                        "id": s.get("id"), "name": s.get("name"),
                        "department": dept, "year": s.get("year"),
                        "risk_level": s.get("risk_level"),
                        "value": f.get("display_value"),
                    })
        if counted_na == len(COUNTED_DIMENSIONS):
            all_na_students += 1

    dimensions = []
    for dim in COUNTED_DIMENSIONS:
        d = dims[dim]
        affected = d["high_count"] + d["watch_count"]
        denom = d["available_count"]
        dimensions.append({
            "dimension": dim,
            "label": d["label"],
            "high_count": d["high_count"],
            "watch_count": d["watch_count"],
            "affected_count": affected,
            "satisfactory_count": d["satisfactory_count"],
            "available_count": denom,
            "na_count": d["na_count"],
            "affected_percentage_of_available": round(affected / denom * 100.0, 1) if denom else 0.0,
            "affected_percentage_of_cohort": round(affected / total * 100.0, 1) if total else 0.0,
            "department_breakdown": [
                {"department": dept, "count": cnt}
                for dept, cnt in sorted(d["dept_affected"].items(), key=lambda x: x[1], reverse=True)
            ],
            "sample_students": d["sample_students"],
        })

    return {
        "total_students": total,
        "unique_flagged": unique_any,
        "unique_high": unique_high,
        "unique_watch_only": unique_watch_only,
        "unique_flagged_percentage": round(unique_any / total * 100.0, 1) if total else 0.0,
        "fully_unavailable_students": all_na_students,
        "dimensions": dimensions,
        "thresholds": describe_thresholds(thresholds),
    }


def compute_overlap(enriched: List[Dict[str, Any]], dimensions: List[str]) -> Dict[str, Any]:
    total = len(enriched)
    # Diagonal = students flagged in that dimension.
    matrix = {a: {b: 0 for b in dimensions} for a in dimensions}
    unique_counts = {d: 0 for d in dimensions}

    for s in enriched:
        flagged = flagged_dimensions(s)
        active = [d for d in dimensions if d in flagged]
        for d in active:
            unique_counts[d] += 1
        for i, a in enumerate(active):
            for b in active:
                matrix[a][b] += 1

    union = 0
    for s in enriched:
        if flagged_dimensions(s):
            union += 1

    return {
        "dimensions": dimensions,
        "labels": {d: _LABEL_BY_DIM.get(d, d) for d in dimensions},
        "matrix": matrix,
        "unique_counts": unique_counts,
        "unique_flagged": union,
        "total_students": total,
    }


def compute_department_risk_matrix(enriched: List[Dict[str, Any]], dimensions: List[str]) -> Dict[str, Any]:
    dept_totals: Dict[str, int] = {}
    cells: Dict[str, Dict[str, int]] = {}

    for s in enriched:
        dept = s.get("department") or "Unspecified"
        dept_totals[dept] = dept_totals.get(dept, 0) + 1
        cell = cells.setdefault(dept, {d: 0 for d in dimensions})
        flagged = flagged_dimensions(s)
        for d in dimensions:
            if d in flagged:
                cell[d] += 1

    out_cells = []
    for dept, counts in cells.items():
        denom = dept_totals[dept]
        out_cells.append({
            "department": dept,
            "denominator": denom,
            "dimensions": {
                d: {
                    "count": counts[d],
                    "percentage": round(counts[d] / denom * 100.0, 1) if denom else 0.0,
                }
                for d in dimensions
            },
        })
    out_cells.sort(key=lambda x: x["denominator"], reverse=True)

    return {
        "dimensions": dimensions,
        "labels": {d: _LABEL_BY_DIM.get(d, d) for d in dimensions},
        "departments": [c["department"] for c in out_cells],
        "cells": out_cells,
    }


def compute_placement_outcomes(enriched: List[Dict[str, Any]]) -> Dict[str, Any]:
    readiness = {"Ready": 0, "Developing": 0, "Needs Preparation": 0, "Unknown": 0}
    outcome = {"Placed": 0, "Not Placed": 0, "Pending": 0, "Unknown": 0}
    for s in enriched:
        r = s.get("placement_readiness", "Unknown")
        readiness[r] = readiness.get(r, 0) + 1
        o = s.get("placement_outcome")
        if o in ("Placed", "Not Placed", "Pending"):
            outcome[o] += 1
        else:
            outcome["Unknown"] += 1
    tracked = outcome["Placed"] + outcome["Not Placed"] + outcome["Pending"]
    return {
        "readiness": readiness,
        "outcome": outcome,
        "outcome_tracked": tracked > 0,
        "outcome_note": (
            "Placement outcomes recorded from genuine statuses."
            if tracked > 0 else
            "No placement outcome column found in this dataset; only readiness labels are reported."
        ),
    }


def build_risk_register(enriched: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    register = []
    for s in enriched:
        summary = s.get("flag_summary") or {}
        register.append({
            "id": s.get("id"),
            "name": s.get("name"),
            "department": s.get("department"),
            "year": s.get("year"),
            "cgpa": s.get("cgpa"),
            "attendance": s.get("attendance"),
            "lms_engagement": s.get("lms_engagement"),
            "backlogs": s.get("backlogs"),
            "coding_score": s.get("coding_score"),
            "aptitude_score": s.get("aptitude_score"),
            "mock_interview_score": s.get("mock_interview_score"),
            "technical_score": s.get("technical_score"),
            "soft_skill_score": s.get("soft_skill_score"),
            "placement_status": s.get("placement_status"),
            "placement_readiness": s.get("placement_readiness"),
            "placement_outcome": s.get("placement_outcome"),
            "success_score": s.get("success_score"),
            "risk_level": s.get("risk_level"),
            "risk_reasons": s.get("risk_reasons", []),
            "high_dimensions": summary.get("high_dimensions", []),
            "watch_dimensions": summary.get("watch_dimensions", []),
            "na_dimensions": summary.get("na_dimensions", []),
            "high_count": summary.get("high_count", 0),
            "watch_count": summary.get("watch_count", 0),
            "flagged_count": summary.get("flagged_count", 0),
            "intervention_status": s.get("intervention_status", "Pending Review"),
            "reviewed": bool(s.get("reviewed")),
            "faculty_mentor": s.get("faculty_mentor"),
            "recommendations": s.get("recommendations", []),
        })
    return register


# ---------------------------------------------------------------------------
# Branch-wise ("branch" == the dataset's department column) analytics.
# Nothing here hardcodes branch names, counts, or thresholds: every figure is
# derived from the active enriched dataset.
# ---------------------------------------------------------------------------

_TIER_RANK = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3, "Minimal": 4}


def branch_names(enriched: List[Dict[str, Any]]) -> List[str]:
    """Distinct branch (department) names present in the active dataset."""
    return sorted({(s.get("department") or "Unspecified") for s in enriched})


def observe_years(enriched: List[Dict[str, Any]]) -> List[int]:
    """Distinct academic years present in the active dataset."""
    return sorted({s.get("year") for s in enriched if s.get("year") is not None})


def filter_enriched(
    enriched: List[Dict[str, Any]],
    branch: str = None,
    year: int = None,
    dimension: str = None,
    priority: str = None,
    search: str = None,
) -> List[Dict[str, Any]]:
    """
    Single source of truth for the global filter semantics used by the
    branch overview, drill-down, register, and CSV exports so every surface
    reports identical, mutually-consistent counts.

    ``dimension`` matches students flagged (high or watch) in that dimension.
    ``priority`` matches the derived risk tier exactly.
    """
    term = search.strip().lower() if search and search.strip() else ""
    has_branch = bool(branch) and branch != "All"
    has_priority = bool(priority) and priority != "All"
    has_dimension = bool(dimension) and dimension != "All"

    out = []
    for s in enriched:
        if has_branch and (s.get("department") or "Unspecified") != branch:
            continue
        if year is not None and s.get("year") != year:
            continue
        if has_priority and s.get("risk_level") != priority:
            continue
        if has_dimension and dimension not in flagged_dimensions(s):
            continue
        if term:
            name = (s.get("name") or "").lower()
            sid = (s.get("id") or "").lower()
            mentor = (s.get("faculty_mentor") or "").lower()
            if term not in name and term not in sid and term not in mentor:
                continue
        out.append(s)
    return out


def compute_priority_counts(enriched: List[Dict[str, Any]]) -> Dict[str, int]:
    counts = {t: 0 for t in _RISK_TIERS}
    for s in enriched:
        lvl = s.get("risk_level", "Minimal")
        counts[lvl] = counts.get(lvl, 0) + 1
    return counts


def _triggering_flags(student: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Only the high/watch flags that actually raised the student's risk."""
    out = []
    for f in student.get("risk_flags", []):
        if f.get("severity") in ("high", "watch"):
            out.append({
                "dimension": f.get("dimension"),
                "label": f.get("label"),
                "severity": f.get("severity"),
                "value": f.get("value"),
                "display_value": f.get("display_value"),
                "threshold": f.get("threshold"),
                "reason": f.get("reason"),
            })
    return out


def build_register_rows(
    enriched: List[Dict[str, Any]], include_flags: bool = True
) -> List[Dict[str, Any]]:
    """
    Register rows carrying the observed value AND the threshold that triggered
    each flag, so a user can always see *why* a student was flagged.
    """
    rows = []
    for s in enriched:
        summary = s.get("flag_summary") or {}
        row = {
            "id": s.get("id"),
            "name": s.get("name"),
            "department": s.get("department"),
            "branch": s.get("department") or "Unspecified",
            "year": s.get("year"),
            "cgpa": s.get("cgpa"),
            "attendance": s.get("attendance"),
            "lms_engagement": s.get("lms_engagement"),
            "lms_login_frequency": s.get("lms_login_frequency"),
            "lms_assignment_completion": s.get("lms_assignment_completion"),
            "backlogs": s.get("backlogs"),
            "coding_score": s.get("coding_score"),
            "aptitude_score": s.get("aptitude_score"),
            "mock_interview_score": s.get("mock_interview_score"),
            "technical_score": s.get("technical_score"),
            "soft_skill_score": s.get("soft_skill_score"),
            "placement_status": s.get("placement_status"),
            "placement_readiness": s.get("placement_readiness"),
            "placement_outcome": s.get("placement_outcome"),
            "success_score": s.get("success_score"),
            "risk_level": s.get("risk_level"),
            "risk_reasons": s.get("risk_reasons", []),
            "high_dimensions": summary.get("high_dimensions", []),
            "watch_dimensions": summary.get("watch_dimensions", []),
            "na_dimensions": summary.get("na_dimensions", []),
            "high_count": summary.get("high_count", 0),
            "watch_count": summary.get("watch_count", 0),
            "flagged_count": summary.get("flagged_count", 0),
            "intervention_status": s.get("intervention_status", "Pending Review"),
            "reviewed": bool(s.get("reviewed")),
            "faculty_mentor": s.get("faculty_mentor"),
            "recommendations": s.get("recommendations", []),
        }
        if include_flags:
            row["risk_flags"] = s.get("risk_flags", [])
            row["triggering_flags"] = _triggering_flags(s)
        rows.append(row)
    return rows


_REGISTER_NUMERIC_SORT = {
    "year", "cgpa", "attendance", "lms_engagement", "lms_login_frequency",
    "lms_assignment_completion", "backlogs", "coding_score", "aptitude_score",
    "mock_interview_score", "technical_score", "soft_skill_score",
    "success_score", "high_count", "watch_count", "flagged_count",
}
_REGISTER_TEXT_SORT = {"id", "name", "department", "branch", "risk_level", "placement_status", "placement_readiness"}


def sort_register_rows(rows: List[Dict[str, Any]], sort_by: str, sort_desc: bool) -> List[Dict[str, Any]]:
    """Deterministic, whitelisted sorting for the at-risk register."""
    sort_by = sort_by if sort_by else "risk_level"
    if sort_by == "risk_level":
        return sorted(rows, key=lambda r: (_TIER_RANK.get(r.get("risk_level"), 9), r.get("id", "")),
                      reverse=bool(sort_desc))
    if sort_by == "severity_score":
        return sorted(rows, key=lambda r: (r.get("high_count", 0) * 10 + r.get("watch_count", 0), r.get("id", "")),
                      reverse=not bool(sort_desc))
    if sort_by in _REGISTER_NUMERIC_SORT:
        def key(r):
            v = r.get(sort_by)
            return (v is None, v if v is not None else 0)
        return sorted(rows, key=key, reverse=bool(sort_desc))
    if sort_by in _REGISTER_TEXT_SORT:
        return sorted(rows, key=lambda r: str(r.get(sort_by, "")).lower(), reverse=bool(sort_desc))
    return sorted(rows, key=lambda r: str(r.get("id", "")), reverse=bool(sort_desc))


def compute_branch_detail(
    branch: str,
    enriched_all: List[Dict[str, Any]],
    thresholds: RiskThresholds,
    year: int = None,
) -> Dict[str, Any]:
    """
    Full drill-down for a single branch: priority mix, dimension breakdown
    (count + % using the branch total as denominator), support summary, and a
    short list of the highest-priority at-risk students.
    """
    cohort = filter_enriched(enriched_all, branch=branch, year=year)
    total = len(cohort)

    priority = compute_priority_counts(cohort) if cohort else {t: 0 for t in _RISK_TIERS}
    unique_flagged = sum(1 for s in cohort if flagged_dimensions(s))
    at_risk = priority["Critical"] + priority["High"] + priority["Medium"]

    dims: Dict[str, Dict[str, Any]] = {
        dim: {"dimension": dim, "label": _LABEL_BY_DIM.get(dim, dim),
              "high_count": 0, "watch_count": 0, "satisfactory_count": 0,
              "available_count": 0, "na_count": 0}
        for dim in COUNTED_DIMENSIONS
    }
    for s in cohort:
        flags = {f["dimension"]: f for f in s.get("risk_flags", [])}
        for dim in COUNTED_DIMENSIONS:
            f = flags.get(dim)
            if not f or f["severity"] == "na":
                dims[dim]["na_count"] += 1
                continue
            dims[dim]["available_count"] += 1
            sev = f["severity"]
            if sev == "high":
                dims[dim]["high_count"] += 1
            elif sev == "watch":
                dims[dim]["watch_count"] += 1
            else:
                dims[dim]["satisfactory_count"] += 1

    dimensions = []
    for dim in COUNTED_DIMENSIONS:
        d = dims[dim]
        affected = d["high_count"] + d["watch_count"]
        avail = d["available_count"]
        dimensions.append({
            "dimension": dim,
            "label": d["label"],
            "high_count": d["high_count"],
            "watch_count": d["watch_count"],
            "affected_count": affected,
            "satisfactory_count": d["satisfactory_count"],
            "available_count": avail,
            "na_count": d["na_count"],
            "affected_percentage_of_branch": round(affected / total * 100.0, 1) if total else 0.0,
            "affected_percentage_of_available": round(affected / avail * 100.0, 1) if avail else 0.0,
        })

    most_common = sorted(
        [d for d in dimensions if d["affected_count"] > 0],
        key=lambda d: (-d["affected_count"], d["label"])
    )

    # Branch-level support summary from recommendations of flagged students.
    playbooks: Dict[str, Dict[str, Any]] = {}
    for s in cohort:
        if not flagged_dimensions(s):
            continue
        for rec in s.get("recommendations", []):
            key = f"{rec.get('category')}:::{rec.get('recommended_action')}"
            pb = playbooks.setdefault(key, {
                "category": rec.get("category"),
                "trigger": rec.get("trigger"),
                "recommended_action": rec.get("recommended_action"),
                "suggested_timeline": rec.get("suggested_timeline"),
                "urgency": rec.get("urgency"),
                "assigned_role": rec.get("assigned_role"),
                "impacted_count": 0,
            })
            pb["impacted_count"] += 1
    support_summary = sorted(
        playbooks.values(),
        key=lambda p: ({"High": 0, "Medium": 1, "Low": 2}.get(p.get("urgency"), 3), -p["impacted_count"])
    )

    year_dist: Dict[Any, int] = {}
    for s in cohort:
        y = s.get("year")
        year_dist[y] = year_dist.get(y, 0) + 1

    # Highest-priority at-risk students (register rows without full flag payload).
    at_risk_cohort = sorted(
        [s for s in cohort if flagged_dimensions(s)],
        key=lambda s: (_TIER_RANK.get(s.get("risk_level"), 9),
                       -(s.get("flag_summary", {}).get("high_count", 0))),
    )
    sample_rows = build_register_rows(at_risk_cohort[:25], include_flags=False)

    return {
        "branch": branch,
        "year": year,
        "total_students": total,
        "at_risk_students": at_risk,
        "unique_at_risk_students": unique_flagged,
        "unique_at_risk_percentage": round(unique_flagged / total * 100.0, 1) if total else 0.0,
        "risk_percentage": round(at_risk / total * 100.0, 1) if total else 0.0,
        "priority_counts": priority,
        "risk_distribution": priority,
        "dimensions": dimensions,
        "most_common_dimensions": most_common[:6],
        "support_summary": support_summary,
        "year_distribution": year_dist,
        "sample_students": sample_rows,
        "thresholds": describe_thresholds(thresholds),
    }


def compute_branch_overview(
    enriched: List[Dict[str, Any]], thresholds: RiskThresholds
) -> Dict[str, Any]:
    """
    Branch-level overview: total students, unique students needing support,
    risk %, priority mix, and averages per branch. Reuses the department
    summary so figures never diverge from the Departments view.
    """
    summary = compute_department_summary(enriched)
    branches = []
    for r in summary:
        branches.append({
            "branch": r["department"],
            "department": r["department"],
            "total_students": r["student_count"],
            "student_count": r["student_count"],
            "enrollment_percentage": r["enrollment_percentage"],
            "unique_at_risk_students": r["unique_flagged_students"],
            "at_risk_students": r["at_risk_students"],
            "risk_percentage": r["risk_percentage"],
            "unique_at_risk_percentage": r["unique_at_risk_percentage"],
            "priority_counts": r["risk_distribution"],
            "critical_count": r["critical_count"],
            "high_count": r["high_count"],
            "medium_count": r["medium_count"],
            "low_count": r["low_count"],
            "minimal_count": r["minimal_count"],
            "avg_cgpa": r["avg_cgpa"],
            "avg_attendance": r["avg_attendance"],
            "avg_success_score": r["avg_success_score"],
            "readiness_ready_percentage": r["readiness_ready_percentage"],
            "years_covered": r["years_covered"],
        })

    total = len(enriched)
    unique_flagged = sum(1 for s in enriched if flagged_dimensions(s))
    priority = compute_priority_counts(enriched) if enriched else {t: 0 for t in _RISK_TIERS}
    at_risk = priority["Critical"] + priority["High"] + priority["Medium"]

    return {
        "total_students": total,
        "distinct_branches": len(branches),
        "branches": branches,
        "overall": {
            "unique_at_risk_students": unique_flagged,
            "at_risk_students": at_risk,
            "risk_percentage": round(at_risk / total * 100.0, 1) if total else 0.0,
            "unique_at_risk_percentage": round(unique_flagged / total * 100.0, 1) if total else 0.0,
            "priority_counts": priority,
        },
        "branches_available": branch_names(enriched),
        "years_available": observe_years(enriched),
        "thresholds": describe_thresholds(thresholds),
    }


def branch_export_rows(enriched: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Flat branch summary rows for CSV export (one row per branch)."""
    summary = compute_department_summary(enriched)
    rows = []
    for r in summary:
        rows.append({
            "branch": r["department"],
            "total_students": r["student_count"],
            "unique_at_risk_students": r["unique_flagged_students"],
            "at_risk_students": r["at_risk_students"],
            "risk_percentage": r["risk_percentage"],
            "unique_at_risk_percentage": r["unique_at_risk_percentage"],
            "critical_count": r["critical_count"],
            "high_count": r["high_count"],
            "medium_count": r["medium_count"],
            "low_count": r["low_count"],
            "minimal_count": r["minimal_count"],
            "avg_cgpa": r["avg_cgpa"],
            "avg_attendance": r["avg_attendance"],
            "avg_success_score": r["avg_success_score"],
            "readiness_ready_percentage": r["readiness_ready_percentage"],
        })
    return rows
