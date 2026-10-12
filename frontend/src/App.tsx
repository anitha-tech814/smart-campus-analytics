import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './views/DashboardView';
import { StudentTable } from './components/StudentTable';
import { RiskAssessmentView } from './views/RiskAssessmentView';
import { BranchRiskView } from './views/BranchRiskView';
import { RiskDimensionsView } from './views/RiskDimensionsView';
import { ClusterVisualizer } from './components/ClusterVisualizer';
import { RecommendationsView } from './views/RecommendationsView';
import { InterventionTrackerView } from './views/InterventionTrackerView';
import { SimulatorView } from './views/SimulatorView';
import { DataQualityView } from './views/DataQualityView';
import { PrintableReport } from './components/PrintableReport';
import { StudentDetailModal } from './components/StudentDetailModal';
import { UploadModal } from './components/UploadModal';
import { WeightSettingsModal } from './components/WeightSettingsModal';
import { FloatingChatAssistant } from './components/FloatingChatAssistant';
import { ToastContainer, ToastItem } from './components/Toast';
import { Sliders, RotateCcw, ShieldCheck, Database, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

import {
  fetchOverview,
  fetchStudents,
  fetchStudentById,
  fetchSegmentation,
  fetchSummaryReport,
  fetchRiskRoster,
  fetchRecommendationPlaybooks,
  resetDemoData
} from './services/api';

import {
  DashboardOverview,
  Student,
  ClusterSummary,
  ExecutiveReportData,
  RiskRosterData,
  RecommendationAggregate
} from './types';

export const App: React.FC = () => {
  // Sync tab with URL Hash for seamless browser back/forward navigation
  const getInitialTab = (): NavTab => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '') as NavTab;
      const validTabs: NavTab[] = [
        'dashboard',
        'students',
        'risk',
        'branches',
        'dimensions',
        'interventions',
        'simulator',
        'segmentation',
        'recommendations',
        'report',
        'quality',
        'settings'
      ];
      if (validTabs.includes(hash)) return hash;
    }
    return 'dashboard';
  };

  const [currentTab, setCurrentTab] = useState<NavTab>(getInitialTab);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('smart_campus_sidebar_collapsed') === 'true';
    }
    return false;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: 'success' | 'info' | 'warning' | 'error', message: string, title?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Data State
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [clusters, setClusters] = useState<ClusterSummary[]>([]);
  const [reportData, setReportData] = useState<ExecutiveReportData | null>(null);
  const [riskRoster, setRiskRoster] = useState<RiskRosterData | null>(null);
  const [recAggregate, setRecAggregate] = useState<RecommendationAggregate | null>(null);

  // Student Table & Filter State
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [riskLevel, setRiskLevel] = useState('All');
  const [placementStatus, setPlacementStatus] = useState('All');
  const [sortBy, setSortBy] = useState('id');
  const [sortDesc, setSortDesc] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 50;

  // Modals
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Loading
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  // API reachability / load failure surfaced to the UI (instead of silent console errors)
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadErrorDetail, setLoadErrorDetail] = useState<string | null>(null);

  // Synchronize Tab with Browser History
  const handleTabChange = (tab: NavTab) => {
    setCurrentTab(tab);
    setIsMobileMenuOpen(false);
    if (typeof window !== 'undefined') {
      window.location.hash = tab;
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as NavTab;
      const validTabs: NavTab[] = [
        'dashboard',
        'students',
        'risk',
        'branches',
        'dimensions',
        'interventions',
        'simulator',
        'segmentation',
        'recommendations',
        'report',
        'quality',
        'settings'
      ];
      if (validTabs.includes(hash)) {
        setCurrentTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('smart_campus_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Load Overview Data
  const loadOverview = async () => {
    try {
      const data = await fetchOverview();
      setOverview(data);
      setLoadError(null);
      setLoadErrorDetail(null);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error('Failed to load overview:', err);
      // Keep any previously loaded data on a transient refresh failure; only surface the error.
      setLoadError('Could not reach the analytics API. The backend server may be stopped or unreachable.');
      setLoadErrorDetail(detail);
    }
  };

  // Load Students with filters
  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await fetchStudents({
        search,
        department,
        risk_level: riskLevel,
        placement_status: placementStatus,
        sort_by: sortBy,
        sort_desc: sortDesc,
        page,
        limit
      });
      setStudents(data.items);
      setTotalStudents(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Clusters
  const loadClusters = async () => {
    try {
      const data = await fetchSegmentation();
      setClusters(data.clusters);
    } catch (err) {
      console.error('Failed to load segmentation:', err);
    }
  };

  // Load Executive Report
  const loadReport = async () => {
    try {
      const data = await fetchSummaryReport();
      setReportData(data);
    } catch (err) {
      console.error('Failed to load report:', err);
    }
  };

  // Load full-cohort risk roster (complete 12,000-record dataset)
  const loadRiskRoster = async () => {
    try {
      const data = await fetchRiskRoster();
      setRiskRoster(data);
    } catch (err) {
      console.error('Failed to load risk roster:', err);
    }
  };

  // Load full-cohort recommendation aggregation
  const loadRecommendations = async () => {
    try {
      const data = await fetchRecommendationPlaybooks();
      setRecAggregate(data);
    } catch (err) {
      console.error('Failed to load recommendation playbooks:', err);
    }
  };

  // Initial Load
  useEffect(() => {
    Promise.all([loadOverview(), loadStudents(), loadClusters(), loadRiskRoster(), loadRecommendations()]).finally(() => {
      setInitialLoading(false);
    });
  }, []);

  // Reload students when filters or pagination change
  useEffect(() => {
    if (!initialLoading) {
      loadStudents();
    }
  }, [search, department, riskLevel, placementStatus, sortBy, sortDesc, page]);

  // Load report when tab changes to report
  useEffect(() => {
    if (currentTab === 'report') {
      loadReport();
    }
  }, [currentTab]);

  const handleRefreshAll = () => {
    loadOverview();
    loadStudents();
    loadClusters();
    loadRiskRoster();
    loadRecommendations();
    if (currentTab === 'report') loadReport();
  };

  // Retry hook for the error state — re-runs the full initial bootstrap
  const handleRetry = () => {
    setInitialLoading(true);
    setLoadError(null);
    setLoadErrorDetail(null);
    Promise.all([loadOverview(), loadStudents(), loadClusters(), loadRiskRoster(), loadRecommendations()]).finally(() => {
      setInitialLoading(false);
    });
  };

  // Accurate dataset badge state for the header (never a misleading "0")
  const headerDataStatus: 'loading' | 'online' | 'offline' | 'empty' = loadError
    ? 'offline'
    : initialLoading
    ? 'loading'
    : overview && overview.total_students === 0
    ? 'empty'
    : 'online';

  const handleSelectStudentById = async (id: string) => {
    try {
      const s = await fetchStudentById(id);
      setSelectedStudent(s);
    } catch (err) {
      addToast('error', `Could not open student dossier: ${id}`);
    }
  };

  const handleStudentUpdated = (updated: Student) => {
    setSelectedStudent(updated);
    setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    loadOverview();
    addToast('success', `Advisory notes updated for ${updated.name} (${updated.id})`, 'Workflow Saved');
  };

  const handleSortChange = (col: string) => {
    if (sortBy === col) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(col);
      setSortDesc(false);
    }
    setPage(1);
  };

  const handleExportCsv = () => {
    const query = new URLSearchParams();
    if (department && department !== 'All') query.set('department', department);
    if (riskLevel && riskLevel !== 'All') query.set('risk_level', riskLevel);
    window.open(`/api/students/export/csv?${query.toString()}`, '_blank');
    addToast('info', 'Dataset exported as CSV formatted file.', 'Export Complete');
  };

  // Cross-Navigation with Interactive Filters from Dashboard
  const handleFilterDepartmentAndNavigate = (dept: string) => {
    setDepartment(dept);
    setSearch('');
    setPage(1);
    handleTabChange('students');
    addToast('info', `Displaying students in ${dept}`, 'Department Filter Applied');
  };

  const handleFilterRiskAndNavigate = (risk: string) => {
    setRiskLevel(risk);
    setPage(1);
    handleTabChange('risk');
    addToast('warning', `Filtering cohort by ${risk} Priority risk tier`, 'Risk Filter Applied');
  };

  const handleFilterPlacementAndNavigate = (placement: string) => {
    setPlacementStatus(placement);
    setPage(1);
    handleTabChange('students');
    addToast('info', `Displaying candidates with status: ${placement}`, 'Placement Filter Applied');
  };

  const handleFilterByCluster = (clusterId: number) => {
    handleTabChange('students');
    setSearch('');
    setDepartment('All');
    setRiskLevel('All');
    addToast('info', `Filtered roster for Cluster Archetype #${clusterId + 1}`, 'Cluster Filter Applied');
  };

  const handleResetFilters = () => {
    setSearch('');
    setDepartment('All');
    setRiskLevel('All');
    setPlacementStatus('All');
    setPage(1);
    addToast('success', 'All search and roster filters cleared.', 'Filters Reset');
  };

  // Database Reset Action
  const handleConfirmResetDatabase = async () => {
    try {
      const res = await resetDemoData();
      setResetConfirmOpen(false);
      handleRefreshAll();
      addToast('success', `Database reset to ${res.student_count.toLocaleString()} synthetic student records.`, 'Reset Successful');
    } catch (err) {
      addToast('error', 'Failed to reset database.', 'Error');
    }
  };

  // Active filter label summary
  const getActiveFilterSummary = () => {
    const parts = [];
    if (department !== 'All') parts.push(department);
    if (riskLevel !== 'All') parts.push(riskLevel);
    if (placementStatus !== 'All') parts.push(placementStatus);
    if (search) parts.push(`"${search}"`);
    return parts.length > 0 ? parts.join(', ') : undefined;
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans antialiased text-slate-800">
      
      {/* Sidebar Navigation (Desktop) */}
      <div className="hidden md:flex shrink-0">
        <Sidebar
          currentTab={currentTab}
          onTabChange={handleTabChange}
          supportCount={overview?.students_requiring_support || 0}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
      </div>

      {/* Mobile Drawer Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-navy-950/60 backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-64 h-full">
            <Sidebar
              currentTab={currentTab}
              onTabChange={handleTabChange}
              supportCount={overview?.students_requiring_support || 0}
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Compact Header */}
        <Header
          currentTab={currentTab}
          studentCount={totalStudents || overview?.total_students || 0}
          supportCount={overview?.students_requiring_support || 0}
          dataStatus={headerDataStatus}
          activeFilterSummary={getActiveFilterSummary()}
          onOpenUpload={() => setUploadModalOpen(true)}
          onOpenSettings={() => setSettingsModalOpen(true)}
          onToggleAssistant={() => setIsAssistantOpen((prev) => !prev)}
          onExportCsv={handleExportCsv}
          onResetFilters={handleResetFilters}
          onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          
          {/* Global API-unreachable banner (all tabs except dashboard, which shows a full error card) */}
          {loadError && currentTab !== 'dashboard' && (
            <div className="max-w-7xl mx-auto mb-4 flex items-start sm:items-center gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 shadow-2xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold">{loadError}</p>
                {loadErrorDetail && (
                  <p className="text-[11px] text-rose-600/90 font-mono truncate">{loadErrorDetail}</p>
                )}
              </div>
              <button
                onClick={handleRetry}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* TAB 1: OVERVIEW DASHBOARD */}
          {currentTab === 'dashboard' && (
            <DashboardView
              overview={overview}
              isLoading={initialLoading}
              error={loadError}
              errorDetail={loadErrorDetail}
              onRetry={handleRetry}
              onOpenUpload={() => setUploadModalOpen(true)}
              onNavigateTab={handleTabChange}
              onFilterDepartmentAndNavigate={handleFilterDepartmentAndNavigate}
              onFilterRiskAndNavigate={handleFilterRiskAndNavigate}
              onFilterPlacementAndNavigate={handleFilterPlacementAndNavigate}
              onSelectStudentById={handleSelectStudentById}
            />
          )}

          {/* TAB 2: STUDENTS DIRECTORY */}
          {currentTab === 'students' && (
            <div className="space-y-4 max-w-7xl mx-auto animate-fade-in">
              <StudentTable
                students={students}
                total={totalStudents}
                page={page}
                limit={limit}
                totalPages={totalPages}
                search={search}
                department={department}
                riskLevel={riskLevel}
                placementStatus={placementStatus}
                sortBy={sortBy}
                sortDesc={sortDesc}
                loading={loading}
                onSearchChange={(v) => { setSearch(v); setPage(1); }}
                onDepartmentChange={(v) => { setDepartment(v); setPage(1); }}
                onRiskChange={(v) => { setRiskLevel(v); setPage(1); }}
                onPlacementChange={(v) => { setPlacementStatus(v); setPage(1); }}
                onSortChange={handleSortChange}
                onPageChange={(p) => setPage(p)}
                onSelectStudent={(s) => setSelectedStudent(s)}
                onExportCsv={handleExportCsv}
              />
            </div>
          )}

          {/* TAB 3: AT-RISK STUDENTS */}
          {currentTab === 'risk' && (
            <RiskAssessmentView
              roster={riskRoster}
              initialRiskTier={riskLevel}
              initialDepartment={department}
              onSelectStudentById={handleSelectStudentById}
              onNavigateTab={handleTabChange}
            />
          )}

          {/* TAB: BRANCH-WISE STUDENT RISK ANALYSIS */}
          {currentTab === 'branches' && (
            <BranchRiskView
              onSelectStudentById={handleSelectStudentById}
              onShowToast={(title, message, type) => addToast(type || 'info', message, title)}
            />
          )}

          {/* TAB: RISK DIMENSIONS & OVERLAP */}
          {currentTab === 'dimensions' && (
            <RiskDimensionsView
              onShowToast={(title, message, type) => addToast(type || 'info', message, title)}
            />
          )}

          {/* TAB: INTERVENTION TRACKER */}
          {currentTab === 'interventions' && (
            <InterventionTrackerView
              onSelectStudent={handleSelectStudentById}
              showToast={(title, message, type) => addToast(type || 'info', message, title)}
            />
          )}

          {/* TAB: WHAT-IF SUCCESS SCORE SIMULATOR */}
          {currentTab === 'simulator' && (
            <SimulatorView
              onSelectStudent={handleSelectStudentById}
              showToast={(title, message, type) => addToast(type || 'info', message, title)}
            />
          )}

          {/* TAB 4: STUDENT SEGMENTATION */}
          {currentTab === 'segmentation' && (
            <ClusterVisualizer
              clusters={clusters}
              totalStudents={totalStudents || overview?.total_students || 0}
              onFilterByCluster={handleFilterByCluster}
            />
          )}

          {/* TAB 5: RECOMMENDATIONS */}
          {currentTab === 'recommendations' && (
            <RecommendationsView
              aggregate={recAggregate}
              onSelectStudentById={handleSelectStudentById}
            />
          )}

          {/* TAB 6: EXECUTIVE REPORTS */}
          {currentTab === 'report' && (
            <PrintableReport
              reportData={reportData}
              onClose={() => handleTabChange('dashboard')}
            />
          )}

          {/* TAB: DATA QUALITY & FAIRNESS */}
          {currentTab === 'quality' && (
            <DataQualityView
              onShowToast={(title, message, type) => addToast(type || 'info', message, title)}
            />
          )}

          {/* TAB 7: SETTINGS & FORMULAS */}
          {currentTab === 'settings' && (
            <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-700">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-navy-950">
                      Scoring Weights &amp; Alert Threshold Configuration
                    </h3>
                    <p className="text-xs text-slate-500">
                      Configure composite success weights and institutional early warning rules
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  The platform calculates student success scores from 6 normalized dimensions (Academic CGPA 25%, Attendance 20%, LMS 15%, Coding Lab 15%, Aptitude 15%, Mock Interview 10%). You can customize these weights to align with your institution's strategic goals.
                </p>

                <div className="pt-2">
                  <button
                    onClick={() => setSettingsModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-navy-950 hover:bg-navy-900 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-2"
                  >
                    <Sliders className="w-4 h-4 text-teal-400" />
                    <span>Open Dimension Sliders &amp; Thresholds</span>
                  </button>
                </div>
              </div>

              {/* Database Lifecycle Card */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-navy-950">
                      Demo Dataset Lifecycle &amp; Reset
                    </h3>
                    <p className="text-xs text-slate-500">
                      Restore the original verified synthetic student demonstration profiles
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  If you have imported external CSV files or updated faculty counseling logs and wish to return to the clean demonstration state, you can reset the SQLite database.
                </p>

                <div className="pt-2">
                  <button
                    onClick={() => setResetConfirmOpen(true)}
                    className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs transition-colors flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4 text-rose-600" />
                    <span>Reset SQLite Database to Default</span>
                  </button>
                </div>
              </div>

              {/* Privacy Notice Card */}
              <div className="bg-navy-950 text-white rounded-2xl p-6 border border-navy-800 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-teal-400 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>100% Local Guarantee</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Smart Campus Analytics executes entirely on localhost. Zero student personal data, grades, or faculty notes are ever transmitted across external cloud networks or third-party AI APIs.
                </p>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Slide-In Student Detail Drawer */}
      <StudentDetailModal
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
        onUpdated={handleStudentUpdated}
      />

      {/* CSV/Excel Upload Modal */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={() => {
          setUploadModalOpen(false);
          handleRefreshAll();
          addToast('success', 'Dataset imported and validated successfully into SQLite.', 'Import Successful');
        }}
      />

      {/* Scoring Weights & Thresholds Configuration Modal */}
      <WeightSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onSettingsSaved={() => {
          handleRefreshAll();
          addToast('success', 'Scoring weights and alert thresholds saved.', 'Configuration Saved');
        }}
      />

      {/* Reset Confirmation Dialog */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-xs" onClick={() => setResetConfirmOpen(false)} />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 z-10 space-y-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-navy-950">Reset Database?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This action will first back up the current SQLite database to the <code className="font-mono bg-slate-100 px-1 rounded">backend/backups</code> folder, then restore the standard synthetic demo cohort. All custom uploaded files, review notes, and intervention logs will be refreshed to the default demonstration state.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setResetConfirmOpen(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResetDatabase}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                Yes, Reset Dataset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Floating Local AI Assistant Drawer */}
      <FloatingChatAssistant
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        onToggle={() => setIsAssistantOpen((prev) => !prev)}
      />

      {/* Global Toast Alerts Stack */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

    </div>
  );
};

export default App;
