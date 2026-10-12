import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BranchRiskOverviewData,
  BranchDetailData,
  AtRiskRegisterData,
  AtRiskRegisterRow,
  PriorityCounts
} from '../types';
import {
  fetchBranchRiskOverview,
  fetchBranchDetail,
  fetchAtRiskRegister,
  buildAtRiskRegisterExportUrl
} from '../services/api';
import { RiskBadge } from '../components/RiskBadge';
import {
  Building2,
  Users,
  AlertTriangle,
  Download,
  RefreshCw,
  Loader2,
  FileWarning,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Layers,
  Info,
  CheckCircle2,
  MinusCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';

interface Props {
  onSelectStudentById: (id: string) => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const PAGE_SIZE = 25;

const PRIORITY_COLORS: Record<keyof PriorityCounts, string> = {
  Critical: '#e11d48',
  High: '#f59e0b',
  Medium: '#eab308',
  Low: '#0ea5e9',
  Minimal: '#10b981'
};

const fmt = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined ? 'N/A' : Number(v).toFixed(digits);

const shortLabel = (label: string) => label.replace(/\s*\(.*\)\s*$/, '').trim();

export const BranchRiskView: React.FC<Props> = ({ onSelectStudentById, onShowToast }) => {
  const [overview, setOverview] = useState<BranchRiskOverviewData | null>(null);
  const [detail, setDetail] = useState<BranchDetailData | null>(null);
  const [register, setRegister] = useState<AtRiskRegisterData | null>(null);

  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingRegister, setLoadingRegister] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Global filters (single source of truth shared by detail + register + export)
  const [branch, setBranch] = useState<string>('All');
  const [year, setYear] = useState<number | ''>('');
  const [dimension, setDimension] = useState<string>('All');
  const [priority, setPriority] = useState<string>('All');
  const [searchInput, setSearchInput] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const [sortBy, setSortBy] = useState<string>('risk_level');
  const [sortDesc, setSortDesc] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    setError(null);
    try {
      setOverview(await fetchBranchRiskOverview());
    } catch (err) {
      setError('Unable to compute branch-wise risk analytics from the local engine.');
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const loadRegister = useCallback(async () => {
    setLoadingRegister(true);
    try {
      const data = await fetchAtRiskRegister({
        branch,
        year: year === '' ? undefined : Number(year),
        dimension,
        priority,
        search,
        sort_by: sortBy,
        sort_desc: sortDesc,
        page,
        limit: PAGE_SIZE
      });
      setRegister(data);
    } catch (err) {
      onShowToast?.('Register Unavailable', 'Could not load the at-risk student register.', 'error');
    } finally {
      setLoadingRegister(false);
    }
  }, [branch, year, dimension, priority, search, sortBy, sortDesc, page, onShowToast]);

  const loadDetail = useCallback(async (branchName: string) => {
    setLoadingDetail(true);
    try {
      setDetail(await fetchBranchDetail(branchName, year === '' ? undefined : Number(year)));
    } catch (err) {
      setDetail(null);
      onShowToast?.('Branch Detail Unavailable', `Could not load detail for ${branchName}.`, 'error');
    } finally {
      setLoadingDetail(false);
    }
  }, [year, onShowToast]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // Debounce search input into the applied filter.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    loadRegister();
  }, [loadRegister]);

  // Branch detail follows the branch filter (and year).
  useEffect(() => {
    if (branch && branch !== 'All') {
      loadDetail(branch);
    } else {
      setDetail(null);
    }
  }, [branch, year, loadDetail]);

  const handleRefresh = () => {
    loadOverview();
    loadRegister();
    if (branch !== 'All') loadDetail(branch);
    onShowToast?.('Recalculated', 'Branch risk analytics recomputed across the full cohort.', 'info');
  };

  const applyBranchFilter = (branchName: string) => {
    setBranch(branchName);
    setPage(1);
    setTimeout(() => {
      document.getElementById('at-risk-register')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDesc((d) => !d);
    } else {
      setSortBy(col);
      setSortDesc(col === 'risk_level' || col === 'severity_score');
    }
    setPage(1);
  };

  const resetFilters = () => {
    setBranch('All');
    setYear('');
    setDimension('All');
    setPriority('All');
    setSearchInput('');
    setSearch('');
    setPage(1);
    onShowToast?.('Filters Reset', 'All branch, year, dimension, and priority filters cleared.', 'success');
  };

  const activeChips = useMemo(() => {
    const chips: { label: string; clear: () => void }[] = [];
    if (branch !== 'All') chips.push({ label: `Branch: ${branch}`, clear: () => setBranch('All') });
    if (year !== '') chips.push({ label: `Year: ${year}`, clear: () => setYear('') });
    if (dimension !== 'All') chips.push({ label: `Dimension: ${dimension}`, clear: () => setDimension('All') });
    if (priority !== 'All') chips.push({ label: `Priority: ${priority}`, clear: () => setPriority('All') });
    if (search) chips.push({ label: `Search: "${search}"`, clear: () => { setSearchInput(''); setSearch(''); } });
    return chips;
  }, [branch, year, dimension, priority, search]);

  if (loadingOverview && !overview) {
    return (
      <div className="p-12 text-center text-slate-500 space-y-3">
        <Loader2 className="w-8 h-8 text-teal-500 mx-auto animate-spin" />
        <p className="text-sm font-semibold">Computing branch-wise risk analytics from the active dataset...</p>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="max-w-lg mx-auto mt-12 bg-white rounded-2xl border border-rose-200 shadow-xs p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <FileWarning className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-navy-950">Branch Risk Analytics Unavailable</h3>
        <p className="text-xs text-slate-600 leading-relaxed">{error}</p>
        <button
          onClick={loadOverview}
          className="px-4 py-2 rounded-xl bg-navy-950 hover:bg-navy-900 text-white text-xs font-bold transition-colors inline-flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  }

  const overall = overview.overall;
  const chartData = overview.branches.map((b) => ({
    branch: b.branch,
    risk_percentage: b.risk_percentage,
    unique_at_risk_students: b.unique_at_risk_students,
    total_students: b.total_students
  }));

  const exportParams = {
    branch,
    year: year === '' ? undefined : Number(year),
    dimension,
    priority,
    search,
    sort_by: sortBy,
    sort_desc: sortDesc
  };

  const kpis = [
    {
      title: 'Branches',
      value: overview.distinct_branches.toLocaleString(),
      subtitle: 'Distinct branches in dataset',
      icon: <Building2 className="w-5 h-5" />,
      accent: 'bg-blue-50/80 text-blue-600 border-blue-100',
      bar: 'bg-blue-600'
    },
    {
      title: 'Students Evaluated',
      value: overview.total_students.toLocaleString(),
      subtitle: 'Records analyzed',
      icon: <Users className="w-5 h-5" />,
      accent: 'bg-slate-100 text-slate-600 border-slate-200',
      bar: 'bg-slate-400'
    },
    {
      title: 'Unique Students At Risk',
      value: overall.unique_at_risk_students.toLocaleString(),
      subtitle: `${overall.unique_at_risk_percentage}% carry ≥ 1 flag (deduplicated)`,
      icon: <AlertTriangle className="w-5 h-5" />,
      accent: 'bg-amber-50/80 text-amber-600 border-amber-100',
      bar: 'bg-amber-500'
    },
    {
      title: 'Needs Support (C/H/M)',
      value: overall.at_risk_students.toLocaleString(),
      subtitle: `${overall.risk_percentage}% priority cohort`,
      icon: <Layers className="w-5 h-5" />,
      accent: 'bg-rose-50/80 text-rose-600 border-rose-100',
      bar: 'bg-rose-500'
    }
  ];

  const renderPriorityBar = (counts: PriorityCounts, total: number) => {
    const order: (keyof PriorityCounts)[] = ['Critical', 'High', 'Medium', 'Low', 'Minimal'];
    return (
      <div className="space-y-1.5">
        <div className="h-2.5 w-full rounded-full bg-slate-200/70 overflow-hidden flex">
          {order.map((k) => (
            <div
              key={k}
              className="h-full"
              style={{ width: `${total ? (counts[k] / total) * 100 : 0}%`, backgroundColor: PRIORITY_COLORS[k] }}
              title={`${k}: ${counts[k]}`}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">
          {order.map((k) => (
            <span key={k} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[k] }} />
              {counts[k]} {k}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8 animate-fade-in">

      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-slate-900 text-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border border-navy-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30">
              <Building2 className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-white">Branch-wise Student Risk Analysis</h2>
          </div>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            Every figure is computed live from the <strong className="text-teal-300">active dataset</strong> (branch = department column).
            "Unique students at risk" counts distinct students and is never the sum of overlapping risk dimensions.
            Dimensions without source data are reported as N/A.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => window.open('/api/analytics/export/branch-summaries.csv', '_blank')}
            className="px-3 py-2 rounded-xl border border-navy-700 hover:bg-navy-800 text-slate-200 font-semibold text-xs transition-colors inline-flex items-center gap-2"
            title="Export per-branch summary as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Branch Summaries CSV
          </button>
          <button
            onClick={() => window.open(buildAtRiskRegisterExportUrl(exportParams), '_blank')}
            className="px-3 py-2 rounded-xl border border-navy-700 hover:bg-navy-800 text-slate-200 font-semibold text-xs transition-colors inline-flex items-center gap-2"
            title="Export the currently filtered at-risk register as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Filtered Register CSV
          </button>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-navy-950 font-bold text-xs transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recompute
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((card) => (
          <div
            key={card.title}
            className="group relative bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden"
          >
            <div className={`absolute top-0 left-0 right-0 h-1 ${card.bar} opacity-80 group-hover:opacity-100 transition-opacity`} />
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{card.title}</p>
                <div className="text-2xl sm:text-3xl font-black text-navy-950 tracking-tight">{card.value}</div>
                <p className="text-xs text-slate-500 font-medium pt-0.5">{card.subtitle}</p>
              </div>
              <div className={`p-3 rounded-xl border ${card.accent} shrink-0 transition-transform group-hover:scale-105`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Branch Risk Chart */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy-950">Risk Share by Branch</h3>
            <p className="text-[11px] text-slate-500">
              Percentage of each branch in the Critical / High / Medium cohort. Click a bar to drill into that branch.
            </p>
          </div>
        </div>
        {chartData.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold">No branches found in the active dataset.</p>
          </div>
        ) : (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <XAxis
                  dataKey="branch"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={64}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  formatter={(value: number, _name: string, props: any) => [
                    `${value}% (${props?.payload?.unique_at_risk_students} of ${props?.payload?.total_students})`,
                    'At risk'
                  ]}
                  contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}
                />
                <Bar
                  dataKey="risk_percentage"
                  radius={[6, 6, 0, 0]}
                  cursor="pointer"
                  onClick={(d: any) => d && d.branch && applyBranchFilter(d.branch)}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.branch}
                      fill={branch === entry.branch ? '#0d9488' : '#f43f5e'}
                      fillOpacity={branch === entry.branch ? 1 : 0.82}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Branch Comparison Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs">
          <span className="font-bold text-navy-950 uppercase tracking-wider text-[11px] flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-teal-600" />
            Branch Comparison ({overview.branches.length})
          </span>
          <span className="text-slate-400 text-[11px] hidden sm:inline">Click any row to drill down and filter the register</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-slate-50/60 text-slate-500 uppercase text-[10px] tracking-wider">
                <th className="text-left px-4 py-2.5 font-bold">Branch</th>
                <th className="text-right px-3 py-2.5 font-bold">Students</th>
                <th className="text-right px-3 py-2.5 font-bold">Unique At-Risk</th>
                <th className="text-right px-3 py-2.5 font-bold">Risk %</th>
                <th className="text-right px-3 py-2.5 font-bold">Crit</th>
                <th className="text-right px-3 py-2.5 font-bold">High</th>
                <th className="text-right px-3 py-2.5 font-bold">Med</th>
                <th className="text-right px-3 py-2.5 font-bold">Low</th>
                <th className="text-right px-3 py-2.5 font-bold">Avg CGPA</th>
                <th className="text-right px-3 py-2.5 font-bold">Avg Att.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {overview.branches.map((b) => (
                <tr
                  key={b.branch}
                  onClick={() => applyBranchFilter(b.branch)}
                  className={`cursor-pointer transition-colors hover:bg-teal-50/50 ${
                    branch === b.branch ? 'bg-teal-50/70' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-bold text-navy-950">{b.branch}</td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-700">{b.total_students.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right font-semibold text-amber-700">{b.unique_at_risk_students.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right">
                    <span className="font-black text-rose-600">{b.risk_percentage}%</span>
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-rose-700">{b.critical_count}</td>
                  <td className="px-3 py-3 text-right font-bold text-amber-600">{b.high_count}</td>
                  <td className="px-3 py-3 text-right font-bold text-yellow-600">{b.medium_count}</td>
                  <td className="px-3 py-3 text-right font-bold text-sky-600">{b.low_count}</td>
                  <td className="px-3 py-3 text-right text-slate-700">{b.avg_cgpa.toFixed(2)}</td>
                  <td className="px-3 py-3 text-right text-slate-700">{b.avg_attendance.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Branch Detail Drill-down */}
      {branch !== 'All' && (
        <div className="bg-white rounded-2xl border border-teal-200/80 shadow-xs p-5 space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-700">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-navy-950">{branch} — Branch Detail</h3>
                <p className="text-[11px] text-slate-500">
                  {year !== '' ? `Academic Year ${year} ` : 'All years '}· {detail?.total_students?.toLocaleString() ?? '—'} students
                </p>
              </div>
            </div>
            <button
              onClick={() => setBranch('All')}
              className="self-start px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 inline-flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" /> Close detail
            </button>
          </div>

          {loadingDetail || !detail ? (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <Loader2 className="w-6 h-6 text-teal-500 mx-auto animate-spin" />
              <p className="text-xs font-semibold">Loading branch detail...</p>
            </div>
          ) : detail.total_students === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <MinusCircle className="w-7 h-7 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold">No students match this branch/year selection.</p>
            </div>
          ) : (
            <>
              {/* Branch summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Students</span>
                  <div className="text-xl font-black text-navy-950">{detail.total_students.toLocaleString()}</div>
                </div>
                <div className="bg-amber-50/60 rounded-xl border border-amber-200 p-3">
                  <span className="text-[10px] uppercase font-bold text-amber-600">Unique At-Risk</span>
                  <div className="text-xl font-black text-amber-700">{detail.unique_at_risk_students.toLocaleString()}</div>
                  <span className="text-[10px] text-amber-700/80">{detail.unique_at_risk_percentage}% of branch</span>
                </div>
                <div className="bg-rose-50/60 rounded-xl border border-rose-200 p-3">
                  <span className="text-[10px] uppercase font-bold text-rose-600">Needs Support</span>
                  <div className="text-xl font-black text-rose-700">{detail.at_risk_students.toLocaleString()}</div>
                  <span className="text-[10px] text-rose-700/80">Critical / High / Medium</span>
                </div>
                <div className="bg-teal-50/60 rounded-xl border border-teal-200 p-3">
                  <span className="text-[10px] uppercase font-bold text-teal-700">Risk %</span>
                  <div className="text-xl font-black text-teal-800">{detail.risk_percentage}%</div>
                  <span className="text-[10px] text-teal-700/80">of branch cohort</span>
                </div>
              </div>

              {/* Priority distribution */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Risk Priority Distribution</h4>
                {renderPriorityBar(detail.priority_counts, detail.total_students)}
              </div>

              {/* Dimension breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Risk Dimension Breakdown <span className="text-slate-400 normal-case font-medium">(% of branch total)</span>
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border-separate border-spacing-0.5">
                    <thead>
                      <tr className="text-slate-500 uppercase text-[10px]">
                        <th className="text-left px-2 py-2 font-bold">Dimension</th>
                        <th className="text-right px-2 py-2 font-bold">High</th>
                        <th className="text-right px-2 py-2 font-bold">Watch</th>
                        <th className="text-right px-2 py-2 font-bold">Affected</th>
                        <th className="text-right px-2 py-2 font-bold">% of Branch</th>
                        <th className="text-right px-2 py-2 font-bold">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.dimensions.map((d) => {
                        const isNa = d.available_count === 0;
                        return (
                          <tr
                            key={d.dimension}
                            onClick={() => !isNa && d.affected_count > 0 && (setDimension(d.dimension), setPage(1))}
                            className={`${!isNa && d.affected_count > 0 ? 'cursor-pointer hover:bg-teal-50/60' : ''} ${
                              dimension === d.dimension ? 'bg-teal-50/70' : ''
                            }`}
                          >
                            <td className="px-2 py-2 rounded-l font-semibold text-slate-700">{d.label}</td>
                            <td className="px-2 py-2 text-right font-bold text-rose-600">{d.high_count || '·'}</td>
                            <td className="px-2 py-2 text-right font-bold text-amber-600">{d.watch_count || '·'}</td>
                            <td className="px-2 py-2 text-right font-semibold text-slate-700">{d.affected_count || '·'}</td>
                            <td className="px-2 py-2 text-right font-black text-navy-950">
                              {isNa ? <span className="text-slate-400 font-semibold">N/A</span> : `${d.affected_percentage_of_branch}%`}
                            </td>
                            <td className="px-2 py-2 text-right text-[10px] text-slate-400 rounded-r">
                              {isNa ? 'not supplied' : `${d.available_count.toLocaleString()} avail`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-slate-400 italic">
                  Percentages use the branch total as denominator. Click a row to filter the register by that dimension.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Most common dimensions */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Most Common Risk Dimensions</h4>
                  {detail.most_common_dimensions.length === 0 ? (
                    <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> No flagged dimensions in this branch.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {detail.most_common_dimensions.map((d, i) => (
                        <button
                          key={d.dimension}
                          onClick={() => { setDimension(d.dimension); setPage(1); }}
                          className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/40 transition-colors"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700">
                              {i + 1}. {d.label}
                            </span>
                            <span className="font-black text-rose-600">{d.affected_count} ({d.affected_percentage_of_branch}%)</span>
                          </div>
                          <div className="mt-1.5 h-1.5 rounded-full bg-slate-200/70 overflow-hidden">
                            <div
                              className="h-full bg-rose-500"
                              style={{ width: `${Math.min(d.affected_percentage_of_branch, 100)}%` }}
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Support summary */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Recommended Branch-level Support</h4>
                  {detail.support_summary.length === 0 ? (
                    <p className="text-xs text-slate-500">No support actions required for flagged students in this branch.</p>
                  ) : (
                    <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                      {detail.support_summary.slice(0, 8).map((s, i) => (
                        <div key={i} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-800">{s.category}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              s.urgency === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {s.urgency}
                            </span>
                          </div>
                          <p className="text-slate-600 leading-relaxed">{s.recommended_action}</p>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                            <span>{s.assigned_role}</span>
                            <span className="font-bold text-teal-700">{s.impacted_count} students</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Global Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
            <Info className="w-3.5 h-3.5 text-teal-600" />
            Filters
          </div>
          <select
            value={branch}
            onChange={(e) => { setBranch(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="All">All Branches</option>
            {overview.branches_available.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => { setYear(e.target.value === '' ? '' : Number(e.target.value)); setPage(1); }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="">All Years</option>
            {overview.years_available.map((y) => (
              <option key={y} value={y}>Year {y}</option>
            ))}
          </select>
          <select
            value={dimension}
            onChange={(e) => { setDimension(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="All">All Dimensions</option>
            {(register?.filter_options.dimensions || []).map((d) => (
              <option key={d.dimension} value={d.dimension}>{d.label}</option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => { setPriority(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="All">All Priorities</option>
            {['Critical', 'High', 'Medium', 'Low', 'Minimal'].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search student name or ID..."
              className="w-full pl-8 pr-8 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500">Active:</span>
            {activeChips.map((c, i) => (
              <button
                key={i}
                onClick={() => { c.clear(); setPage(1); }}
                className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 inline-flex items-center gap-1"
              >
                {c.label}
                <X className="w-3 h-3" />
              </button>
            ))}
            <button
              onClick={resetFilters}
              className="ml-auto text-[11px] font-bold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1"
            >
              Reset all
            </button>
          </div>
        )}
      </div>

      {/* At-Risk Register */}
      <div id="at-risk-register" className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="font-bold text-navy-950 uppercase tracking-wider text-[11px] flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            At-Risk Student Register
            {register && (
              <span className="text-slate-400 font-semibold normal-case">
                {register.summary.at_risk_students.toLocaleString()} needing support · {register.summary.unique_flagged_students.toLocaleString()} flagged · {register.total.toLocaleString()} matched
              </span>
            )}
          </span>
          <span className="text-slate-400 text-[11px]">Click a row to open the student dossier with risk reasons &amp; support plan</span>
        </div>

        {loadingRegister && !register ? (
          <div className="p-10 text-center text-slate-500 space-y-2">
            <Loader2 className="w-6 h-6 text-teal-500 mx-auto animate-spin" />
            <p className="text-xs font-semibold">Loading register...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-slate-50/60 text-slate-500 uppercase text-[10px] tracking-wider">
                    {([
                      ['id', 'ID'],
                      ['name', 'Student'],
                      ['branch', 'Branch'],
                      ['year', 'Yr'],
                      ['cgpa', 'CGPA'],
                      ['attendance', 'Att.'],
                      ['backlogs', 'Backlogs'],
                      ['lms_engagement', 'LMS'],
                      ['coding_score', 'Coding'],
                      ['aptitude_score', 'Apt.'],
                      ['mock_interview_score', 'Mock'],
                    ] as [string, string][]).map(([col, label]) => (
                      <th key={col} className="text-left px-3 py-2.5 font-bold">
                        <button className="inline-flex items-center gap-1 hover:text-navy-900" onClick={() => handleSort(col)}>
                          {label}
                          {sortBy === col ? (
                            sortDesc ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                          ) : null}
                        </button>
                      </th>
                    ))}
                    <th className="text-left px-3 py-2.5 font-bold">
                      <button className="inline-flex items-center gap-1 hover:text-navy-900" onClick={() => handleSort('risk_level')}>
                        Priority
                        {sortBy === 'risk_level' ? (sortDesc ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />) : null}
                      </button>
                    </th>
                    <th className="text-left px-3 py-2.5 font-bold">Triggers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {register && register.items.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="p-10 text-center text-slate-500">
                        <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700">No students match the selected filters.</p>
                      </td>
                    </tr>
                  ) : (
                    register?.items.map((s: AtRiskRegisterRow) => {
                      const triggers = s.triggering_flags || [];
                      return (
                        <tr
                          key={s.id}
                          onClick={() => onSelectStudentById(s.id)}
                          className={`cursor-pointer transition-colors hover:bg-slate-50/80 ${
                            s.risk_level === 'Critical' ? 'bg-rose-50/30' : ''
                          }`}
                        >
                          <td className="px-3 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">{s.id}</td>
                          <td className="px-3 py-3 font-bold text-navy-950 whitespace-nowrap">{s.name}</td>
                          <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{s.branch}</td>
                          <td className="px-3 py-3 text-slate-600">{s.year}</td>
                          <td className="px-3 py-3 text-slate-700 font-semibold">{fmt(s.cgpa, 2)}</td>
                          <td className={`px-3 py-3 font-semibold ${s.attendance !== null && (s.attendance as number) < 75 ? 'text-rose-600' : 'text-slate-700'}`}>
                            {s.attendance === null || s.attendance === undefined ? 'N/A' : `${Number(s.attendance).toFixed(1)}%`}
                          </td>
                          <td className="px-3 py-3 text-slate-700">{s.backlogs === null || s.backlogs === undefined ? 'N/A' : s.backlogs}</td>
                          <td className="px-3 py-3 text-slate-700">{fmt(s.lms_engagement, 1)}</td>
                          <td className="px-3 py-3 text-slate-700">{fmt(s.coding_score, 1)}</td>
                          <td className="px-3 py-3 text-slate-700">{fmt(s.aptitude_score, 1)}</td>
                          <td className="px-3 py-3 text-slate-700">{fmt(s.mock_interview_score, 1)}</td>
                          <td className="px-3 py-3"><RiskBadge level={s.risk_level as any} size="sm" /></td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1 max-w-[280px]">
                              {triggers.slice(0, 2).map((f, i) => (
                                <span
                                  key={i}
                                  title={`${f.reason} | Rule: ${f.threshold}`}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                    f.severity === 'high'
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {shortLabel(f.label)}: {f.display_value}
                                </span>
                              ))}
                              {triggers.length > 2 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  +{triggers.length - 2}
                                </span>
                              )}
                              {triggers.length === 0 && (
                                <span className="text-[10px] text-slate-400">Reviews within standards</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {register && register.total > register.limit && (
              <div className="p-4 bg-white border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">
                  Page {register.page} of {register.total_pages} · {register.total.toLocaleString()} students
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(register.total_pages, p + 1))}
                    disabled={page >= register.total_pages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Transparency note */}
      <div className="p-4 rounded-2xl bg-navy-950 text-slate-300 text-[11px] leading-relaxed flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
        <span>
          Counts shown reflect the <strong className="text-white">active dataset</strong> and refresh after every CSV upload.
          "Unique students at risk" uses distinct student IDs — overlapping dimension flags are never summed and presented as unique.
          {overview.total_students > 0 && overview.branches.some((b) => /demo|sample|test/i.test(b.branch)) && (
            <> This dataset is labeled as synthetic demonstration data.</>
          )}{' '}
          Risk flags are proactive review prompts, <strong className="text-white">not proof of failure</strong>.
        </span>
      </div>

    </div>
  );
};

export default BranchRiskView;
