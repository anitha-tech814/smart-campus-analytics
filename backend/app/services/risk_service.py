from typing import Dict, List, Tuple, Optional, Any
from app.config import RiskThresholds

# Ordered catalogue of risk dimensions. Flags are produced for every known
# dimension; when the underlying field is unavailable the flag carries
# severity "na" and is rendered as N/A rather than being invented.
DIMENSION_META = [
    ("academic", "Academic (CGPA)"),
    ("academic_trend", "Academic Trend"),
    ("attendance", "Attendance"),
    ("placement_readiness", "Placement Readiness"),
    ("lms", "LMS Engagement"),
    ("skills_coding", "Coding Skills"),
    ("skills_aptitude", "Aptitude"),
    ("skills_interview", "Mock Interview"),
    ("skills_technical", "Technical Skills"),
    ("skills_soft", "Soft Skills"),
    ("backlogs", "Backlogs"),
    ("engagement", "Engagement (Observed)"),
]

# Dimensions that participate in risk severity counting.
COUNTED_DIMENSIONS = [
    "academic", "academic_trend", "attendance", "placement_readiness",
    "lms", "skills_coding", "skills_aptitude", "skills_interview",
    "skills_technical", "skills_soft", "backlogs",
]

SEVERITY_RANK = {"high": 3, "watch": 2, "satisfactory": 1, "observed": 1, "na": 0}


def _flag(
    dimension: str,
    label: str,
    severity: str,
    available: bool,
    value: Optional[float],
    display_value: str,
    threshold: str,
    reason: str = "",
) -> Dict[str, Any]:
    return {
        "dimension": dimension,
        "label": label,
        "severity": severity,          # high | watch | satisfactory | observed | na
        "available": available,
        "value": value,
        "display_value": display_value,
        "threshold": threshold,
        "reason": reason,
    }


def _numeric(student_data: Dict[str, Any], key: str) -> Optional[float]:
    val = student_data.get(key)
    if val is None:
        return None
    try:
        if isinstance(val, str) and val.strip() == "":
            return None
        return float(val)
    except (ValueError, TypeError):
        return None


def _worse(a: str, b: str) -> str:
    return a if SEVERITY_RANK.get(a, 0) >= SEVERITY_RANK.get(b, 0) else b


def build_risk_flags(
    student_data: Dict[str, Any],
    success_score: float,
    thresholds: RiskThresholds,
) -> List[Dict[str, Any]]:
    """
    Deterministic, explainable multi-dimension flag engine.

    Each flag reports:
      dimension, label, severity, available, value, display_value, threshold, reason
    Severity is one of: high | watch | satisfactory | observed | na.

    ``na`` means the source field was not supplied in the dataset. No metric is
    ever fabricated and no declining trend is claimed without historical data.
    """
    flags: List[Dict[str, Any]] = []

    # 1. Academic (CGPA) -----------------------------------------------------
    cgpa = _numeric(student_data, "cgpa")
    if cgpa is None:
        flags.append(_flag("academic", "Academic (CGPA)", "na", False, None, "N/A",
                           "Concern < 6.00 | Watch < 6.50 | Satisfactory >= 6.50",
                           "CGPA not provided in dataset."))
    else:
        thr = f"Concern < {thresholds.cgpa_support:.2f} | Watch < {thresholds.cgpa_warning:.2f} | Satisfactory >= {thresholds.cgpa_warning:.2f}"
        if cgpa < thresholds.cgpa_support:
            flags.append(_flag("academic", "Academic (CGPA)", "high", True, cgpa, f"{cgpa:.2f} / 10.00", thr,
                               f"Academic concern: CGPA {cgpa:.2f} is below the {thresholds.cgpa_support:.2f}/10.00 support threshold."))
        elif cgpa < thresholds.cgpa_warning:
            flags.append(_flag("academic", "Academic (CGPA)", "watch", True, cgpa, f"{cgpa:.2f} / 10.00", thr,
                               f"Academic watch: CGPA {cgpa:.2f} is below the {thresholds.cgpa_warning:.2f} target."))
        else:
            flags.append(_flag("academic", "Academic (CGPA)", "satisfactory", True, cgpa, f"{cgpa:.2f} / 10.00", thr))

    # 2. Academic Trend (requires historical data) ---------------------------
    prev = _numeric(student_data, "historical_cgpa_prev")
    if cgpa is None or prev is None:
        flags.append(_flag("academic_trend", "Academic Trend", "na", False, None, "N/A",
                           f"Decline >= {thresholds.cgpa_drop_threshold:.2f} pts vs prior term",
                           "No prior-term CGPA available; no trend assumed."))
    else:
        drop = prev - cgpa
        thr = f"Decline >= {thresholds.cgpa_drop_threshold:.2f} pts vs prior term"
        if drop >= thresholds.cgpa_drop_threshold:
            flags.append(_flag("academic_trend", "Academic Trend", "high", True, round(drop, 2),
                               f"-{drop:.2f} pts (from {prev:.2f})", thr,
                               f"Significant downward trajectory: CGPA dropped {drop:.2f} points (from {prev:.2f} to {cgpa:.2f})."))
        elif drop >= 0.5:
            flags.append(_flag("academic_trend", "Academic Trend", "watch", True, round(drop, 2),
                               f"-{drop:.2f} pts (from {prev:.2f})", thr,
                               f"Moderate academic decline: CGPA slipped {drop:.2f} points compared to prior term."))
        else:
            flags.append(_flag("academic_trend", "Academic Trend", "satisfactory", True, round(drop, 2),
                               f"{'+' if drop < 0 else '-'}{abs(drop):.2f} pts (from {prev:.2f})", thr))

    # 3. Attendance ----------------------------------------------------------
    att = _numeric(student_data, "attendance")
    if att is None:
        flags.append(_flag("attendance", "Attendance", "na", False, None, "N/A",
                           f"Concern < {thresholds.attendance_warning:.0f}% | Watch {thresholds.attendance_warning:.0f}-{thresholds.attendance_watch:.0f}% | Satisfactory >= {thresholds.attendance_watch:.0f}%",
                           "Attendance not provided in dataset."))
    else:
        thr = f"Concern < {thresholds.attendance_warning:.0f}% | Watch {thresholds.attendance_warning:.0f}-{thresholds.attendance_watch:.0f}% | Satisfactory >= {thresholds.attendance_watch:.0f}%"
        if att < thresholds.attendance_warning:
            flags.append(_flag("attendance", "Attendance", "high", True, att, f"{att:.1f}%", thr,
                               f"Severe attendance deficit: {att:.1f}% is below the {thresholds.attendance_warning:.0f}% mandatory benchmark."))
        elif att < thresholds.attendance_watch:
            flags.append(_flag("attendance", "Attendance", "watch", True, att, f"{att:.1f}%", thr,
                               f"Attendance watch: {att:.1f}% is within the {thresholds.attendance_warning:.0f}-{thresholds.attendance_watch:.0f}% caution band."))
        else:
            flags.append(_flag("attendance", "Attendance", "satisfactory", True, att, f"{att:.1f}%", thr))

    # 4. Placement Readiness (label, NOT an outcome) -------------------------
    status = (student_data.get("placement_status") or "").strip()
    readiness_map = {
        "Ready": ("Ready", "satisfactory"),
        "Placed": ("Ready", "satisfactory"),
        "In Progress": ("Developing", "watch"),
        "Needs Training": ("Needs Preparation", "high"),
    }
    thr = "Ready = satisfactory | Developing = watch | Needs Preparation = concern"
    if status in readiness_map:
        readiness, sev = readiness_map[status]
        reason = ""
        if sev == "high":
            reason = "Placement readiness is 'Needs Preparation'; targeted skill building recommended."
        elif sev == "watch":
            reason = "Placement readiness is 'Developing'; candidate is still building required skills."
        flags.append(_flag("placement_readiness", "Placement Readiness", sev, True, None,
                           f"{readiness} (from '{status}')", thr, reason))
    else:
        flags.append(_flag("placement_readiness", "Placement Readiness", "na", False, None, "N/A", thr,
                           "Placement readiness status not provided."))

    # 5. LMS Engagement (aggregates available sub-signals) -------------------
    lms_engagement = _numeric(student_data, "lms_engagement")
    lms_login = _numeric(student_data, "lms_login_frequency")
    lms_assignment = _numeric(student_data, "lms_assignment_completion")
    if lms_engagement is None and lms_login is None and lms_assignment is None:
        flags.append(_flag("lms", "LMS Engagement", "na", False, None, "N/A",
                           f"Engagement < {thresholds.lms_engagement_low:.0f} | Logins < {thresholds.lms_login_low:.0f} | Assignments < {thresholds.lms_assignment_low:.0f}%",
                           "No LMS engagement, login, or assignment data available."))
    else:
        lms_thr = (f"Engagement < {thresholds.lms_engagement_low:.0f} | "
                   f"Logins < {thresholds.lms_login_low:.0f} | Assignments < {thresholds.lms_assignment_low:.0f}%")
        sev = "satisfactory"
        reasons: List[str] = []
        parts: List[str] = []
        if lms_engagement is not None:
            parts.append(f"Engagement {lms_engagement:.1f}/100")
            if lms_engagement < thresholds.lms_engagement_low:
                sev = _worse(sev, "high")
                reasons.append(f"LMS inactivity: engagement index {lms_engagement:.1f}/100 below {thresholds.lms_engagement_low:.0f}.")
            elif lms_engagement < thresholds.lms_engagement_watch:
                sev = _worse(sev, "watch")
        if lms_login is not None:
            parts.append(f"Logins {lms_login:.1f}/100")
            if lms_login < thresholds.lms_login_low:
                sev = _worse(sev, "high")
                reasons.append(f"Low LMS login frequency: {lms_login:.1f}/100 below {thresholds.lms_login_low:.0f}.")
        if lms_assignment is not None:
            parts.append(f"Assignments {lms_assignment:.1f}%")
            if lms_assignment < thresholds.lms_assignment_low:
                sev = _worse(sev, "high")
                reasons.append(f"Low assignment completion: {lms_assignment:.1f}% below {thresholds.lms_assignment_low:.0f}%.")
        flags.append(_flag("lms", "LMS Engagement", sev, True,
                           lms_engagement if lms_engagement is not None else lms_login,
                           " | ".join(parts), lms_thr, " ".join(reasons)))

    # 6-8. Placement skill dimensions ----------------------------------------
    def skill_flag(dim: str, label: str, raw: Optional[float], high_thr: float, watch_thr: float, unit: str = "/100"):
        if raw is None:
            flags.append(_flag(dim, label, "na", False, None, "N/A",
                               f"Concern < {high_thr:.0f}{unit} | Watch < {watch_thr:.0f}{unit}",
                               f"{label} not provided in dataset."))
        elif raw < high_thr:
            flags.append(_flag(dim, label, "high", True, raw, f"{raw:.1f}{unit}",
                               f"Concern < {high_thr:.0f}{unit} | Watch < {watch_thr:.0f}{unit}",
                               f"{label} deficit: {raw:.1f}{unit} is below the {high_thr:.0f}{unit} benchmark."))
        elif raw < watch_thr:
            flags.append(_flag(dim, label, "watch", True, raw, f"{raw:.1f}{unit}",
                               f"Concern < {high_thr:.0f}{unit} | Watch < {watch_thr:.0f}{unit}",
                               f"{label} watch: {raw:.1f}{unit} is below the {watch_thr:.0f}{unit} target."))
        else:
            flags.append(_flag(dim, label, "satisfactory", True, raw, f"{raw:.1f}{unit}",
                               f"Concern < {high_thr:.0f}{unit} | Watch < {watch_thr:.0f}{unit}"))

    skill_flag("skills_coding", "Coding Skills", _numeric(student_data, "coding_score"),
               thresholds.coding_warning, thresholds.coding_watch)
    skill_flag("skills_aptitude", "Aptitude", _numeric(student_data, "aptitude_score"),
               thresholds.aptitude_warning, thresholds.aptitude_watch)
    skill_flag("skills_interview", "Mock Interview", _numeric(student_data, "mock_interview_score"),
               thresholds.mock_interview_warning, thresholds.mock_interview_watch)
    skill_flag("skills_technical", "Technical Skills", _numeric(student_data, "technical_score"),
               thresholds.technical_low, thresholds.technical_low + 15.0)
    skill_flag("skills_soft", "Soft Skills", _numeric(student_data, "soft_skill_score"),
               thresholds.soft_skill_low, thresholds.soft_skill_low + 15.0)

    # 9. Backlogs ------------------------------------------------------------
    backlogs = _numeric(student_data, "backlogs")
    if backlogs is None:
        flags.append(_flag("backlogs", "Backlogs", "na", False, None, "N/A",
                           f"Multiple >= {thresholds.backlogs_high} | Any >= {thresholds.backlogs_watch}",
                           "Backlog data not available."))
    else:
        bl_int = int(round(backlogs))
        thr = f"Multiple >= {thresholds.backlogs_high} | Any >= {thresholds.backlogs_watch}"
        if bl_int >= thresholds.backlogs_high:
            flags.append(_flag("backlogs", "Backlogs", "high", True, bl_int, f"{bl_int}", thr,
                               f"Multiple backlogs ({bl_int}) exceed the {thresholds.backlogs_high} threshold."))
        elif bl_int >= thresholds.backlogs_watch:
            flags.append(_flag("backlogs", "Backlogs", "watch", True, bl_int, f"{bl_int}", thr,
                               f"{bl_int} active backlog(s) at the {thresholds.backlogs_watch} threshold."))
        else:
            flags.append(_flag("backlogs", "Backlogs", "satisfactory", True, bl_int, "0", thr))

    # 10. Engagement observed indicators (never a confirmed risk) ------------
    certs = _numeric(student_data, "certifications")
    extra = _numeric(student_data, "extracurricular")
    feedback = _numeric(student_data, "feedback")
    eng_parts = []
    if certs is not None:
        eng_parts.append(f"Certifications {int(round(certs))}")
    if extra is not None:
        eng_parts.append(f"Extracurricular {extra:.1f}/100")
    if feedback is not None:
        eng_parts.append(f"Feedback {feedback:.1f}/100")
    if eng_parts:
        flags.append(_flag("engagement", "Engagement (Observed)", "observed", True, extra,
                           " | ".join(eng_parts),
                           "Observed indicators only; not used to classify risk.",
                           "Extracurricular, certification, and feedback signals are informational and do not raise risk flags."))
    else:
        flags.append(_flag("engagement", "Engagement (Observed)", "na", False, None, "N/A",
                           "Observed indicators only; not used to classify risk.",
                           "Extracurricular, certification, and feedback data not available."))

    # 11. Placement outcome (separate from readiness; genuine outcomes only) --
    outcome = (student_data.get("placement_outcome") or "").strip()
    if outcome:
        flags.append(_flag("placement_outcome", "Placement Outcome", "observed", True, None,
                           outcome, "Reported only when a genuine outcome status exists.",
                           f"Recorded placement outcome: {outcome}."))
    else:
        flags.append(_flag("placement_outcome", "Placement Outcome", "na", False, None, "N/A",
                           "Reported only when a genuine outcome status exists.",
                           "Placement outcome not tracked in this dataset."))

    return flags


def summarize_flags(flags: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Aggregate counts for a single student's flags."""
    high = [f for f in flags if f["severity"] == "high"]
    watch = [f for f in flags if f["severity"] == "watch"]
    na_dims = [f["dimension"] for f in flags if f["severity"] == "na"]
    return {
        "high_count": len(high),
        "watch_count": len(watch),
        "flagged_count": len(high) + len(watch),
        "high_dimensions": [f["dimension"] for f in high],
        "watch_dimensions": [f["dimension"] for f in watch],
        "na_dimensions": na_dims,
    }


def _risk_level_from_counts(high_count: int, watch_count: int) -> str:
    if high_count >= 2:
        return "Critical"
    if high_count == 1:
        return "High"
    if watch_count >= 2:
        return "Medium"
    if watch_count == 1:
        return "Low"
    return "Minimal"


def evaluate_flags(
    flags: List[Dict[str, Any]],
) -> Tuple[str, List[str], Dict[str, Any]]:
    """
    Derive (risk_level, reasons, summary) from an already-built flag list.

    Lets callers build flags exactly once and reuse the result for the roster,
    register, and dashboard, keeping every surface mutually consistent.
    """
    summary = summarize_flags(flags)
    risk_level = _risk_level_from_counts(summary["high_count"], summary["watch_count"])

    reasons = [f["reason"] for f in flags
               if f["severity"] in ("high", "watch") and f.get("reason")]
    if not reasons:
        reasons.append("Academic, attendance, engagement, and skills parameters meet institution standards.")

    return risk_level, reasons, summary


def evaluate_student_risk(
    student_data: Dict[str, Any],
    success_score: float,
    thresholds: RiskThresholds,
) -> Tuple[str, List[str]]:
    """
    Backward-compatible wrapper returning (risk_level, reasons).
    The risk level is derived purely from the structured flag engine so that the
    student list, risk register, and dashboard remain mutually consistent.
    Flags support human review and are not predictions of failure.
    """
    flags = build_risk_flags(student_data, success_score, thresholds)
    risk_level, reasons, _ = evaluate_flags(flags)
    return risk_level, reasons


def describe_thresholds(thresholds: RiskThresholds) -> List[Dict[str, Any]]:
    """Human-readable threshold catalogue for reports and the UI."""
    return [
        {"dimension": "academic", "label": "Academic (CGPA)",
         "rule": f"Concern < {thresholds.cgpa_support:.2f} | Watch < {thresholds.cgpa_warning:.2f} | Satisfactory >= {thresholds.cgpa_warning:.2f}"},
        {"dimension": "academic_trend", "label": "Academic Trend",
         "rule": f"Decline >= {thresholds.cgpa_drop_threshold:.2f} pts vs prior term"},
        {"dimension": "attendance", "label": "Attendance",
         "rule": f"Concern < {thresholds.attendance_warning:.0f}% | Watch {thresholds.attendance_warning:.0f}-{thresholds.attendance_watch:.0f}% | Satisfactory >= {thresholds.attendance_watch:.0f}%"},
        {"dimension": "placement_readiness", "label": "Placement Readiness",
         "rule": "Ready = satisfactory | Developing = watch | Needs Preparation = concern"},
        {"dimension": "lms", "label": "LMS Engagement",
         "rule": f"Engagement < {thresholds.lms_engagement_low:.0f} | Logins < {thresholds.lms_login_low:.0f} | Assignments < {thresholds.lms_assignment_low:.0f}%"},
        {"dimension": "skills_coding", "label": "Coding Skills",
         "rule": f"Concern < {thresholds.coding_warning:.0f} | Watch < {thresholds.coding_watch:.0f}"},
        {"dimension": "skills_aptitude", "label": "Aptitude",
         "rule": f"Concern < {thresholds.aptitude_warning:.0f} | Watch < {thresholds.aptitude_watch:.0f}"},
        {"dimension": "skills_interview", "label": "Mock Interview",
         "rule": f"Concern < {thresholds.mock_interview_warning:.0f} | Watch < {thresholds.mock_interview_watch:.0f}"},
        {"dimension": "skills_technical", "label": "Technical Skills",
         "rule": f"Concern < {thresholds.technical_low:.0f}"},
        {"dimension": "skills_soft", "label": "Soft Skills",
         "rule": f"Concern < {thresholds.soft_skill_low:.0f}"},
        {"dimension": "backlogs", "label": "Backlogs",
         "rule": f"Multiple >= {thresholds.backlogs_high} | Any >= {thresholds.backlogs_watch}"},
    ]
