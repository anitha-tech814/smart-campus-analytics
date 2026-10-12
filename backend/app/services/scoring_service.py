from typing import Dict, List, Tuple
from app.config import ScoringWeights

def calculate_success_score(
    student_data: Dict[str, float],
    weights: ScoringWeights
) -> Tuple[float, str, List[Dict]]:
    """
    Computes a transparent weighted Student Success Score (0 to 100).
    Normalizes every dimension safely to a 0-100 scale:
      - CGPA: (cgpa / 10.0) * 100
      - Attendance: clamped between 0 and 100
      - LMS Engagement: clamped between 0 and 100
      - Coding Score: clamped between 0 and 100
      - Aptitude Score: clamped between 0 and 100
      - Mock Interview: clamped between 0 and 100
    Returns:
      (final_score, category, factor_contributions)
    """
    # Safe extraction & normalization
    raw_cgpa = float(student_data.get("cgpa", 0.0))
    norm_cgpa = min(max(raw_cgpa / 10.0 * 100.0, 0.0), 100.0)

    raw_att = float(student_data.get("attendance", 0.0))
    norm_att = min(max(raw_att, 0.0), 100.0)

    raw_lms = float(student_data.get("lms_engagement", 0.0))
    norm_lms = min(max(raw_lms, 0.0), 100.0)

    raw_code = float(student_data.get("coding_score", 0.0))
    norm_code = min(max(raw_code, 0.0), 100.0)

    raw_apt = float(student_data.get("aptitude_score", 0.0))
    norm_apt = min(max(raw_apt, 0.0), 100.0)

    raw_mock = float(student_data.get("mock_interview_score", 0.0))
    norm_mock = min(max(raw_mock, 0.0), 100.0)

    # Normalize weights so they sum to 1.0 even if user provided non-normalized weights
    total_w = (
        weights.cgpa +
        weights.attendance +
        weights.lms_engagement +
        weights.coding_score +
        weights.aptitude_score +
        weights.mock_interview_score
    )
    if total_w <= 0:
        total_w = 1.0

    w_cgpa = weights.cgpa / total_w
    w_att = weights.attendance / total_w
    w_lms = weights.lms_engagement / total_w
    w_code = weights.coding_score / total_w
    w_apt = weights.aptitude_score / total_w
    w_mock = weights.mock_interview_score / total_w

    c_cgpa = norm_cgpa * w_cgpa
    c_att = norm_att * w_att
    c_lms = norm_lms * w_lms
    c_code = norm_code * w_code
    c_apt = norm_apt * w_apt
    c_mock = norm_mock * w_mock

    final_score = round(c_cgpa + c_att + c_lms + c_code + c_apt + c_mock, 1)
    final_score = min(max(final_score, 0.0), 100.0)

    if final_score >= 85.0:
        category = "Outstanding Performance"
    elif final_score >= 70.0:
        category = "Satisfactory / On Track"
    elif final_score >= 55.0:
        category = "Moderate / Needs Focus"
    else:
        category = "At Risk / Intensive Support"

    contributions = [
        {
            "factor": "cgpa",
            "label": "Academic CGPA",
            "raw_value": round(raw_cgpa, 2),
            "normalized_value": round(norm_cgpa, 1),
            "weight": round(w_cgpa, 3),
            "weighted_score": round(c_cgpa, 1),
            "max_possible": round(w_cgpa * 100.0, 1)
        },
        {
            "factor": "attendance",
            "label": "Class Attendance",
            "raw_value": round(raw_att, 1),
            "normalized_value": round(norm_att, 1),
            "weight": round(w_att, 3),
            "weighted_score": round(c_att, 1),
            "max_possible": round(w_att * 100.0, 1)
        },
        {
            "factor": "lms_engagement",
            "label": "LMS Engagement",
            "raw_value": round(raw_lms, 1),
            "normalized_value": round(norm_lms, 1),
            "weight": round(w_lms, 3),
            "weighted_score": round(c_lms, 1),
            "max_possible": round(w_lms * 100.0, 1)
        },
        {
            "factor": "coding_score",
            "label": "Coding Lab & Tech Skills",
            "raw_value": round(raw_code, 1),
            "normalized_value": round(norm_code, 1),
            "weight": round(w_code, 3),
            "weighted_score": round(c_code, 1),
            "max_possible": round(w_code * 100.0, 1)
        },
        {
            "factor": "aptitude_score",
            "label": "Quantitative & Logical Aptitude",
            "raw_value": round(raw_apt, 1),
            "normalized_value": round(norm_apt, 1),
            "weight": round(w_apt, 3),
            "weighted_score": round(c_apt, 1),
            "max_possible": round(w_apt * 100.0, 1)
        },
        {
            "factor": "mock_interview_score",
            "label": "Mock Interview & Communication",
            "raw_value": round(raw_mock, 1),
            "normalized_value": round(norm_mock, 1),
            "weight": round(w_mock, 3),
            "weighted_score": round(c_mock, 1),
            "max_possible": round(w_mock * 100.0, 1)
        }
    ]

    return final_score, category, contributions
