import io
import os
import shutil
import random
from datetime import datetime
import pandas as pd
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from app.models import Student, Intervention
from app.config import DEMO_RECORD_COUNT

FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Reyansh", "Muhammad", "Sai", "Ayaan", "Krishna",
    "Ishaan", "Shaurya", "Atharva", "Advik", "Pranav", "Advaith", "Aaryan", "Dhruv", "Kabir", "Ritvik",
    "Ananya", "Diya", "Saanvi", "Aadhya", "Pari", "Kiara", "Myra", "Riya", "Anushka", "Fatima",
    "Sneha", "Pooja", "Priya", "Tanvi", "Meera", "Kavya", "Isha", "Neha", "Divya", "Shreya",
    "Rohan", "Karan", "Nikhil", "Rahul", "Amit", "Suresh", "Gautam", "Harsh", "Yash", "Manish",
    "Omkar", "Tejas", "Varun", "Aniket", "Siddharth", "Kunal", "Jay", "Dev", "Aravind", "Tarun",
    "Swati", "Anjali", "Kriti", "Pallavi", "Nandini", "Lakshmi", "Roshni", "Sakshi", "Charu", "Amrita"
]

LAST_NAMES = [
    "Sharma", "Verma", "Patel", "Reddy", "Nair", "Rao", "Iyer", "Kulkarni", "Deshmukh", "Mehta",
    "Gupta", "Singh", "Kumar", "Chakraborty", "Das", "Joshi", "Bose", "Menon", "Chatterjee", "Mishra",
    "Bhat", "Pillai", "Choudhury", "Malhotra", "Kapoor", "Agarwal", "Shetty", "Gowda", "Naidu", "Sen",
    "Shukla", "Tripathi", "Pandey", "Dubey", "Saxena", "Trivedi", "Desai", "Shah", "Modi", "Solanki",
    "Kaur", "Dhal", "Mahajan", "Bajaj", "Bindra", "Suri", "Mehrotra", "Sethi", "Anand", "Krishnan",
    "Venkatesh", "Murthy", "Raman", "Subramanian", "Iyengar", "Ghosh", "Banerjee", "Mukherjee", "Roy", "Dutta"
]

DEPARTMENTS = [
    "Computer Science",
    "Information Technology",
    "Electronics & Comm",
    "Data Science",
    "Mechanical Engineering"
]

MENTORS = [
    "Dr. Ramesh Raman", "Prof. Sunita Deshpande", "Dr. Arvind Swaminathan",
    "Prof. Meenakshi Sundaram", "Dr. Rajesh K. Varma", "Prof. Vandana Rao"
]

def generate_synthetic_demo_data(count: int = DEMO_RECORD_COUNT) -> List[Dict[str, Any]]:
    """
    Generates realistic synthetic demo records for Smart Campus Analytics.
    Clearly labeled as synthetic demonstration records.
    Covers a natural spread of students across departments, years, and risk profiles:
    - High achievers (~22%)
    - Steady performers (~30%)
    - Good academics, low placement skills (~20%)
    - Attendance & engagement deficit (~16%)
    - Critical multi-factor risk (~12%)
    Each record uses the exact same column set, order, ranges, and categories as the
    original 120-record seed (STU-2024-#### convention, 0-10 CGPA, 0-100 percentages,
    fixed department names, placement statuses, and mentor roles).
    Records are unique by Student ID.
    """
    random.seed(42)  # Deterministic seed for reproducible regeneration
    students = []

    for i in range(1, count + 1):
        stu_id = f"STU-2024-{i:05d}"
        fname = random.choice(FIRST_NAMES)
        lname = random.choice(LAST_NAMES)
        name = f"{fname} {lname}"
        dept = random.choice(DEPARTMENTS)
        year = random.choice([1, 2, 3, 4])
        mentor = random.choice(MENTORS)

        # Create distinct educational archetypes for rich demonstration
        archetype_roll = random.random()

        if archetype_roll < 0.22:
            # High achiever / Placement ready
            cgpa = round(random.uniform(8.4, 9.8), 2)
            cgpa_prev = round(min(cgpa + random.uniform(-0.2, 0.3), 9.9), 2)
            attendance = round(random.uniform(86.0, 98.0), 1)
            lms = round(random.uniform(80.0, 98.0), 1)
            coding = round(random.uniform(75.0, 98.0), 1)
            aptitude = round(random.uniform(78.0, 95.0), 1)
            mock = round(random.uniform(75.0, 96.0), 1)
            placement_status = "Placed" if (year == 4 and random.random() > 0.4) else "Ready"
            reviewed = True if random.random() > 0.6 else False
            intervention_status = "Resolved" if reviewed else "Pending Review"
            notes = "Student nominated for honor roll and campus hackathon lead." if reviewed else ""

        elif archetype_roll < 0.52:
            # Steady on-track student
            cgpa = round(random.uniform(6.8, 8.3), 2)
            cgpa_prev = round(cgpa + random.uniform(-0.3, 0.3), 2)
            attendance = round(random.uniform(76.0, 89.0), 1)
            lms = round(random.uniform(60.0, 85.0), 1)
            coding = round(random.uniform(55.0, 78.0), 1)
            aptitude = round(random.uniform(55.0, 78.0), 1)
            mock = round(random.uniform(55.0, 75.0), 1)
            placement_status = "In Progress" if year >= 3 else "Ready"
            reviewed = False
            intervention_status = "Pending Review"
            notes = ""

        elif archetype_roll < 0.72:
            # Good academics, but low technical/mock placement skills
            cgpa = round(random.uniform(7.8, 8.9), 2)
            cgpa_prev = round(cgpa + random.uniform(-0.2, 0.2), 2)
            attendance = round(random.uniform(80.0, 92.0), 1)
            lms = round(random.uniform(70.0, 88.0), 1)
            coding = round(random.uniform(28.0, 44.0), 1)  # Low coding
            aptitude = round(random.uniform(45.0, 62.0), 1)
            mock = round(random.uniform(30.0, 44.0), 1)    # Low mock
            placement_status = "Needs Training"
            reviewed = random.random() > 0.5
            intervention_status = "Workshop Scheduled" if reviewed else "Pending Review"
            notes = "Enrolled in placement coding accelerator batch." if reviewed else ""

        elif archetype_roll < 0.88:
            # Attendance & engagement deficit
            cgpa = round(random.uniform(5.8, 7.2), 2)
            cgpa_prev = round(cgpa + random.uniform(0.1, 0.8), 2)
            attendance = round(random.uniform(54.0, 73.5), 1)  # Below 75%
            lms = round(random.uniform(25.0, 50.0), 1)
            coding = round(random.uniform(42.0, 68.0), 1)
            aptitude = round(random.uniform(45.0, 65.0), 1)
            mock = round(random.uniform(40.0, 62.0), 1)
            placement_status = "Needs Training" if year >= 3 else "In Progress"
            reviewed = random.random() > 0.4
            intervention_status = "Mentoring Assigned" if reviewed else "Pending Review"
            notes = "Parent notified regarding attendance threshold." if reviewed else ""

        else:
            # Critical multi-factor risk (low attendance, low CGPA, dropping trend)
            cgpa = round(random.uniform(4.5, 5.8), 2)
            cgpa_prev = round(cgpa + random.uniform(0.8, 1.5), 2)  # Severe drop
            attendance = round(random.uniform(50.0, 68.0), 1)
            lms = round(random.uniform(20.0, 42.0), 1)
            coding = round(random.uniform(25.0, 42.0), 1)
            aptitude = round(random.uniform(30.0, 48.0), 1)
            mock = round(random.uniform(25.0, 45.0), 1)
            placement_status = "Needs Training"
            reviewed = random.random() > 0.3
            intervention_status = "Mentoring Assigned" if reviewed else "Pending Review"
            notes = "Urgent counseling session scheduled with Head of Dept." if reviewed else ""

        students.append({
            "id": stu_id,
            "name": name,
            "department": dept,
            "year": year,
            "cgpa": cgpa,
            "attendance": attendance,
            "lms_engagement": lms,
            "coding_score": coding,
            "aptitude_score": aptitude,
            "mock_interview_score": mock,
            "placement_status": placement_status,
            "historical_cgpa_prev": cgpa_prev,
            "faculty_mentor": mentor,
            "reviewed": reviewed,
            "review_notes": notes,
            "intervention_status": intervention_status,
            "intervention_action": "Faculty 1-on-1 Mentoring" if reviewed else None
        })

    return students

def seed_sample_interventions(db: Session):
    if db.query(Intervention).count() > 0:
        return
    
    # Pick a few students needing support to create realistic demo intervention plans
    candidates = db.query(Student).limit(15).all()
    if not candidates:
        return
    
    sample_plans = [
        {
            "idx": 0,
            "type": "Attendance Counselling",
            "faculty": "Prof. Sunita Deshpande",
            "status": "In Progress",
            "notes": "Discussed 68% attendance dip with student and parents. Action plan to attend morning tutorials signed.",
            "follow_up": "2026-11-01",
            "delta_att": 76.5,
            "delta_cgpa": None,
            "delta_score": None,
            "outcome": "Attendance recovering in second-half lectures."
        },
        {
            "idx": 1,
            "type": "Coding Practice",
            "faculty": "Dr. Ramesh Raman",
            "status": "Completed",
            "notes": "Enrolled in algorithmic problem-solving track on campus code lab. Completed 45 challenges.",
            "follow_up": "2026-10-15",
            "delta_att": None,
            "delta_cgpa": 7.4,
            "delta_score": 68.2,
            "outcome": "Coding score rose significantly from 35 to 58. Demonstrating good problem solving."
        },
        {
            "idx": 2,
            "type": "Mentoring",
            "faculty": "Dr. Rajesh K. Varma",
            "status": "Planned",
            "notes": "Scheduled 1-on-1 academic mentoring session regarding recent mid-semester test dips.",
            "follow_up": "2026-11-10",
            "delta_att": None,
            "delta_cgpa": None,
            "delta_score": None,
            "outcome": None
        },
        {
            "idx": 3,
            "type": "Mock Interview Support",
            "faculty": "Prof. Vandana Rao",
            "status": "Follow-up Required",
            "notes": "Conducted technical mock round. Strong conceptual answers, but communication and resume structure need polish.",
            "follow_up": "2026-10-25",
            "delta_att": None,
            "delta_cgpa": None,
            "delta_score": None,
            "outcome": "Second mock interview pending resume update."
        },
        {
            "idx": 4,
            "type": "Aptitude Preparation",
            "faculty": "Prof. Meenakshi Sundaram",
            "status": "In Progress",
            "notes": "Assigned weekly quantitative aptitude drills and reasoning tests.",
            "follow_up": "2026-11-05",
            "delta_att": None,
            "delta_cgpa": None,
            "delta_score": None,
            "outcome": "Completed 3 practice modules with 78% accuracy."
        }
    ]

    for plan in sample_plans:
        if plan["idx"] < len(candidates):
            st = candidates[plan["idx"]]
            it = Intervention(
                student_id=st.id,
                student_name=st.name,
                department=st.department,
                intervention_type=plan["type"],
                faculty_member=plan["faculty"],
                status=plan["status"],
                notes=plan["notes"],
                follow_up_date=plan["follow_up"],
                baseline_cgpa=st.cgpa,
                baseline_attendance=st.attendance,
                baseline_success_score=round(st.cgpa * 10, 1),
                subsequent_cgpa=plan["delta_cgpa"],
                subsequent_attendance=plan["delta_att"],
                subsequent_success_score=plan["delta_score"],
                outcome_summary=plan["outcome"]
            )
            db.add(it)
            st.intervention_status = plan["status"]
            st.reviewed = True
    db.commit()

def create_database_backup(db: Session, label: str = "pre_reset") -> Optional[str]:
    """
    Safely copies the current SQLite database to the backups/ directory before any
    destructive reseed. Returns the backup file path, or None if no DB file exists.
    Never overwrites an existing backup (timestamped file names).
    """
    try:
        from app.config import DATABASE_PATH
        if not os.path.exists(DATABASE_PATH):
            return None

        backups_dir = os.path.join(os.path.dirname(DATABASE_PATH), "backups")
        os.makedirs(backups_dir, exist_ok=True)
        stamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        backup_path = os.path.join(backups_dir, f"campus_analytics_{label}_{stamp}.db")
        shutil.copy2(DATABASE_PATH, backup_path)
        return backup_path
    except Exception:
        return None

def seed_database_with_demo_data(db: Session, force: bool = False) -> int:
    """
    Populates SQLite with synthetic demonstration data.
    - If the students table already has records and force=False, existing records
      (including user-uploaded data) are preserved untouched and the current count
      is returned. Generation is therefore idempotent and never duplicates rows.
    - If force=True, the current database is first backed up to backups/, then all
      student and intervention rows are replaced with the canonical demo dataset.
    """
    existing_count = db.query(Student).count()
    if existing_count > 0 and not force:
        if db.query(Intervention).count() == 0:
            seed_sample_interventions(db)
        return existing_count

    if force:
        create_database_backup(db, label="pre_reset")
        db.query(Student).delete()
        db.query(Intervention).delete()
        db.commit()

    demo_records = generate_synthetic_demo_data(DEMO_RECORD_COUNT)

    existing_ids = {r[0] for r in db.query(Student.id).all()}
    inserted = 0
    for record in demo_records:
        if record["id"] in existing_ids:
            continue  # Extra safety: never insert duplicate IDs
        existing_ids.add(record["id"])
        stu = Student(**record)
        db.add(stu)
        inserted += 1
    db.commit()

    # Keep the standalone reference CSV in sync so the demo file matches the DB.
    try:
        csv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "demo_students.csv")
        os.makedirs(os.path.dirname(csv_path), exist_ok=True)
        pd.DataFrame(demo_records).to_csv(csv_path, index=False)
    except Exception:
        pass

    seed_sample_interventions(db)
    return inserted if inserted > 0 else existing_count

COLUMN_MAP = {
    "id": ["id", "student_id", "studentid", "student id", "roll_no", "rollno", "roll number"],
    "name": ["name", "student_name", "studentname", "full_name", "student name"],
    "department": ["department", "dept", "branch", "stream"],
    "year": ["year", "academic_year", "curr_year", "batch_year"],
    "cgpa": ["cgpa", "gpa", "cumulative_gpa", "grade"],
    "attendance": ["attendance", "attendance_pct", "attendance_percentage", "attendance %", "att"],
    "lms_engagement": ["lms_engagement", "lms", "lms_score", "engagement", "lms score"],
    "coding_score": ["coding_score", "coding", "coding_test", "programming_score", "coding score"],
    "aptitude_score": ["aptitude_score", "aptitude", "quant_score", "aptitude score"],
    "mock_interview_score": ["mock_interview_score", "mock_interview", "mock_score", "interview_score", "mock interview score"],
    "placement_status": ["placement_status", "placement", "placement_state", "placement status"],
    "historical_cgpa_prev": ["historical_cgpa_prev", "prev_cgpa", "previous_cgpa", "prev_gpa", "last_term_cgpa"],
    "faculty_mentor": ["faculty_mentor", "mentor", "advisor", "mentor_name"],
    # --- Optional future-compatible dimensions (mapped only when present) ---
    "backlogs": ["backlogs", "backlog", "arrears", "pending_backlogs", "backlog_count", "active_backlogs"],
    "lms_login_frequency": ["lms_login_frequency", "login_frequency", "lms_logins", "login_count", "logins"],
    "lms_assignment_completion": ["lms_assignment_completion", "assignment_completion", "assignments_completed", "assignment_completion_pct", "assignment_pct"],
    "technical_score": ["technical_score", "technical_skills", "technical", "lab_score", "technical score"],
    "soft_skill_score": ["soft_skill_score", "soft_skills", "soft_skill", "communication_score", "soft skill score"],
    "placement_outcome": ["placement_outcome", "offer_status", "placed_status", "placement_result", "placement outcome"],
    "certifications": ["certifications", "certification_count", "certificate_count", "certificates", "certs"],
    "extracurricular": ["extracurricular", "extracurricular_score", "extracurriculars", "activities"],
    "feedback": ["feedback", "feedback_score", "student_feedback", "mentor_feedback"]
}

VALID_PLACEMENT_STATUSES = ["Placed", "Ready", "In Progress", "Needs Training"]
VALID_PLACEMENT_OUTCOMES = ["Placed", "Not Placed", "Pending"]


def _opt_float(row, resolved_cols, field, lo=None, hi=None):
    """Return a clamped float for an optional column, or None when absent/invalid."""
    col = resolved_cols.get(field)
    if not col:
        return None
    value = row.get(col)
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    try:
        if pd.isna(value):
            return None
        num = float(value)
    except (ValueError, TypeError):
        return None
    if lo is not None:
        num = max(num, lo)
    if hi is not None:
        num = min(num, hi)
    return round(num, 1)


def _opt_int(row, resolved_cols, field, lo=0, hi=50):
    """Return a clamped int for an optional column, or None when absent/invalid."""
    val = _opt_float(row, resolved_cols, field, lo=float(lo), hi=float(hi))
    if val is None:
        return None
    return int(round(val))

def parse_and_validate_file(
    content: bytes,
    filename: str
) -> Tuple[List[Dict[str, Any]], List[str], List[str]]:
    """
    Parses CSV or Excel file uploaded by user.
    Validates required columns, coerces types, enforces boundaries,
    and collects clear line-by-line errors.
    Returns:
      (valid_records, error_messages, warning_messages)
    """
    errors: List[str] = []
    warnings: List[str] = []
    valid_records: List[Dict[str, Any]] = []

    try:
        if filename.lower().endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content))
        else:
            # CSV with fallback encoding
            try:
                df = pd.read_csv(io.BytesIO(content), encoding="utf-8")
            except UnicodeDecodeError:
                df = pd.read_csv(io.BytesIO(content), encoding="latin1")
    except Exception as e:
        errors.append(f"Unable to read file: {str(e)}")
        return [], errors, warnings

    if df.empty:
        errors.append("The uploaded file contains no data rows.")
        return [], errors, warnings

    # Map column headers case-insensitively
    normalized_cols = {str(col).strip().lower(): col for col in df.columns}
    resolved_cols: Dict[str, str] = {}

    for standard_field, aliases in COLUMN_MAP.items():
        for alias in aliases:
            if alias in normalized_cols:
                resolved_cols[standard_field] = normalized_cols[alias]
                break

    # Check required fields
    required_fields = ["id", "name", "department", "year", "cgpa", "attendance"]
    missing_required = [f for f in required_fields if f not in resolved_cols]
    if missing_required:
        errors.append(
            f"Missing mandatory columns: {', '.join(missing_required)}. "
            f"Expected headers for student ID, Name, Department, Year, CGPA, and Attendance."
        )
        return [], errors, warnings

    # Process each row
    seen_ids = set()
    for row_idx, (_, row) in enumerate(df.iterrows(), start=2):  # row 2 in spreadsheet view
        try:
            # Student ID
            raw_id = str(row[resolved_cols["id"]]).strip()
            if not raw_id or raw_id.lower() == "nan":
                errors.append(f"Row {row_idx}: Missing Student ID.")
                continue
            if raw_id in seen_ids:
                warnings.append(f"Row {row_idx}: Duplicate Student ID '{raw_id}' encountered. Skipping duplicate.")
                continue
            seen_ids.add(raw_id)

            # Name
            name = str(row[resolved_cols["name"]]).strip()
            if not name or name.lower() == "nan":
                name = f"Student {raw_id}"

            # Department
            dept = str(row[resolved_cols["department"]]).strip()
            if not dept or dept.lower() == "nan":
                dept = "General Engineering"

            # Year
            try:
                year = int(float(row[resolved_cols["year"]]))
                if year < 1 or year > 5:
                    year = 1
                    warnings.append(f"Row {row_idx}: Invalid year value clamped to 1.")
            except (ValueError, TypeError):
                year = 1

            # CGPA
            try:
                cgpa = float(row[resolved_cols["cgpa"]])
                if cgpa < 0 or cgpa > 10.0:
                    errors.append(f"Row {row_idx}: CGPA {cgpa} out of range (must be 0.0 - 10.0).")
                    continue
            except (ValueError, TypeError):
                errors.append(f"Row {row_idx}: Invalid non-numeric CGPA.")
                continue

            # Attendance
            try:
                attendance = float(row[resolved_cols["attendance"]])
                if attendance < 0 or attendance > 100.0:
                    errors.append(f"Row {row_idx}: Attendance {attendance} out of range (0 - 100%).")
                    continue
            except (ValueError, TypeError):
                errors.append(f"Row {row_idx}: Invalid non-numeric Attendance.")
                continue

            # LMS engagement
            lms = 70.0
            if "lms_engagement" in resolved_cols and pd.notna(row[resolved_cols["lms_engagement"]]):
                try:
                    lms = float(row[resolved_cols["lms_engagement"]])
                    lms = min(max(lms, 0.0), 100.0)
                except (ValueError, TypeError):
                    pass

            # Coding score
            coding = 60.0
            if "coding_score" in resolved_cols and pd.notna(row[resolved_cols["coding_score"]]):
                try:
                    coding = float(row[resolved_cols["coding_score"]])
                    coding = min(max(coding, 0.0), 100.0)
                except (ValueError, TypeError):
                    pass

            # Aptitude score
            aptitude = 60.0
            if "aptitude_score" in resolved_cols and pd.notna(row[resolved_cols["aptitude_score"]]):
                try:
                    aptitude = float(row[resolved_cols["aptitude_score"]])
                    aptitude = min(max(aptitude, 0.0), 100.0)
                except (ValueError, TypeError):
                    pass

            # Mock Interview score
            mock = 60.0
            if "mock_interview_score" in resolved_cols and pd.notna(row[resolved_cols["mock_interview_score"]]):
                try:
                    mock = float(row[resolved_cols["mock_interview_score"]])
                    mock = min(max(mock, 0.0), 100.0)
                except (ValueError, TypeError):
                    pass

            # Placement status (readiness label). Unsupported categories are
            # normalised and reported so the uploader can correct the source file.
            placement = "In Progress"
            if "placement_status" in resolved_cols and pd.notna(row[resolved_cols["placement_status"]]):
                placement = str(row[resolved_cols["placement_status"]]).strip()
                if placement not in VALID_PLACEMENT_STATUSES:
                    warnings.append(
                        f"Row {row_idx}: Unsupported placement_status '{placement}' "
                        f"normalised to 'In Progress'."
                    )
                    placement = "In Progress"

            # Placement outcome (optional, genuine outcome only)
            placement_outcome = None
            if "placement_outcome" in resolved_cols and pd.notna(row[resolved_cols["placement_outcome"]]):
                raw_outcome = str(row[resolved_cols["placement_outcome"]]).strip()
                if raw_outcome:
                    matched = next(
                        (v for v in VALID_PLACEMENT_OUTCOMES if v.lower() == raw_outcome.lower()),
                        None
                    )
                    if matched:
                        placement_outcome = matched
                    else:
                        warnings.append(
                            f"Row {row_idx}: Unrecognised placement_outcome '{raw_outcome}' ignored (kept as N/A)."
                        )

            # Historical CGPA
            hist_cgpa = None
            if "historical_cgpa_prev" in resolved_cols and pd.notna(row[resolved_cols["historical_cgpa_prev"]]):
                try:
                    hist_cgpa = float(row[resolved_cols["historical_cgpa_prev"]])
                except (ValueError, TypeError):
                    hist_cgpa = None

            # Mentor
            mentor = "Prof. Unassigned"
            if "faculty_mentor" in resolved_cols and pd.notna(row[resolved_cols["faculty_mentor"]]):
                mentor = str(row[resolved_cols["faculty_mentor"]]).strip()

            valid_records.append({
                "id": raw_id,
                "name": name,
                "department": dept,
                "year": year,
                "cgpa": round(cgpa, 2),
                "attendance": round(attendance, 1),
                "lms_engagement": round(lms, 1),
                "coding_score": round(coding, 1),
                "aptitude_score": round(aptitude, 1),
                "mock_interview_score": round(mock, 1),
                "placement_status": placement,
                "historical_cgpa_prev": hist_cgpa,
                "faculty_mentor": mentor,
                "reviewed": False,
                "review_notes": "",
                "intervention_status": "Pending Review",
                "intervention_action": None,
                # Optional future-compatible dimensions (None => rendered as N/A)
                "backlogs": _opt_int(row, resolved_cols, "backlogs", lo=0, hi=50),
                "lms_login_frequency": _opt_float(row, resolved_cols, "lms_login_frequency", lo=0, hi=100),
                "lms_assignment_completion": _opt_float(row, resolved_cols, "lms_assignment_completion", lo=0, hi=100),
                "technical_score": _opt_float(row, resolved_cols, "technical_score", lo=0, hi=100),
                "soft_skill_score": _opt_float(row, resolved_cols, "soft_skill_score", lo=0, hi=100),
                "placement_outcome": placement_outcome,
                "certifications": _opt_int(row, resolved_cols, "certifications", lo=0, hi=100),
                "extracurricular": _opt_float(row, resolved_cols, "extracurricular", lo=0, hi=100),
                "feedback": _opt_float(row, resolved_cols, "feedback", lo=0, hi=100),
            })

        except Exception as row_err:
            errors.append(f"Row {row_idx}: Unexpected parsing error - {str(row_err)}")

    return valid_records, errors, warnings
