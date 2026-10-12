from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class StudentBase(BaseModel):
    id: str
    name: str
    department: str
    year: int
    cgpa: float
    attendance: float
    lms_engagement: float
    coding_score: float
    aptitude_score: float
    mock_interview_score: float
    placement_status: str
    historical_cgpa_prev: Optional[float] = None
    faculty_mentor: Optional[str] = "Prof. Unassigned"
    # Optional future-compatible dimensions (None => rendered as N/A)
    backlogs: Optional[int] = None
    lms_login_frequency: Optional[float] = None
    lms_assignment_completion: Optional[float] = None
    technical_score: Optional[float] = None
    soft_skill_score: Optional[float] = None
    placement_outcome: Optional[str] = None
    certifications: Optional[int] = None
    extracurricular: Optional[float] = None
    feedback: Optional[float] = None

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    year: Optional[int] = None
    cgpa: Optional[float] = None
    attendance: Optional[float] = None
    lms_engagement: Optional[float] = None
    coding_score: Optional[float] = None
    aptitude_score: Optional[float] = None
    mock_interview_score: Optional[float] = None
    placement_status: Optional[str] = None
    faculty_mentor: Optional[str] = None

class InterventionUpdate(BaseModel):
    reviewed: bool
    review_notes: Optional[str] = None
    intervention_status: str
    intervention_action: Optional[str] = None

class FactorContribution(BaseModel):
    factor: str
    label: str
    raw_value: float
    normalized_value: float
    weight: float
    weighted_score: float
    max_possible: float

class RecommendationItem(BaseModel):
    category: str
    trigger: str
    recommended_action: str
    suggested_timeline: str
    urgency: str
    assigned_role: str

class RiskFlag(BaseModel):
    dimension: str
    label: str
    severity: str  # high | watch | satisfactory | observed | na
    available: bool
    value: Optional[float] = None
    display_value: str
    threshold: str
    reason: str = ""

class FlagSummary(BaseModel):
    high_count: int
    watch_count: int
    flagged_count: int
    high_dimensions: List[str]
    watch_dimensions: List[str]
    na_dimensions: List[str]

class StudentDetail(StudentBase):
    reviewed: bool
    review_notes: Optional[str] = None
    intervention_status: str
    intervention_action: Optional[str] = None
    last_reviewed_at: Optional[datetime] = None

    # Calculated Success & Risk Metrics
    success_score: float
    success_category: str
    risk_level: str  # 'Low', 'Medium', 'High', 'Critical', 'Minimal'
    risk_reasons: List[str]
    factor_contributions: List[FactorContribution]
    recommendations: List[RecommendationItem]
    risk_flags: List[RiskFlag] = []
    flag_summary: Optional[FlagSummary] = None
    placement_readiness: Optional[str] = None
    cluster_name: Optional[str] = None
    cluster_id: Optional[int] = None

    class Config:
        from_attributes = True

class DashboardOverview(BaseModel):
    total_students: int
    distinct_departments: int = 0
    distinct_years: int = 0
    average_cgpa: float
    average_attendance: float
    average_success_score: float
    placement_ready_percentage: float
    students_requiring_support: int
    unique_flagged_students: int = 0
    risk_distribution: Dict[str, int]
    department_stats: List[Dict[str, Any]]
    year_distribution: Dict[str, int]
    placement_distribution: Dict[str, int]
    placement_outcomes: Dict[str, Any] = {}
    actionable_insights: List[Dict[str, Any]]
    recent_interventions: List[Dict[str, Any]]

class ClusterSummary(BaseModel):
    cluster_id: int
    name: str
    description: str
    recommendation: str
    count: int
    percentage: float
    avg_cgpa: float
    avg_attendance: float
    avg_coding: float
    avg_aptitude: float
    avg_mock: float
    avg_success_score: float
    sample_students: List[str]

class ChatQueryRequest(BaseModel):
    query: str

class ChatQueryResponse(BaseModel):
    query: str
    intent: str
    answer: str
    table_headers: Optional[List[str]] = None
    table_rows: Optional[List[Dict[str, Any]]] = None
    metrics_summary: Optional[Dict[str, Any]] = None
    suggested_queries: List[str]
    is_rule_based: bool = True

class InterventionCreate(BaseModel):
    student_id: str
    intervention_type: str
    faculty_member: Optional[str] = "Faculty Advisor"
    status: Optional[str] = "Planned"
    notes: Optional[str] = None
    follow_up_date: Optional[str] = None
    baseline_cgpa: Optional[float] = None
    baseline_attendance: Optional[float] = None
    baseline_success_score: Optional[float] = None

class InterventionUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    follow_up_date: Optional[str] = None
    subsequent_cgpa: Optional[float] = None
    subsequent_attendance: Optional[float] = None
    subsequent_success_score: Optional[float] = None
    outcome_summary: Optional[str] = None
    faculty_member: Optional[str] = None

class InterventionResponse(BaseModel):
    id: int
    student_id: str
    student_name: str
    department: str
    intervention_type: str
    faculty_member: str
    status: str
    notes: Optional[str] = None
    follow_up_date: Optional[str] = None
    baseline_cgpa: Optional[float] = None
    baseline_attendance: Optional[float] = None
    baseline_success_score: Optional[float] = None
    subsequent_cgpa: Optional[float] = None
    subsequent_attendance: Optional[float] = None
    subsequent_success_score: Optional[float] = None
    outcome_summary: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class DataQualityReport(BaseModel):
    total_records: int
    missing_fields_count: int
    duplicate_ids_detected: int
    data_completeness_pct: float
    department_sample_sizes: Dict[str, int]
    historical_telemetry_coverage: Dict[str, Any] = {}
    optional_field_coverage: List[Dict[str, Any]] = []
    observed_data_limitations: List[str]
    fairness_statement: str
    generated_at: str


# --- Local RAG assistant -------------------------------------------------
class AssistantHistoryMessage(BaseModel):
    role: str  # 'user' | 'assistant'
    content: str


class AssistantAskRequest(BaseModel):
    query: str
    history: Optional[List[AssistantHistoryMessage]] = None


class AssistantCitation(BaseModel):
    source: str
    section: Optional[str] = ""
    start_line: Optional[int] = None
    end_line: Optional[int] = None
    score: Optional[float] = None
    snippet: Optional[str] = ""


class AssistantDataBlock(BaseModel):
    intent: Optional[str] = None
    table_headers: Optional[List[str]] = None
    table_rows: Optional[List[Dict[str, Any]]] = None
    metrics_summary: Optional[Dict[str, Any]] = None
    dataset: Optional[Dict[str, Any]] = None


class AssistantEngine(BaseModel):
    llm_model: str
    llm_available: bool
    llm_reason: Optional[str] = None
    embed_backend: Optional[str] = None
    retrieved_chunks: int = 0
    used_live_data: bool = False


class AssistantAnswer(BaseModel):
    query: str
    intent: str
    answer: str
    engine: AssistantEngine
    citations: List[AssistantCitation] = []
    data: Optional[AssistantDataBlock] = None
    suggested_queries: List[str] = []
    degraded: bool = False
    notes: List[str] = []

