export interface FactorContribution {
  factor: string;
  label: string;
  raw_value: number;
  normalized_value: number;
  weight: number;
  weighted_score: number;
  max_possible: number;
}

export interface RecommendationItem {
  category: string;
  trigger: string;
  recommended_action: string;
  suggested_timeline: string;
  urgency: 'High' | 'Medium' | 'Low' | string;
  assigned_role: string;
}

export type RiskSeverity = 'high' | 'watch' | 'satisfactory' | 'observed' | 'na';

export interface RiskFlag {
  dimension: string;
  label: string;
  severity: RiskSeverity;
  available: boolean;
  value?: number | null;
  display_value: string;
  threshold: string;
  reason: string;
}

export interface FlagSummary {
  high_count: number;
  watch_count: number;
  flagged_count: number;
  high_dimensions: string[];
  watch_dimensions: string[];
  na_dimensions: string[];
}

export interface Student {
  id: string;
  name: string;
  department: string;
  year: number;
  cgpa: number;
  attendance: number;
  lms_engagement: number;
  coding_score: number;
  aptitude_score: number;
  mock_interview_score: number;
  placement_status: 'Placed' | 'Ready' | 'In Progress' | 'Needs Training' | string;
  historical_cgpa_prev?: number | null;
  faculty_mentor?: string;
  reviewed: boolean;
  review_notes?: string;
  intervention_status: 'Pending Review' | 'Mentoring Assigned' | 'Workshop Scheduled' | 'Resolved' | string;
  intervention_action?: string | null;
  last_reviewed_at?: string | null;

  // Optional future-compatible dimensions (null => rendered as N/A)
  backlogs?: number | null;
  lms_login_frequency?: number | null;
  lms_assignment_completion?: number | null;
  technical_score?: number | null;
  soft_skill_score?: number | null;
  placement_outcome?: string | null;
  certifications?: number | null;
  extracurricular?: number | null;
  feedback?: number | null;

  // Enriched fields
  success_score: number;
  success_category: string;
  risk_level: 'Critical' | 'High' | 'Medium' | 'Low' | 'Minimal';
  risk_reasons: string[];
  factor_contributions: FactorContribution[];
  recommendations: RecommendationItem[];
  risk_flags?: RiskFlag[];
  flag_summary?: FlagSummary | null;
  placement_readiness?: string | null;
  cluster_id?: number;
  cluster_name?: string;
}

export interface DepartmentStat {
  department: string;
  student_count: number;
  enrollment_percentage?: number;
  avg_cgpa: number;
  avg_attendance: number;
  avg_lms?: number;
  avg_success_score: number;
  at_risk_students: number;
  risk_percentage: number;
  unique_flagged_students?: number;
  readiness_ready_percentage?: number;
  outcome_tracked?: boolean;
}

export interface DashboardOverview {
  total_students: number;
  distinct_departments?: number;
  distinct_years?: number;
  average_cgpa: number;
  average_attendance: number;
  average_success_score: number;
  placement_ready_percentage: number;
  students_requiring_support: number;
  unique_flagged_students?: number;
  risk_distribution: {
    Critical: number;
    High: number;
    Medium: number;
    Low: number;
    Minimal: number;
  };
  department_stats: DepartmentStat[];
  year_distribution: Record<number, number>;
  placement_distribution: Record<string, number>;
  placement_outcomes?: {
    readiness: Record<string, number>;
    outcome: Record<string, number>;
    outcome_tracked: boolean;
    outcome_note: string;
  };
  actionable_insights: {
    type: 'warning' | 'info' | 'urgent' | 'success';
    title: string;
    message: string;
    action: string;
  }[];
  recent_interventions: {
    id: string;
    name: string;
    department: string;
    risk_level: string;
    intervention_status: string;
    intervention_action: string;
    review_notes: string;
    last_reviewed_at?: string;
  }[];
}

export interface ClusterSummary {
  cluster_id: number;
  name: string;
  description: string;
  recommendation: string;
  count: number;
  percentage: number;
  avg_cgpa: number;
  avg_attendance: number;
  avg_coding: number;
  avg_aptitude: number;
  avg_mock: number;
  avg_success_score: number;
  sample_students: string[];
}

export interface ChatQueryResponse {
  query: string;
  intent: string;
  answer: string;
  table_headers?: string[];
  table_rows?: Record<string, any>[];
  metrics_summary?: Record<string, any>;
  suggested_queries: string[];
  is_rule_based: boolean;
}

export interface AssistantCitation {
  source: string;
  section?: string;
  start_line?: number;
  end_line?: number;
  score?: number;
  snippet?: string;
}

export interface AssistantDataBlock {
  intent?: string;
  table_headers?: string[];
  table_rows?: Record<string, any>[];
  metrics_summary?: Record<string, any>;
  dataset?: Record<string, any>;
}

export interface AssistantEngine {
  llm_model: string;
  llm_available: boolean;
  llm_reason?: string;
  embed_backend?: string;
  retrieved_chunks?: number;
  used_live_data?: boolean;
}

export interface AssistantAnswer {
  query: string;
  intent: string;
  answer: string;
  engine: AssistantEngine;
  citations: AssistantCitation[];
  data?: AssistantDataBlock | null;
  suggested_queries: string[];
  degraded: boolean;
  notes: string[];
}

export interface AssistantIndexStatus {
  index_exists: boolean;
  chunk_count: number;
  document_count: number;
  embed_backend?: string;
  embed_dim?: number;
  created_at?: number;
  updated_at?: number;
  documents?: Record<string, number>;
  vector_count?: number;
}

export interface AssistantHealth {
  llm: {
    available: boolean;
    model: string;
    model_installed?: boolean;
    reason?: string;
    setup_hint?: string;
  };
  embedding: {
    backend: string;
    is_model_based: boolean;
    dim: number;
    setup_hint?: string;
  };
  index: AssistantIndexStatus;
  ready: { generation: boolean; retrieval: boolean; data_engine: boolean };
}

export interface ScoringWeights {
  cgpa: number;
  attendance: number;
  lms_engagement: number;
  coding_score: number;
  aptitude_score: number;
  mock_interview_score: number;
}

export interface RiskThresholds {
  attendance_critical: number;
  attendance_warning: number;
  cgpa_critical: number;
  cgpa_warning: number;
  cgpa_drop_threshold: number;
  coding_warning: number;
  aptitude_warning: number;
  mock_interview_warning: number;
  success_score_critical: number;
  success_score_warning: number;
}

export interface SettingsPayload {
  scoring_weights: ScoringWeights;
  risk_thresholds: RiskThresholds;
}

export interface ExecutiveReportData {
  report_title: string;
  generated_at: string;
  dataset_scope: string;
  is_demo_data: boolean;
  total_cohort: number;
  average_cgpa: number;
  average_attendance: number;
  average_success_score: number;
  critical_cases_count: number;
  high_cases_count: number;
  critical_students: {
    id: string;
    name: string;
    department: string;
    year: number;
    cgpa: number;
    attendance: number;
    success_score: number;
    reasons: string[];
  }[];
  privacy_notice: string;
}

export interface InterventionItem {
  id: number;
  student_id: string;
  student_name: string;
  department: string;
  intervention_type: 'Mentoring' | 'Attendance Counselling' | 'Coding Practice' | 'Aptitude Preparation' | 'Mock Interview Support' | string;
  faculty_member: string;
  status: 'Planned' | 'In Progress' | 'Completed' | 'Follow-up Required' | string;
  notes?: string;
  follow_up_date?: string;
  baseline_cgpa?: number | null;
  baseline_attendance?: number | null;
  baseline_success_score?: number | null;
  subsequent_cgpa?: number | null;
  subsequent_attendance?: number | null;
  subsequent_success_score?: number | null;
  outcome_summary?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface InterventionCreatePayload {
  student_id: string;
  intervention_type: string;
  faculty_member?: string;
  status?: string;
  notes?: string;
  follow_up_date?: string;
  baseline_cgpa?: number;
  baseline_attendance?: number;
  baseline_success_score?: number;
}

export interface InterventionUpdatePayload {
  status?: string;
  notes?: string;
  follow_up_date?: string;
  subsequent_cgpa?: number;
  subsequent_attendance?: number;
  subsequent_success_score?: number;
  outcome_summary?: string;
  faculty_member?: string;
}

export interface DataQualityData {
  total_records: number;
  missing_fields_count: number;
  duplicate_ids_detected: number;
  data_completeness_pct: number;
  department_sample_sizes: Record<string, number>;
  historical_telemetry_coverage: {
    available_count: number;
    missing_count: number;
    coverage_pct: number;
  };
  optional_field_coverage?: {
    field: string;
    available_count: number;
    missing_count: number;
    coverage_pct: number;
  }[];
  observed_data_limitations: string[];
  fairness_statement: string;
  generated_at: string;
}

export interface RiskRosterItem {
  id: string;
  name: string;
  department: string;
  year: number;
  cgpa: number;
  attendance: number;
  coding_score: number;
  success_score: number;
  risk_level: 'Critical' | 'High' | 'Medium' | 'Low' | 'Minimal';
  risk_reasons: string[];
  historical_cgpa_prev?: number | null;
  intervention_status: string;
  reviewed: boolean;
}

export interface RiskRosterData {
  items: RiskRosterItem[];
  total: number;
  summary: Record<string, number>;
  declining_count: number;
  with_history_count: number;
  departments: string[];
}

export interface RecommendationPlaybook {
  category: string;
  trigger: string;
  recommended_action: string;
  suggested_timeline: string;
  urgency: string;
  assigned_role: string;
  impacted_count: number;
  sample_students: {
    id: string;
    name: string;
    department: string;
    risk_level: string;
  }[];
}

export interface WorkflowStudent {
  id: string;
  name: string;
  department: string;
  risk_level: string;
  intervention_status: string;
  faculty_mentor: string;
  review_notes: string;
  reviewed: boolean;
}

export interface RecommendationAggregate {
  total_students: number;
  playbooks: RecommendationPlaybook[];
  workflow: {
    pending: number;
    in_progress: number;
    resolved: number;
    total: number;
  };
  workflow_students: WorkflowStudent[];
}

export interface RiskDimension {
  dimension: string;
  label: string;
  high_count: number;
  watch_count: number;
  affected_count: number;
  satisfactory_count: number;
  available_count: number;
  na_count: number;
  affected_percentage_of_available: number;
  affected_percentage_of_cohort: number;
  department_breakdown: { department: string; count: number }[];
  sample_students: {
    id: string;
    name: string;
    department: string;
    year?: number;
    risk_level?: string;
    value?: string;
  }[];
}

export interface RiskDimensionThreshold {
  dimension: string;
  label: string;
  rule: string;
}

export interface RiskDimensionsData {
  total_students: number;
  unique_flagged: number;
  unique_high: number;
  unique_watch_only: number;
  unique_flagged_percentage: number;
  fully_unavailable_students: number;
  dimensions: RiskDimension[];
  thresholds: RiskDimensionThreshold[];
}

export interface RiskOverlapData {
  dimensions: string[];
  labels: Record<string, string>;
  matrix: Record<string, Record<string, number>>;
  unique_counts: Record<string, number>;
  unique_flagged: number;
  total_students: number;
}

export interface DeptRiskMatrixCell {
  department: string;
  denominator: number;
  dimensions: Record<string, { count: number; percentage: number }>;
}

export interface DeptRiskMatrixData {
  dimensions: string[];
  labels: Record<string, string>;
  departments: string[];
  cells: DeptRiskMatrixCell[];
}

export interface DepartmentAnalyticsRow extends DepartmentStat {
  avg_lms?: number;
  years_covered?: number[];
  readiness_distribution?: Record<string, number>;
  placement_outcome_distribution?: Record<string, number>;
  unique_flagged_students?: number;
}

export interface DepartmentAnalyticsData {
  total_students: number;
  distinct_departments: number;
  departments: DepartmentAnalyticsRow[];
}

export interface RiskRegisterRow {
  id: string;
  name: string;
  department: string;
  year: number;
  cgpa?: number | null;
  attendance?: number | null;
  lms_engagement?: number | null;
  backlogs?: number | null;
  coding_score?: number | null;
  aptitude_score?: number | null;
  mock_interview_score?: number | null;
  technical_score?: number | null;
  soft_skill_score?: number | null;
  placement_status?: string | null;
  placement_readiness?: string | null;
  placement_outcome?: string | null;
  success_score?: number | null;
  risk_level: string;
  risk_reasons: string[];
  high_dimensions: string[];
  watch_dimensions: string[];
  na_dimensions: string[];
  high_count: number;
  watch_count: number;
  flagged_count: number;
  intervention_status: string;
  reviewed: boolean;
  faculty_mentor?: string | null;
  recommendations: RecommendationItem[];
}

export interface RiskRegisterData {
  total_students: number;
  generated_at: string;
  students: RiskRegisterRow[];
}

export interface PriorityCounts {
  Critical: number;
  High: number;
  Medium: number;
  Low: number;
  Minimal: number;
}

export interface BranchOverviewRow {
  branch: string;
  department: string;
  total_students: number;
  student_count: number;
  enrollment_percentage?: number;
  unique_at_risk_students: number;
  at_risk_students: number;
  risk_percentage: number;
  unique_at_risk_percentage: number;
  priority_counts: PriorityCounts;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  minimal_count: number;
  avg_cgpa: number;
  avg_attendance: number;
  avg_success_score: number;
  readiness_ready_percentage?: number;
  years_covered?: number[];
}

export interface BranchRiskOverviewData {
  total_students: number;
  distinct_branches: number;
  branches: BranchOverviewRow[];
  overall: {
    unique_at_risk_students: number;
    at_risk_students: number;
    risk_percentage: number;
    unique_at_risk_percentage: number;
    priority_counts: PriorityCounts;
  };
  branches_available: string[];
  years_available: number[];
  thresholds: RiskDimensionThreshold[];
}

export interface BranchDimensionRow {
  dimension: string;
  label: string;
  high_count: number;
  watch_count: number;
  affected_count: number;
  satisfactory_count: number;
  available_count: number;
  na_count: number;
  affected_percentage_of_branch: number;
  affected_percentage_of_available: number;
}

export interface BranchSupportItem {
  category: string;
  trigger: string;
  recommended_action: string;
  suggested_timeline: string;
  urgency: string;
  assigned_role: string;
  impacted_count: number;
}

export interface BranchDetailData {
  branch: string;
  year?: number | null;
  total_students: number;
  at_risk_students: number;
  unique_at_risk_students: number;
  unique_at_risk_percentage: number;
  risk_percentage: number;
  priority_counts: PriorityCounts;
  risk_distribution: PriorityCounts;
  dimensions: BranchDimensionRow[];
  most_common_dimensions: BranchDimensionRow[];
  support_summary: BranchSupportItem[];
  year_distribution: Record<string, number>;
  sample_students: AtRiskRegisterRow[];
  thresholds: RiskDimensionThreshold[];
}

export interface RegisterTriggeringFlag {
  dimension: string;
  label: string;
  severity: RiskSeverity;
  value?: number | null;
  display_value: string;
  threshold: string;
  reason: string;
}

export interface AtRiskRegisterRow extends RiskRegisterRow {
  branch: string;
  lms_login_frequency?: number | null;
  lms_assignment_completion?: number | null;
  risk_flags?: RiskFlag[];
  triggering_flags?: RegisterTriggeringFlag[];
}

export interface AtRiskRegisterData {
  items: AtRiskRegisterRow[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  summary: {
    total: number;
    unique_students: number;
    priority_counts: PriorityCounts;
    at_risk_students: number;
    unique_flagged_students: number;
  };
  filter_options: {
    branches: string[];
    years: number[];
    dimensions: { dimension: string; label: string }[];
    priorities: string[];
  };
}

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  role: 'advisor' | 'faculty' | 'admin';
  department?: string | null;
  created_at?: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
  provider: string;
}

export interface DemoAccountInfo {
  role: string;
  label: string;
  email: string;
  password: string;
  description: string;
}


