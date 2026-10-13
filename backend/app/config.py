import os
from pydantic import BaseModel, Field
from typing import Dict


def _load_dotenv() -> None:
    """Minimal, dependency-free ``.env`` loader (``backend/.env``).

    Variables already present in the process environment always win, so real
    deployment env vars are never overridden by a stray file. Only simple
    ``KEY=VALUE`` lines are supported; quotes and surrounding whitespace are
    trimmed. Missing/invalid files are ignored silently.
    """
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(backend_dir, ".env")
    if not os.path.isfile(path):
        return
    try:
        with open(path, "r", encoding="utf-8-sig") as handle:
            for raw in handle:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value
    except OSError:
        pass


# Load backend/.env before any module reads configuration from os.environ.
_load_dotenv()


class ScoringWeights(BaseModel):
    cgpa: float = Field(0.25, ge=0.0, le=1.0)
    attendance: float = Field(0.20, ge=0.0, le=1.0)
    lms_engagement: float = Field(0.15, ge=0.0, le=1.0)
    coding_score: float = Field(0.15, ge=0.0, le=1.0)
    aptitude_score: float = Field(0.15, ge=0.0, le=1.0)
    mock_interview_score: float = Field(0.10, ge=0.0, le=1.0)

class RiskThresholds(BaseModel):
    # --- Academic ---
    cgpa_critical: float = 5.5
    cgpa_warning: float = 6.5
    # Requested transparent academic rule: CGPA below 6.0/10 is a concern.
    cgpa_support: float = 6.0
    cgpa_drop_threshold: float = 1.0

    # --- Attendance ---
    # < attendance_warning (75) = high concern; warning..watch (75-85) = watch;
    # >= attendance_watch (85) = satisfactory.
    attendance_critical: float = 70.0
    attendance_warning: float = 75.0
    attendance_watch: float = 85.0

    # --- Placement skills ---
    coding_warning: float = 45.0
    coding_watch: float = 60.0
    aptitude_warning: float = 50.0
    aptitude_watch: float = 62.0
    mock_interview_warning: float = 45.0
    mock_interview_watch: float = 60.0
    technical_low: float = 45.0
    soft_skill_low: float = 45.0

    # --- LMS engagement ---
    lms_engagement_low: float = 40.0
    lms_engagement_watch: float = 60.0
    lms_login_low: float = 40.0          # normalized 0-100 login-frequency index
    lms_assignment_low: float = 60.0     # assignment completion %

    # --- Backlogs ---
    backlogs_watch: int = 1              # >= 1 backlog = watch
    backlogs_high: int = 2               # >= 2 backlogs = high concern

    # --- Composite success score ---
    success_score_critical: float = 45.0
    success_score_warning: float = 60.0

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE_PATH = os.path.join(BASE_DIR, "campus_analytics.db")

# Supabase PostgreSQL and Auth configuration:
# When SUPABASE_DATABASE_URL or DATABASE_URL is set, SQLAlchemy uses PostgreSQL.
# Otherwise, it falls back seamlessly to the local SQLite database.
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "").strip()
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

raw_db_url = (os.environ.get("SUPABASE_DATABASE_URL") or os.environ.get("DATABASE_URL") or "").strip()
if raw_db_url:
    if raw_db_url.startswith("postgres://"):
        raw_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)
    DATABASE_URL = raw_db_url
    IS_POSTGRES = True
else:
    DATABASE_URL = f"sqlite:///{DATABASE_PATH}"
    IS_POSTGRES = False

AUTH_SECRET_KEY = os.environ.get("AUTH_SECRET_KEY") or os.environ.get("JWT_SECRET") or "smart-campus-analytics-auth-secret-key-2026"

# Number of synthetic demonstration student records seeded on first run / reset.
# Safe default of 2400 students keeps memory well under Render free tier's 512MB RAM limit.
DEMO_RECORD_COUNT = int(os.environ.get("DEMO_RECORD_COUNT", "2400"))
DEFAULT_WEIGHTS = ScoringWeights()
DEFAULT_THRESHOLDS = RiskThresholds()
