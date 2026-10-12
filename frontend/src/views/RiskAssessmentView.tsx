import React, { useEffect, useState } from 'react';
import { RiskRosterData, RiskRosterItem } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import {
  AlertTriangle,
  Search,
  Eye,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const PAGE_SIZE = 200;

interface Props {
  roster: RiskRosterData | null;
  initialRiskTier?: string;
  initialDepartment?: string;
  onSelectStudentById: (id: string) => void;
  onNavigateTab: (tab: any) => void;
}

export const RiskAssessmentView: React.FC<Props> = ({
  roster,
  initialRiskTier = 'All',
  initialDepartment = 'All',
  onSelectStudentById,
  onNavigateTab
}) => {
  const [activeTab, setActiveTab] = useState<'tiers' | 'trend'>('tiers');
  const [filterTier, setFilterTier] = useState<string>(initialRiskTier);
  const [departmentFilter, setDepartmentFilter] = useState<string>(initialDepartment);
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const students: RiskRosterItem[] = roster?.items || [];
  const summary = roster?.summary || { Critical: 0, High: 0, Medium: 0, Low: 0, Minimal: 0 };
  const departments = roster?.departments && roster.departments.length > 0
    ? ['All', ...roster.departments]
    : ['All', ...Array.from(new Set(students.map((s) => s.department)))];

  // Progression analysis
  const studentsWithHistory = students.filter(s => s.historical_cgpa_prev !== null && s.historical_cgpa_prev !== undefined);
  const decliningStudents = studentsWithHistory.filter(s => (s.historical_cgpa_prev! - s.cgpa) > 0.1);

  const filtered = (activeTab === 'trend' ? decliningStudents : students).filter((s) => {
    if (activeTab === 'tiers' && filterTier !== 'All' && s.risk_level !== filterTier) return false;
    if (departmentFilter !== 'All' && s.department !== departmentFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        s.risk_reasons.some((r) => r.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Reset pagination whenever filters change
  const filterKey = `${activeTab}-${filterTier}-${departmentFilter}-${search}`;
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filterKey]);

  const pagedStudents = filtered.slice(0, visibleCount);

  const criticalCount = summary['Critical'] || 0;
  const highCount = summary['High'] || 0;
  const mediumCount = summary['Medium'] || 0;
  const lowCount = summary['Low'] || 0;

  const handleResetPageSize = () => {
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8 animate-fade-in">
      
      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <button
          onClick={() => { setActiveTab('tiers'); handleResetPageSize(); }}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'tiers'
              ? 'bg-navy-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Risk Priority Tiers
        </button>
        <button
          onClick={() => { setActiveTab('trend'); handleResetPageSize(); }}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'trend'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Early Warning &amp; Progression Drops (Δ)</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'trend' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-700 font-bold'}`}>
            {decliningStudents.length}
          </span>
        </button>
      </div>

      {/* Explainable Decision Support Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-navy-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-white">
              {activeTab === 'trend' ? 'Early Warning: Longitudinal Performance Decline' : 'Explainable Early Warning & Risk Support Tiers'}
            </h2>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            {activeTab === 'trend' ? (
              <>
                Highlighting students with confirmed negative academic delta between previous and current semester.
                <strong className="text-teal-300 font-semibold block mt-0.5">
                  Historical telemetry coverage: {studentsWithHistory.length.toLocaleString()} of {students.length.toLocaleString()} verified records. For records without previous terms, only current indicators are evaluated (no false progression is invented).
                </strong>
              </>
            ) : (
              <>
                The platform flags student cases based on observable risk rules (attendance &lt; 75%, remedial CGPA, downward momentum &ge; 1.0, or technical skill deficits).
                <strong className="text-teal-300 font-semibold block mt-0.5">
                  Risk indicators serve strictly as proactive human review prompts for faculty advisors, not automated final judgments.
                </strong>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="bg-navy-900/90 px-3.5 py-2 rounded-xl border border-navy-700 text-center text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">
              {activeTab === 'trend' ? 'Declining Cohort' : 'Critical Priority'}
            </span>
            <span className="text-xl font-black text-rose-400">
              {activeTab === 'trend' ? decliningStudents.length.toLocaleString() : criticalCount.toLocaleString()}
            </span>
          </div>
          <div className="bg-navy-900/90 px-3.5 py-2 rounded-xl border border-navy-700 text-center text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Action Needed</span>
            <span className="text-xl font-black text-amber-400">{(criticalCount + highCount + mediumCount).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* Tier Filter Buttons (only on tiers mode) */}
        {activeTab === 'tiers' ? (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 text-xs">
            <button
              onClick={() => setFilterTier('All')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                filterTier === 'All'
                  ? 'bg-navy-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Students ({students.length.toLocaleString()})
            </button>
            <button
              onClick={() => setFilterTier('Critical')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                filterTier === 'Critical'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              Critical ({criticalCount.toLocaleString()})
            </button>
            <button
              onClick={() => setFilterTier('High')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                filterTier === 'High'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              High ({highCount.toLocaleString()})
            </button>
            <button
              onClick={() => setFilterTier('Medium')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                filterTier === 'Medium'
                  ? 'bg-yellow-600 text-white shadow-2xs'
                  : 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100 border border-yellow-200'
              }`}
            >
              Medium ({mediumCount.toLocaleString()})
            </button>
            <button
              onClick={() => setFilterTier('Low')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                filterTier === 'Low'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200'
              }`}
            >
              Low ({lowCount.toLocaleString()})
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-600 font-semibold flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            Showing students with verified semester-over-semester score drops
          </div>
        )}

        {/* Right: Department Dropdown & Search */}
        <div className="flex items-center gap-3">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept === 'All' ? 'All Departments' : dept}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student or trigger..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
        </div>

      </div>

      {/* Flagged Cases Roster */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs">
          <span className="font-bold text-navy-950 uppercase tracking-wider text-[11px]">
            Showing {pagedStudents.length.toLocaleString()} of {filtered.length.toLocaleString()} Student Profiles
          </span>
          <span className="text-slate-400 text-[11px] hidden sm:inline">
            Click any row to open student profile dossier, mathematical breakdown &amp; counseling notes
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {pagedStudents.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-bold text-slate-700">No students matching the selected risk filters.</p>
              <p className="text-xs text-slate-400">All students in this criteria meet current institutional thresholds.</p>
            </div>
          ) : (
            pagedStudents.map((s) => (
              <div
                key={s.id}
                onClick={() => onSelectStudentById(s.id)}
                className={`p-4 sm:p-5 hover:bg-slate-50/80 cursor-pointer transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group ${
                  s.risk_level === 'Critical' ? 'bg-rose-50/20' : ''
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-navy-950 group-hover:text-teal-700 text-sm transition-colors">
                      {s.name}
                    </span>
                    <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {s.id}
                    </span>
                    <RiskBadge level={s.risk_level} size="sm" />
                    <span className="text-xs text-slate-400 font-medium">
                      &bull; {s.department} (Yr {s.year})
                    </span>
                  </div>

                  {/* Primary Trigger Reasons */}
                  <div className="space-y-1 pt-0.5">
                    {s.risk_reasons.slice(0, 3).map((r, ri) => (
                      <div key={ri} className="flex items-start gap-1.5 text-xs text-slate-600">
                        <span className="text-rose-500 font-bold shrink-0 mt-0.5">&bull;</span>
                        <span className="font-medium">{r}</span>
                      </div>
                    ))}
                    {s.risk_reasons.length > 3 && (
                      <span className="text-[11px] text-slate-400 font-medium pl-3">
                        + {s.risk_reasons.length - 3} additional rule flags
                      </span>
                    )}
                  </div>
                </div>

                {/* Score and Quick Metrics */}
                <div className="flex items-center gap-4 sm:gap-6 shrink-0 text-right w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0">
                  <div className="text-left sm:text-right text-xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">CGPA / Att.</span>
                    <span className="font-bold text-navy-950">{s.cgpa.toFixed(2)}</span>
                    <span className="text-slate-300 mx-1">/</span>
                    <span className={`font-bold ${s.attendance < 75 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {s.attendance.toFixed(1)}%
                    </span>
                  </div>

                  <div className="text-left sm:text-right text-xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Success Score</span>
                    <span className="font-extrabold text-teal-800 text-sm">{s.success_score.toFixed(1)}</span>
                    <span className="text-[10px] text-slate-400">/100</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectStudentById(s.id);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 group-hover:bg-teal-50 group-hover:text-teal-800 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Dossier</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination Footer */}
      {filtered.length > visibleCount && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setVisibleCount((v) => Math.max(PAGE_SIZE, v - PAGE_SIZE))}
              disabled={visibleCount <= PAGE_SIZE}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Previous set of students"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-semibold text-slate-700">
              Showing {Math.min(visibleCount, filtered.length).toLocaleString()} of {filtered.length.toLocaleString()}
            </span>
            <button
              onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
              title="Next set of students"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-slate-400 text-[11px]">
            Faculty can page through the full cohort; counts reflect all {students.length.toLocaleString()} active records.
          </span>
        </div>
      )}
    </div>
  );
};