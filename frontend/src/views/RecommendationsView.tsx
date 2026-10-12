import React, { useState } from 'react';
import { RecommendationAggregate, RecommendationPlaybook } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import {
  Sparkles,
  Clock,
  CheckCircle2,
  Users,
  Search,
  BookOpen,
  Code,
  Brain,
  MessageSquare,
  UserCheck,
  Loader2
} from 'lucide-react';

interface Props {
  aggregate: RecommendationAggregate | null;
  onSelectStudentById: (id: string) => void;
}

export const RecommendationsView: React.FC<Props> = ({ aggregate, onSelectStudentById }) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activeUrgency, setActiveUrgency] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'playbooks' | 'workflow'>('playbooks');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const playbooks: RecommendationPlaybook[] = aggregate?.playbooks || [];
  const workflowTotal = aggregate?.workflow.total || 0;
  const pendingCount = aggregate?.workflow.pending || 0;
  const inProgressCount = aggregate?.workflow.in_progress || 0;
  const resolvedCount = aggregate?.workflow.resolved || 0;
  const workflowStudents = aggregate?.workflow_students || [];

  const categories = ['All', ...Array.from(new Set(playbooks.map((p) => p.category)))];

  const filteredPlaybooks = playbooks.filter((p) => {
    if (activeCategory !== 'All' && p.category !== activeCategory) return false;
    if (activeUrgency !== 'All' && p.urgency !== activeUrgency) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchesAction = p.recommended_action.toLowerCase().includes(q);
      const matchesCategory = p.category.toLowerCase().includes(q);
      const matchesStudent = p.sample_students.some(
        (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
      );
      return matchesAction || matchesCategory || matchesStudent;
    }
    return true;
  });

  const getCategoryIcon = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes('coding') || c.includes('tech')) return <Code className="w-4 h-4 text-sky-600" />;
    if (c.includes('attendance')) return <Clock className="w-4 h-4 text-rose-600" />;
    if (c.includes('aptitude')) return <Brain className="w-4 h-4 text-purple-600" />;
    if (c.includes('interview')) return <MessageSquare className="w-4 h-4 text-teal-600" />;
    return <BookOpen className="w-4 h-4 text-indigo-600" />;
  };

  if (!aggregate) {
    return (
      <div className="p-12 text-center text-slate-500 space-y-3">
        <Loader2 className="w-8 h-8 text-teal-500 mx-auto animate-spin" />
        <p className="text-sm font-semibold">Aggregating prescriptive action playbooks across the full cohort...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8 animate-fade-in">
      
      {/* Educational & Advisory Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-navy-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-white">
              Personalized Prescriptive Recommendations
            </h2>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Deterministic advisory actions mapped from student performance metrics across the complete cohort of {workflowTotal.toLocaleString()} records.
            Every action item specifies the trigger, suggested timeline, and assigned faculty role.
            <strong> Click any student to view their dossier and log counseling progress.</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-navy-900/90 px-3.5 py-2 rounded-xl border border-navy-700 text-center text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Action Playbooks</span>
            <span className="text-xl font-black text-teal-400">{playbooks.length}</span>
          </div>
        </div>
      </div>

      {/* View Switcher: Playbooks vs Faculty Workflow */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('playbooks')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'playbooks'
                ? 'bg-white text-navy-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Prescriptive Playbooks ({playbooks.length})
          </button>
          <button
            onClick={() => setActiveTab('workflow')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'workflow'
                ? 'bg-white text-navy-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Faculty Case Tracking ({workflowTotal.toLocaleString()})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action or student..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>
      </div>

      {/* TAB 1: PRESCRIPTIVE PLAYBOOKS */}
      {activeTab === 'playbooks' && (
        <div className="space-y-4">
          
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-navy-900 text-white shadow-2xs font-bold'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Action Playbooks List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPlaybooks.length === 0 ? (
              <div className="col-span-2 p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                No recommendation playbooks matching current filters.
              </div>
            ) : (
              filteredPlaybooks.map((item) => (
                <div
                  key={`${item.category}-${item.recommended_action}`}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
                >
                  <div className="space-y-2.5">
                    
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                          {getCategoryIcon(item.category)}
                        </div>
                        <span className="text-xs font-bold text-slate-700">
                          {item.category}
                        </span>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.urgency === 'High'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : item.urgency === 'Medium'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {item.urgency} Urgency
                      </span>
                    </div>

                    {/* Action Title */}
                    <h3 className="text-base font-extrabold text-navy-950">
                      {item.recommended_action}
                    </h3>

                    {/* Trigger Specification */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Trigger Rule</div>
                      <p className="font-medium text-slate-700">{item.trigger}</p>
                    </div>

                    {/* Role & Timeline Details */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div>
                        <span className="text-slate-400 block font-semibold">Assigned Role</span>
                        <span className="font-bold text-navy-950">{item.assigned_role}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold">Timeline</span>
                        <span className="font-bold text-teal-700">{item.suggested_timeline}</span>
                      </div>
                    </div>

                  </div>

                  {/* Impacted Students Drawer / Collapsible List */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        Impacted Students ({item.impacted_count.toLocaleString()})
                      </span>
                      <span className="text-[11px] text-slate-400">Click student to open</span>
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {item.sample_students.slice(0, 8).map((stu) => (
                        <div
                          key={stu.id}
                          onClick={() => onSelectStudentById(stu.id)}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-teal-50/60 border border-slate-100 text-xs cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[10px] text-slate-400 group-hover:text-teal-700">
                              {stu.id}
                            </span>
                            <span className="font-bold text-slate-800 truncate">
                              {stu.name}
                            </span>
                            <span className="text-[10px] text-slate-400 hidden sm:inline">
                              &bull; {stu.department.replace(' Engineering', '')}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <RiskBadge level={stu.risk_level} size="sm" />
                            <span className="text-teal-600 font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                              &rarr;
                            </span>
                          </div>
                        </div>
                      ))}
                      {item.impacted_count > 8 && (
                        <div className="text-[10px] text-center text-slate-400 pt-1">
                          + {item.impacted_count - 8} more students assigned this recommendation
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FACULTY CASE TRACKING WORKFLOW */}
      {activeTab === 'workflow' && (
        <div className="space-y-4">
          
          {/* Status KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500">Pending Review</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">{pendingCount.toLocaleString()}</div>
              <p className="text-[11px] text-slate-400">Awaiting faculty mentor intake</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500">Active Mentoring</span>
                <UserCheck className="w-4 h-4 text-teal-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">{inProgressCount.toLocaleString()}</div>
              <p className="text-[11px] text-slate-400">Workshops or counseling active</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500">Resolved Cases</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">{resolvedCount.toLocaleString()}</div>
              <p className="text-[11px] text-slate-400">Addressed and closed in SQLite</p>
            </div>
          </div>

          {/* Student Case Workflow Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-navy-950">
                Active Student Intervention Records
              </h3>
              <div className="flex items-center gap-1.5 text-xs">
                {['All', 'Pending Review', 'Mentoring Assigned', 'Workshop Scheduled', 'Resolved'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      statusFilter === st
                        ? 'bg-navy-900 text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Intervention Status</th>
                    <th className="py-2.5 px-3">Faculty Mentor</th>
                    <th className="py-2.5 px-3">Advisory Notes</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workflowStudents
                    .filter((s) => statusFilter === 'All' || s.intervention_status === statusFilter)
                    .filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase()))
                    .slice(0, 50)
                    .map((s) => (
                      <tr
                        key={s.id}
                        onClick={() => onSelectStudentById(s.id)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-navy-950">{s.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{s.id}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{s.department}</td>
                        <td className="py-2.5 px-3">
                          <RiskBadge level={s.risk_level} size="sm" />
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            s.intervention_status === 'Resolved'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : s.intervention_status === 'Pending Review'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-teal-50 text-teal-800 border-teal-200'
                          }`}>
                            {s.intervention_status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-medium">
                          {s.faculty_mentor || 'Prof. Unassigned'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                          {s.review_notes || <span className="italic text-slate-400">No counseling notes logged yet</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="text-teal-700 font-bold hover:underline">
                            Edit Case &rarr;
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-[11px] text-slate-400">
              Showing the most recent 50 of {workflowTotal.toLocaleString()} active intervention records. Use the Data Quality report or CSV export for full audit logs.
            </div>
          </div>
        </div>
      )}

    </div>
  );
};