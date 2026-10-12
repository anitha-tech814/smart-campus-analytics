from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import DATABASE_PATH

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Columns added to the `students` table after the original release. `create_all`
# never alters existing tables, so we apply an idempotent, additive migration that
# preserves all existing student rows and simply appends the new nullable columns
# required to support future-compatible CSV uploads.
_ADDITIVE_STUDENT_COLUMNS = {
    "backlogs": "INTEGER",
    "lms_login_frequency": "FLOAT",
    "lms_assignment_completion": "FLOAT",
    "technical_score": "FLOAT",
    "soft_skill_score": "FLOAT",
    "placement_outcome": "VARCHAR",
    "certifications": "INTEGER",
    "extracurricular": "FLOAT",
    "feedback": "FLOAT",
}


def ensure_schema():
    """Additively migrate the SQLite schema without dropping any data."""
    inspector = inspect(engine)
    if "students" not in inspector.get_table_names():
        return
    existing = {col["name"] for col in inspector.get_columns("students")}
    missing = {name: ddl for name, ddl in _ADDITIVE_STUDENT_COLUMNS.items() if name not in existing}
    if not missing:
        return
    with engine.begin() as conn:
        for name, ddl in missing.items():
            conn.execute(text(f"ALTER TABLE students ADD COLUMN {name} {ddl}"))
