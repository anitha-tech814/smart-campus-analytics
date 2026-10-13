import {
  DashboardOverview,
  Student,
  ClusterSummary,
  ChatQueryResponse,
  SettingsPayload,
  ExecutiveReportData,
  AssistantAnswer,
  AssistantHealth,
  AssistantIndexStatus
} from '../types';

const customBase = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').trim();
const API_BASE = customBase
  ? (customBase.endsWith('/api') ? customBase : `${customBase.replace(/\/+$/, '')}/api`)
  : '/api';

const statusMsg = (res: Response) => res.statusText ? `HTTP ${res.status} (${res.statusText})` : `HTTP ${res.status}`;

export async function fetchOverview(): Promise<DashboardOverview> {
  const res = await fetch(`${API_BASE}/analytics/overview`);
  if (!res.ok) throw new Error(`Failed to load overview: ${statusMsg(res)}`);
  return res.json();
}

export async function fetchStudents(params: {
  search?: string;
  department?: string;
  year?: number;
  risk_level?: string;
  placement_status?: string;
  intervention_status?: string;
  sort_by?: string;
  sort_desc?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ items: Student[]; total: number; page: number; limit: number; total_pages: number }> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.department && params.department !== 'All') query.set('department', params.department);
  if (params.year) query.set('year', params.year.toString());
  if (params.risk_level && params.risk_level !== 'All') query.set('risk_level', params.risk_level);
  if (params.placement_status && params.placement_status !== 'All') query.set('placement_status', params.placement_status);
  if (params.intervention_status && params.intervention_status !== 'All') query.set('intervention_status', params.intervention_status);
  if (params.sort_by) query.set('sort_by', params.sort_by);
  if (params.sort_desc !== undefined) query.set('sort_desc', params.sort_desc ? 'true' : 'false');
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());

  const res = await fetch(`${API_BASE}/students?${query.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch students: ${res.statusText}`);
  return res.json();
}

export async function fetchStudentById(id: string): Promise<Student> {
  const res = await fetch(`${API_BASE}/students/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Student not found: ${res.statusText}`);
  return res.json();
}

export async function updateIntervention(
  id: string,
  payload: {
    reviewed: boolean;
    review_notes?: string;
    intervention_status: string;
    intervention_action?: string;
  }
): Promise<Student> {
  const res = await fetch(`${API_BASE}/students/${encodeURIComponent(id)}/intervention`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Failed to update intervention: ${res.statusText}`);
  return res.json();
}

export async function fetchSegmentation(): Promise<{ clusters: ClusterSummary[]; total_students: number }> {
  const res = await fetch(`${API_BASE}/analytics/segmentation`);
  if (!res.ok) throw new Error(`Failed to load segmentation: ${res.statusText}`);
  return res.json();
}

export async function fetchSummaryReport(): Promise<ExecutiveReportData> {
  const res = await fetch(`${API_BASE}/analytics/summary-report`);
  if (!res.ok) throw new Error(`Failed to load report: ${res.statusText}`);
  return res.json();
}

export async function fetchSettings(): Promise<SettingsPayload> {
  const res = await fetch(`${API_BASE}/config/settings`);
  if (!res.ok) throw new Error(`Failed to load settings: ${res.statusText}`);
  return res.json();
}

export async function saveSettings(payload: SettingsPayload): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/config/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Failed to save settings: ${res.statusText}`);
  return res.json();
}

export async function resetDemoData(): Promise<{ success: boolean; student_count: number; message: string }> {
  const res = await fetch(`${API_BASE}/config/reset-demo`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(`Failed to reset demo data: ${res.statusText}`);
  return res.json();
}

export async function clearAllData(): Promise<{ success: boolean; student_count: number; message: string }> {
  const res = await fetch(`${API_BASE}/config/clear-all`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error(`Failed to clear data: ${res.statusText}`);
  return res.json();
}

export async function uploadDataset(file: File, replaceExisting: boolean = false): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/students/upload?replace_existing=${replaceExisting}`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  return res.json();
}

export async function askAssistant(query: string): Promise<ChatQueryResponse> {
  const res = await fetch(`${API_BASE}/assistant/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  if (!res.ok) throw new Error(`Assistant query failed: ${res.statusText}`);
  return res.json();
}

// --- Local RAG assistant -------------------------------------------------
export async function askAssistantRag(
  query: string,
  history: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<AssistantAnswer> {
  const res = await fetch(`${API_BASE}/assistant/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, history })
  });
  if (!res.ok) throw new Error(`Assistant query failed: ${res.statusText}`);
  return res.json();
}

export async function fetchAssistantHealth(): Promise<AssistantHealth> {
  const res = await fetch(`${API_BASE}/assistant/health`);
  if (!res.ok) throw new Error(`Failed to load assistant health: ${res.statusText}`);
  return res.json();
}

export async function fetchAssistantIndexStatus(): Promise<AssistantIndexStatus> {
  const res = await fetch(`${API_BASE}/assistant/index/status`);
  if (!res.ok) throw new Error(`Failed to load index status: ${res.statusText}`);
  return res.json();
}

export async function reindexAssistant(force = false): Promise<Record<string, any>> {
  const res = await fetch(`${API_BASE}/assistant/index/reindex?force=${force ? 'true' : 'false'}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(`Re-index failed: ${res.statusText}`);
  return res.json();
}

export async function fetchInterventions(params?: {
  student_id?: string;
  status?: string;
  intervention_type?: string;
  department?: string;
}): Promise<import('../types').InterventionItem[]> {
  const query = new URLSearchParams();
  if (params?.student_id) query.set('student_id', params.student_id);
  if (params?.status && params.status !== 'All') query.set('status', params.status);
  if (params?.intervention_type && params.intervention_type !== 'All') query.set('intervention_type', params.intervention_type);
  if (params?.department && params.department !== 'All') query.set('department', params.department);

  const res = await fetch(`${API_BASE}/interventions?${query.toString()}`);
  if (!res.ok) throw new Error(`Failed to load interventions: ${res.statusText}`);
  return res.json();
}

export async function createIntervention(
  payload: import('../types').InterventionCreatePayload
): Promise<import('../types').InterventionItem> {
  const res = await fetch(`${API_BASE}/interventions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Failed to create intervention: ${res.statusText}`);
  return res.json();
}

export async function updateInterventionItem(
  id: number,
  payload: import('../types').InterventionUpdatePayload
): Promise<import('../types').InterventionItem> {
  const res = await fetch(`${API_BASE}/interventions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Failed to update intervention: ${res.statusText}`);
  return res.json();
}

export async function deleteInterventionItem(id: number): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/interventions/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error(`Failed to delete intervention: ${res.statusText}`);
  return res.json();
}

export async function fetchDataQuality(): Promise<import('../types').DataQualityData> {
  const res = await fetch(`${API_BASE}/analytics/data-quality`);
  if (!res.ok) throw new Error(`Failed to fetch data quality: ${res.statusText}`);
  return res.json();
}

export async function fetchRiskRoster(): Promise<import('../types').RiskRosterData> {
  const res = await fetch(`${API_BASE}/analytics/risk-roster`);
  if (!res.ok) throw new Error(`Failed to fetch risk roster: ${res.statusText}`);
  return res.json();
}

export async function fetchRecommendationPlaybooks(): Promise<import('../types').RecommendationAggregate> {
  const res = await fetch(`${API_BASE}/analytics/recommendations`);
  if (!res.ok) throw new Error(`Failed to fetch recommendation playbooks: ${res.statusText}`);
  return res.json();
}

export async function fetchDepartmentAnalytics(): Promise<import('../types').DepartmentAnalyticsData> {
  const res = await fetch(`${API_BASE}/analytics/departments`);
  if (!res.ok) throw new Error(`Failed to fetch department analytics: ${res.statusText}`);
  return res.json();
}

export async function fetchRiskDimensions(): Promise<import('../types').RiskDimensionsData> {
  const res = await fetch(`${API_BASE}/analytics/risk-dimensions`);
  if (!res.ok) throw new Error(`Failed to fetch risk dimensions: ${res.statusText}`);
  return res.json();
}

export async function fetchRiskOverlap(): Promise<import('../types').RiskOverlapData> {
  const res = await fetch(`${API_BASE}/analytics/risk-overlap`);
  if (!res.ok) throw new Error(`Failed to fetch risk overlap: ${res.statusText}`);
  return res.json();
}

export async function fetchDepartmentRiskMatrix(): Promise<import('../types').DeptRiskMatrixData> {
  const res = await fetch(`${API_BASE}/analytics/department-risk-matrix`);
  if (!res.ok) throw new Error(`Failed to fetch department risk matrix: ${res.statusText}`);
  return res.json();
}

export async function fetchRiskRegister(): Promise<import('../types').RiskRegisterData> {
  const res = await fetch(`${API_BASE}/analytics/risk-register`);
  if (!res.ok) throw new Error(`Failed to fetch risk register: ${res.statusText}`);
  return res.json();
}

export async function fetchBranchRiskOverview(): Promise<import('../types').BranchRiskOverviewData> {
  const res = await fetch(`${API_BASE}/analytics/branch-risk-overview`);
  if (!res.ok) throw new Error(`Failed to fetch branch risk overview: ${res.statusText}`);
  return res.json();
}

export async function fetchBranchDetail(
  branch: string,
  year?: number | null
): Promise<import('../types').BranchDetailData> {
  const query = new URLSearchParams();
  query.set('branch', branch);
  if (year) query.set('year', year.toString());
  const res = await fetch(`${API_BASE}/analytics/branch-detail?${query.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch branch detail: ${res.statusText}`);
  return res.json();
}

export interface AtRiskRegisterParams {
  branch?: string;
  year?: number;
  dimension?: string;
  priority?: string;
  search?: string;
  sort_by?: string;
  sort_desc?: boolean;
  page?: number;
  limit?: number;
}

export async function fetchAtRiskRegister(
  params: AtRiskRegisterParams = {}
): Promise<import('../types').AtRiskRegisterData> {
  const query = new URLSearchParams();
  if (params.branch && params.branch !== 'All') query.set('branch', params.branch);
  if (params.year) query.set('year', params.year.toString());
  if (params.dimension && params.dimension !== 'All') query.set('dimension', params.dimension);
  if (params.priority && params.priority !== 'All') query.set('priority', params.priority);
  if (params.search) query.set('search', params.search);
  if (params.sort_by) query.set('sort_by', params.sort_by);
  if (params.sort_desc !== undefined) query.set('sort_desc', params.sort_desc ? 'true' : 'false');
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());

  const res = await fetch(`${API_BASE}/analytics/at-risk-register?${query.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch at-risk register: ${res.statusText}`);
  return res.json();
}

export function buildAtRiskRegisterExportUrl(params: AtRiskRegisterParams = {}): string {
  const query = new URLSearchParams();
  if (params.branch && params.branch !== 'All') query.set('branch', params.branch);
  if (params.year) query.set('year', params.year.toString());
  if (params.dimension && params.dimension !== 'All') query.set('dimension', params.dimension);
  if (params.priority && params.priority !== 'All') query.set('priority', params.priority);
  if (params.search) query.set('search', params.search);
  if (params.sort_by) query.set('sort_by', params.sort_by);
  if (params.sort_desc !== undefined) query.set('sort_desc', params.sort_desc ? 'true' : 'false');
  return `${API_BASE}/analytics/export/at-risk-register.csv?${query.toString()}`;
}

