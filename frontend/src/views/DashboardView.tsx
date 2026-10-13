import React from 'react';
import { DashboardOverview } from '../types';
import { NavTab } from '../components/Sidebar';
import { MetricCard } from '../components/MetricCard';
import { RiskBadge } from '../components/RiskBadge';
import {
  Users,
  GraduationCap,
  Clock,
  Target,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Briefcase,
  Lightbulb,
  Building2,
  PieChart as PieIcon,
  BarChart3,
  WifiOff,
  RefreshCw,
  Upload
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface Props {
  overview: DashboardOverview | null;
  isLoading?: boolean;
  error?: string | null;
  errorDetail?: string | null;
  onRetry?: () => void;
  onOpenUpload?: () => void;
  onNavigateTab: (tab: NavTab) => void;
  onFilterDepartmentAndNavigate: (department: string) => void;
  onFilterRiskAndNavigate: (riskLevel: string) => void;
  onFilterPlacementAndNavigate: (placementStatus: string) => void;
  onSelectStudentById: (id: string) => void;
}

export const DashboardView: React.FC<Props> = ({
  overview,
  isLoading = false,
  error = null,
  errorDetail = null,
  onRetry,
  onOpenUpload,
  onNavigateTab,
  onFilterDepartmentAndNavigate,
  onFilterRiskAndNavigate,
  onFilterPlacementAndNavigate,
  onSelectStudentById
}) => {
  // API/network failure — never present this as an endless spinner or a fake "0"
  if (!overview && (error || !isLoading)) {
    return (
      <div className="max-w-2xl mx-auto mt-10 bg-white rounded-2xl border border-rose-200 shadow-sm p-8 text-center space-y-4 animate-fade-in">
        <div className="inline-flex p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600">
          <WifiOff className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-black text-navy-950">Unable to load campus analytics</h3>
        <p className="text-sm text-slate-600">
          {error || 'The analytics service returned no data, so no metrics can be shown.'}
        </p>
        {errorDetail && (
          <p className="text-[11px] font-mono text-slate-500 break-all bg-slate-50 rounded-lg p-2.5 border border-slate-200">
            {errorDetail}
          </p>
        )}
        <p className="text-xs text-slate-500">
          {typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname) ? (
            <>The backend service may be waking up from sleep or warming up its cache. Click <strong className="text-slate-700">Retry Connection</strong> below to reconnect.</>
          ) : (
            <>
              Verify the backend API server is running at{' '}
              <code className="font-mono bg-slate-100 px-1 rounded">http://127.0.0.1:8000</code> (launch{' '}
              <code className="font-mono bg-slate-100 px-1 rounded">start_backend.bat</code>), then retry.
            </>
          )}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy-950 hover:bg-navy-900 text-white font-bold text-xs shadow-xs transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-teal-400" />
            <span>Retry Connection</span>
          </button>
        )}
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="p-12 text-center text-slate-500 space-y-3">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-teal-500 border-t-transparent"></div>
        <p className="text-sm font-semibold">Loading institutional campus telemetry...</p>
      </div>
    );
  }

  // Genuinely empty dataset — explain it, offer the import action, never fabricate counts
  if (overview.total_students === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-10 bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-4 animate-fade-in">
        <div className="inline-flex p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600">
          <Upload className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-black text-navy-950">No student data available</h3>
        <p className="text-sm text-slate-600">
          The database is reachable but contains 0 student records. Import a CSV/Excel dataset to populate the
          dashboard with real metrics.
        </p>
        {onOpenUpload && (
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy-950 hover:bg-navy-900 text-white font-bold text-xs shadow-xs transition-colors"
          >
            <Upload className="w-4 h-4 text-teal-400" />
            <span>Import Student Dataset</span>
          </button>
        )}
      </div>
    );
  }

  // Consistent curated palette
  const RISK_COLORS: Record<string, string> = {
    Critical: '#f43f5e',
    High: '#f59e0b',
    Medium: '#eab308',
    Low: '#0284c7',
    Minimal: '#10b981'
  };

  const PLACEMENT_COLORS: Record<string, string> = {
    Placed: '#10b981',
    Ready: '#0284c7',
    'In Progress': '#f59e0b',
    'Needs Training': '#64748b'
  };

  const riskPieData = Object.entries(overview.risk_distribution).map(([key, value]) => ({
    name: key,
    value: value
  }));

  const placementBarData = Object.entries(overview.placement_distribution).map(([key, value]) => ({
    name: key,
    value: value
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8 animate-fade-in">
      
      {/* 5 Core Clean KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* KPI 1: Total Students */}
        <MetricCard
          title="Total Students"
          value={overview.total_students}
          subtitle={`${overview.distinct_departments ?? overview.department_stats.length} departments • ${
            overview.distinct_years ?? Object.keys(overview.year_distribution).length
          } year levels`}
          icon={<Users className="w-5 h-5 text-blue-600" />}
          accentColor="blue"
          onClick={() => onNavigateTab('students')}
        />

        {/* KPI 2: Mean CGPA */}
        <MetricCard
          title="Average CGPA"
          value={overview.average_cgpa.toFixed(2)}
          subtitle="Cohort scale 0.0 - 10.0"
          icon={<GraduationCap className="w-5 h-5 text-indigo-600" />}
          trend={{
            text: overview.average_cgpa >= 7.0 ? 'Benchmark Met (≥ 7.0)' : 'Below Target (< 7.0)',
            type: overview.average_cgpa >= 7.0 ? 'positive' : 'negative'
          }}
          accentColor="indigo"
          onClick={() => onNavigateTab('students')}
        />

        {/* KPI 3: Average Attendance */}
        <MetricCard
          title="Avg Attendance"
          value={`${overview.average_attendance.toFixed(1)}%`}
          subtitle="Statutory target: 75%"
          icon={<Clock className="w-5 h-5 text-teal-600" />}
          trend={{
            text: overview.average_attendance >= 75 ? 'Compliant (≥ 75%)' : 'Deficit Alert (< 75%)',
            type: overview.average_attendance >= 75 ? 'positive' : 'negative'
          }}
          accentColor="teal"
          onClick={() => onNavigateTab('students')}
        />

        {/* KPI 4: Placement Readiness */}
        <MetricCard
          title="Placement Ready"
          value={`${overview.placement_ready_percentage.toFixed(1)}%`}
          subtitle="Corporate hiring pipeline"
          icon={<Target className="w-5 h-5 text-blue-600" />}
          trend={{
            text: 'Placed or Ready',
            type: 'positive'
          }}
          accentColor="blue"
          onClick={() => onFilterPlacementAndNavigate('Ready')}
        />

        {/* KPI 5: Students Requiring Support */}
        <MetricCard
          title="Require Support"
          value={overview.students_requiring_support}
          subtitle={`${overview.unique_flagged_students ?? overview.students_requiring_support} multi-dimension flags`}
          icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
          trend={{
            text: `${overview.risk_distribution.Critical} Critical Tiers`,
            type: overview.risk_distribution.Critical > 0 ? 'urgent' : 'neutral'
          }}
          accentColor="rose"
          onClick={() => onNavigateTab('risk')}
        />

      </div>

      {/* 2–3 Essential Interactive Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart 1: Department Performance (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-extrabold text-navy-950">
                  Department Academic &amp; Attendance Performance
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any department bar to view its filtered student roster
              </p>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 self-start sm:self-auto">
              {overview.department_stats.length} Departments
            </span>
          </div>

          <div className="h-72 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={overview.department_stats.map((d) => ({
                  name: d.department.replace(' Engineering', ''),
                  fullName: d.department,
                  Attendance: Number(d.avg_attendance.toFixed(1)),
                  CGPA_x10: Number((d.avg_cgpa * 10).toFixed(1)),
                  actualCGPA: Number(d.avg_cgpa.toFixed(2)),
                  atRisk: d.at_risk_students
                }))}
                margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const dept = e.activePayload[0].payload.fullName;
                    onFilterDepartmentAndNavigate(dept);
                  }
                }}
              >
                <XAxis
                  dataKey="name"
                  fontSize={11}
                  stroke="#94a3b8"
                  interval={0}
                  angle={-10}
                  textAnchor="end"
                />
                <YAxis domain={[0, 100]} fontSize={11} stroke="#94a3b8" />
                <Tooltip
                  cursor={{ fill: 'rgba(20, 184, 166, 0.08)' }}
                  contentStyle={{
                    backgroundColor: '#0b1d30',
                    borderColor: '#1e3e62',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                  }}
                  formatter={(value: any, name: string, item: any) => {
                    if (name === 'CGPA_x10') {
                      return [`${item.payload.actualCGPA} / 10.0`, 'Mean Academic CGPA'];
                    }
                    return [`${value}%`, 'Class Attendance'];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar
                  dataKey="Attendance"
                  fill="#0d9488"
                  radius={[4, 4, 0, 0]}
                  name="Attendance %"
                  className="cursor-pointer hover:opacity-85 transition-opacity"
                />
                <Bar
                  dataKey="CGPA_x10"
                  fill="#0284c7"
                  radius={[4, 4, 0, 0]}
                  name="CGPA (Scaled x10)"
                  className="cursor-pointer hover:opacity-85 transition-opacity"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-slate-400 text-center italic">
            Tip: Interactive bars — click to open student directory pre-filtered by department.
          </p>
        </div>

        {/* Chart 2: Student Risk Distribution Donut (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-rose-500" />
                <h3 className="text-sm font-extrabold text-navy-950">
                  Student Risk Tier Distribution
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cohort segmented by early-warning priority
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('risk')}
              className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 transition-colors"
            >
              View Tiers <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Interactive Donut Chart */}
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  className="cursor-pointer"
                  onClick={(entry) => onFilterRiskAndNavigate(entry.name)}
                >
                  {riskPieData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={RISK_COLORS[entry.name] || '#94a3b8'}
                      className="hover:opacity-80 transition-opacity"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0b1d30',
                    borderColor: '#1e3e62',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                  formatter={(val: any, name: string) => [`${val} Students`, `${name} Priority`]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive Clickable Legend Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
            {riskPieData.map((r) => (
              <button
                key={r.name}
                onClick={() => onFilterRiskAndNavigate(r.name)}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-xs transition-colors text-left"
                title={`Filter At-Risk Students by ${r.name}`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: RISK_COLORS[r.name] }}
                  />
                  <span className="font-semibold text-slate-700 truncate">{r.name}</span>
                </div>
                <span className="font-bold text-navy-950 ml-1.5">{r.value}</span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Chart 3 & Placement Pipeline Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Placement Pipeline Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-extrabold text-navy-950">
                  Placement Pipeline Readiness
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Readiness categories for campus hiring drives
              </p>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              {overview.placement_ready_percentage.toFixed(0)}% Ready
            </span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={placementBarData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 25, bottom: 5 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    onFilterPlacementAndNavigate(e.activePayload[0].payload.name);
                  }
                }}
              >
                <XAxis type="number" fontSize={11} stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" width={90} fontSize={11} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0b1d30',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px'
                  }}
                  formatter={(val: any) => [`${val} Students`, 'Candidate Count']}
                />
                <Bar
                  dataKey="value"
                  fill="#0284c7"
                  radius={[0, 4, 4, 0]}
                  name="Students"
                  className="cursor-pointer hover:opacity-85"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center justify-between">
            <span>Click any tier to filter candidates in directory.</span>
            <button
              onClick={() => onFilterPlacementAndNavigate('Needs Training')}
              className="text-teal-700 font-bold hover:underline shrink-0"
            >
              Needs Training ({overview.placement_distribution['Needs Training'] || 0}) &rarr;
            </button>
          </div>
        </div>

        {/* Actionable Insights & Recent Activity (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-extrabold text-navy-950">
                  Automated Institutional Action Signals
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Synthesized dynamically from active cohort metrics
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('recommendations')}
              className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 transition-colors"
            >
              All Recommendations <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3 Compact Action Signal Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {overview.actionable_insights.slice(0, 3).map((ins, i) => (
              <div
                key={i}
                className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex flex-col justify-between space-y-2 hover:bg-slate-100/80 transition-colors"
              >
                <div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      ins.type === 'urgent'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : ins.type === 'warning'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : ins.type === 'success'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {ins.title}
                  </span>
                  <p className="text-slate-700 text-xs font-medium mt-2 leading-relaxed line-clamp-3">
                    {ins.message}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (ins.action.toLowerCase().includes('risk') || ins.action.toLowerCase().includes('attendance')) {
                      onNavigateTab('risk');
                    } else if (ins.action.toLowerCase().includes('placement') || ins.action.toLowerCase().includes('training')) {
                      onNavigateTab('recommendations');
                    } else {
                      onNavigateTab('students');
                    }
                  }}
                  className="pt-2 border-t border-slate-200/70 text-[11px] text-teal-700 font-bold hover:text-teal-900 flex items-center gap-1 text-left"
                >
                  <ArrowRight className="w-3 h-3 text-teal-600 shrink-0" />
                  <span className="truncate">{ins.action}</span>
                </button>
              </div>
            ))}
          </div>

          {/* Recent Interventions summary footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              <strong>{overview.recent_interventions.length}</strong> faculty intervention cases recorded in system.
            </span>
            <button
              onClick={() => onNavigateTab('recommendations')}
              className="text-teal-700 font-bold hover:underline flex items-center gap-1"
            >
              Open Faculty Workflow &rarr;
            </button>
          </div>
        </div>

      </div>

      {/* Department Analytics Table (dynamic, size-normalized) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-extrabold text-navy-950">
                Department Analytics
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Enrollment share, averages, and normalized at-risk percentages. Click a row to open its roster.
            </p>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
            {overview.department_stats.length} Departments
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <th className="py-2 pr-3 font-bold">Department</th>
                <th className="py-2 px-3 font-bold text-right">Students</th>
                <th className="py-2 px-3 font-bold text-right">Enrollment</th>
                <th className="py-2 px-3 font-bold text-right">Avg CGPA</th>
                <th className="py-2 px-3 font-bold text-right">Avg Attendance</th>
                <th className="py-2 px-3 font-bold text-right">At-Risk</th>
                <th className="py-2 pl-3 font-bold text-right">Ready</th>
              </tr>
            </thead>
            <tbody>
              {overview.department_stats.map((d) => (
                <tr
                  key={d.department}
                  onClick={() => onFilterDepartmentAndNavigate(d.department)}
                  className="border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer transition-colors"
                  title={`View ${d.department} roster`}
                >
                  <td className="py-2.5 pr-3 font-semibold text-slate-700">{d.department}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-navy-950">{d.student_count.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600">
                    {d.enrollment_percentage != null ? `${d.enrollment_percentage}%` : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600">{d.avg_cgpa.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600">{d.avg_attendance.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-rose-700">
                      {d.at_risk_students.toLocaleString()}
                      <span className="text-[10px] font-bold text-rose-500">
                        ({d.risk_percentage}%)
                      </span>
                    </span>
                  </td>
                  <td className="py-2.5 pl-3 text-right text-slate-600">
                    {d.readiness_ready_percentage != null ? `${d.readiness_ready_percentage}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
