from typing import Dict, List, Any
from app.config import RiskThresholds

def generate_recommendations(
    student_data: Dict[str, Any],
    risk_level: str,
    thresholds: RiskThresholds
) -> List[Dict[str, str]]:
    """
    Generates explainable, actionable recommendations derived from transparent rules.
    Does NOT make automated high-stakes decisions; provides suggested interventions
    for faculty mentors and placement officers.
    """
    recs: List[Dict[str, str]] = []

    cgpa = float(student_data.get("cgpa", 0.0))
    attendance = float(student_data.get("attendance", 0.0))
    coding = float(student_data.get("coding_score", 0.0))
    aptitude = float(student_data.get("aptitude_score", 0.0))
    mock = float(student_data.get("mock_interview_score", 0.0))
    lms = float(student_data.get("lms_engagement", 0.0))
    historical_cgpa = student_data.get("historical_cgpa_prev")
    year = int(student_data.get("year", 1))

    # 1. Attendance Intervention
    if attendance < thresholds.attendance_critical:
        recs.append({
            "category": "Attendance & Dean Review",
            "trigger": f"Attendance is {attendance:.1f}% (< {thresholds.attendance_critical:.0f}%)",
            "recommended_action": "Schedule immediate parent-guardian counseling and mandate bi-weekly attendance check-ins with Academic Advisor.",
            "suggested_timeline": "Within 3 business days",
            "urgency": "High",
            "assigned_role": "Department Head / Faculty Advisor"
        })
    elif attendance < thresholds.attendance_warning:
        recs.append({
            "category": "Attendance Monitoring",
            "trigger": f"Attendance is {attendance:.1f}% (< {thresholds.attendance_warning:.0f}%)",
            "recommended_action": "Issue formal advisory notice and assign peer note-taker to bridge lecture gaps.",
            "suggested_timeline": "Within 7 business days",
            "urgency": "Medium",
            "assigned_role": "Class Counselor"
        })

    # 2. Academic & Tutoring
    if cgpa < thresholds.cgpa_warning:
        recs.append({
            "category": "Academic Remediation",
            "trigger": f"CGPA is {cgpa:.2f} (< {thresholds.cgpa_warning:.1f})",
            "recommended_action": "Enroll student into subject remedial tutorials and pair with Department Teaching Assistant for problem-solving sessions.",
            "suggested_timeline": "Next academic cycle (5 days)",
            "urgency": "High" if cgpa < thresholds.cgpa_critical else "Medium",
            "assigned_role": "Subject Faculty Lead"
        })

    if historical_cgpa is not None:
        try:
            prev_val = float(historical_cgpa)
            if (prev_val - cgpa) >= thresholds.cgpa_drop_threshold:
                recs.append({
                    "category": "Academic Counseling",
                    "trigger": f"CGPA dropped by {(prev_val - cgpa):.2f} points",
                    "recommended_action": "Conduct diagnostic discussion to uncover extracurricular, wellness, or conceptual roadblocks impacting grades.",
                    "suggested_timeline": "Within 1 week",
                    "urgency": "High",
                    "assigned_role": "Faculty Mentor"
                })
        except (ValueError, TypeError):
            pass

    # 3. Technical & Coding Skills
    if coding < thresholds.coding_warning:
        recs.append({
            "category": "Technical Skill Upgrading",
            "trigger": f"Coding score is {coding:.1f}/100 (< {thresholds.coding_warning:.0f})",
            "recommended_action": "Assign custom 4-week Data Structures & Algorithms milestone plan on campus practice portal with weekly code-lab reviews.",
            "suggested_timeline": "Immediate (Start this week)",
            "urgency": "High" if year >= 3 else "Medium",
            "assigned_role": "Placement Coding Instructor"
        })

    # 4. Aptitude & Reasoning
    if aptitude < thresholds.aptitude_warning:
        recs.append({
            "category": "Aptitude Enhancement",
            "trigger": f"Aptitude score is {aptitude:.1f}/100 (< {thresholds.aptitude_warning:.0f})",
            "recommended_action": "Provide guided module for Quantitative & Logical Reasoning with 15-minute daily speed drills.",
            "suggested_timeline": "Within 10 days",
            "urgency": "Medium",
            "assigned_role": "Career Services Aptitude Trainer"
        })

    # 5. Mock Interview & Soft Skills
    if mock < thresholds.mock_interview_warning:
        recs.append({
            "category": "Interview & Communication",
            "trigger": f"Mock interview score is {mock:.1f}/100 (< {thresholds.mock_interview_warning:.0f})",
            "recommended_action": "Book 1-on-1 video mock interview drill with feedback on resume walkthrough and technical communication.",
            "suggested_timeline": "Within 14 days",
            "urgency": "High" if year >= 3 else "Medium",
            "assigned_role": "Campus Placement Cell"
        })

    # 6. LMS Engagement
    if lms < 40.0:
        recs.append({
            "category": "Digital Courseware Engagement",
            "trigger": f"LMS engagement index is {lms:.1f}/100 (< 40)",
            "recommended_action": "Send automated platform reminder and check if student has accessibility or device constraints.",
            "suggested_timeline": "Within 5 days",
            "urgency": "Low",
            "assigned_role": "LMS Admin Coordinator"
        })

    # 7. Backlogs (when provided)
    backlogs = student_data.get("backlogs")
    if backlogs is not None:
        try:
            bl = int(backlogs)
        except (ValueError, TypeError):
            bl = 0
        if bl >= thresholds.backlogs_high:
            recs.append({
                "category": "Backlog Clearance Plan",
                "trigger": f"{bl} active backlogs (>= {thresholds.backlogs_high})",
                "recommended_action": "Create a semester-wise backlog clearance schedule with subject faculty and mandatory weekly progress reviews.",
                "suggested_timeline": "Within 1 week",
                "urgency": "High",
                "assigned_role": "Subject Faculty / Academic Coordinator"
            })
        elif bl >= thresholds.backlogs_watch:
            recs.append({
                "category": "Subject Support",
                "trigger": f"{bl} active backlog(s) (>= {thresholds.backlogs_watch})",
                "recommended_action": "Assign subject tutoring and a peer study group to clear the pending backlog before the next examination cycle.",
                "suggested_timeline": "Within 10 days",
                "urgency": "Medium",
                "assigned_role": "Subject Faculty Lead"
            })

    # 8. Placement readiness (readiness label, not an outcome)
    placement_status = str(student_data.get("placement_status", "")).strip()
    if placement_status == "Needs Training":
        recs.append({
            "category": "Personalized Placement Preparation",
            "trigger": "Placement readiness = Needs Preparation",
            "recommended_action": "Enroll in a personalised placement track combining coding, aptitude, and mock interview practice tailored to target roles.",
            "suggested_timeline": "Immediate (Start this week)",
            "urgency": "High" if year >= 3 else "Medium",
            "assigned_role": "Campus Placement Cell"
        })
    elif placement_status == "In Progress":
        recs.append({
            "category": "Placement Readiness Support",
            "trigger": "Placement readiness = Developing",
            "recommended_action": "Continue structured skill development with periodic readiness assessments before the next recruitment drive.",
            "suggested_timeline": "Within 3 weeks",
            "urgency": "Low",
            "assigned_role": "Campus Placement Cell"
        })

    # 9. LMS assignment / login frequency (when provided)
    lms_login = student_data.get("lms_login_frequency")
    lms_assignment = student_data.get("lms_assignment_completion")
    if lms_assignment is not None:
        try:
            if float(lms_assignment) < thresholds.lms_assignment_low:
                recs.append({
                    "category": "LMS Assignment Help",
                    "trigger": f"Assignment completion {float(lms_assignment):.1f}% (< {thresholds.lms_assignment_low:.0f}%)",
                    "recommended_action": "Assign a study buddy and schedule weekly assignment checkpoints to recover missing coursework submissions.",
                    "suggested_timeline": "Within 5 days",
                    "urgency": "Medium",
                    "assigned_role": "LMS Admin Coordinator"
                })
        except (ValueError, TypeError):
            pass
    if lms_login is not None:
        try:
            if float(lms_login) < thresholds.lms_login_low:
                recs.append({
                    "category": "Courseware Access Support",
                    "trigger": f"Low LMS login frequency {float(lms_login):.1f} (< {thresholds.lms_login_low:.0f})",
                    "recommended_action": "Confirm the student can access the LMS (device/internet) and set a weekly login and module-review routine.",
                    "suggested_timeline": "Within 5 days",
                    "urgency": "Low",
                    "assigned_role": "LMS Admin Coordinator"
                })
        except (ValueError, TypeError):
            pass

    # 10. Technical & soft skills (when provided)
    technical = student_data.get("technical_score")
    if technical is not None:
        try:
            if float(technical) < thresholds.technical_low:
                recs.append({
                    "category": "Technical Lab Support",
                    "trigger": f"Technical score {float(technical):.1f}/100 (< {thresholds.technical_low:.0f})",
                    "recommended_action": "Schedule supervised lab sessions and hands-on project tasks to build core technical competencies.",
                    "suggested_timeline": "Within 14 days",
                    "urgency": "Medium",
                    "assigned_role": "Lab Instructor"
                })
        except (ValueError, TypeError):
            pass
    soft = student_data.get("soft_skill_score")
    if soft is not None:
        try:
            if float(soft) < thresholds.soft_skill_low:
                recs.append({
                    "category": "Communication & Soft Skills",
                    "trigger": f"Soft skill score {float(soft):.1f}/100 (< {thresholds.soft_skill_low:.0f})",
                    "recommended_action": "Recommend group presentations, communication workshops, and peer interaction activities.",
                    "suggested_timeline": "Within 14 days",
                    "urgency": "Low",
                    "assigned_role": "Student Development Cell"
                })
        except (ValueError, TypeError):
            pass

    # Default if student is performing well
    if not recs:
        recs.append({
            "category": "Excellence & Leadership",
            "trigger": "Strong academic & skill metrics across all dimensions",
            "recommended_action": "Encourage participation in hackathons, research projects, or peer mentoring opportunities.",
            "suggested_timeline": "Ongoing semester plan",
            "urgency": "Low",
            "assigned_role": "Faculty Mentor"
        })

    return recs
