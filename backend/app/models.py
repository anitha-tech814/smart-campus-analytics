from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime
from datetime import datetime
from app.database import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    department = Column(String, nullable=False, index=True)
    year = Column(Integer, nullable=False)
    cgpa = Column(Float, nullable=False)
    attendance = Column(Float, nullable=False)
    lms_engagement = Column(Float, nullable=False)
    coding_score = Column(Float, nullable=False)
    aptitude_score = Column(Float, nullable=False)
    mock_interview_score = Column(Float, nullable=False)
    placement_status = Column(String, nullable=False)  # 'Placed', 'Ready', 'In Progress', 'Needs Training'
    historical_cgpa_prev = Column(Float, nullable=True)  # Previous term CGPA to track progression
    faculty_mentor = Column(String, default="Prof. Unassigned")

    # --- Optional, dynamically-mapped dimensions (nullable; N/A when absent) ---
    # These support future-compatible CSV uploads. When a column is not supplied,
    # the value stays NULL and analytics render "N/A" instead of inventing data.
    backlogs = Column(Integer, nullable=True)              # number of active backlogs
    lms_login_frequency = Column(Float, nullable=True)     # normalized 0-100 login-frequency index
    lms_assignment_completion = Column(Float, nullable=True)  # assignment completion %
    technical_score = Column(Float, nullable=True)         # lab/technical skills 0-100
    soft_skill_score = Column(Float, nullable=True)        # communication/soft skills 0-100
    placement_outcome = Column(String, nullable=True)      # 'Placed' | 'Not Placed' | 'Pending' | NULL
    certifications = Column(Integer, nullable=True)        # earned certifications count
    extracurricular = Column(Float, nullable=True)         # observed extracurricular engagement index 0-100
    feedback = Column(Float, nullable=True)                # observed student feedback score 0-100
    
    # Review & Intervention Workflow
    reviewed = Column(Boolean, default=False)
    review_notes = Column(Text, nullable=True)
    intervention_status = Column(String, default="Pending Review")  # 'Pending Review', 'Mentoring Assigned', 'Workshop Scheduled', 'Resolved'
    intervention_action = Column(String, nullable=True)
    last_reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String, primary_key=True)
    value_json = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Intervention(Base):
    __tablename__ = "interventions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(String, index=True, nullable=False)
    student_name = Column(String, nullable=False)
    department = Column(String, nullable=False)
    intervention_type = Column(String, nullable=False)  # 'Mentoring', 'Attendance Counselling', 'Coding Practice', 'Aptitude Preparation', 'Mock Interview Support'
    faculty_member = Column(String, nullable=False, default="Faculty Advisor")
    status = Column(String, nullable=False, default="Planned")  # 'Planned', 'In Progress', 'Completed', 'Follow-up Required'
    notes = Column(Text, nullable=True)
    follow_up_date = Column(String, nullable=True)  # YYYY-MM-DD
    baseline_cgpa = Column(Float, nullable=True)
    baseline_attendance = Column(Float, nullable=True)
    baseline_success_score = Column(Float, nullable=True)
    subsequent_cgpa = Column(Float, nullable=True)
    subsequent_attendance = Column(Float, nullable=True)
    subsequent_success_score = Column(Float, nullable=True)
    outcome_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
