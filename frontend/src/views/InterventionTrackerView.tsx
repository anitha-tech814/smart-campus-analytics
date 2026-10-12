import React, { useState, useEffect } from 'react';
import {
  InterventionItem,
  InterventionCreatePayload,
  InterventionUpdatePayload,
  Student
} from '../types';
import {
  fetchInterventions,
  createIntervention,
  updateInterventionItem,
  deleteInterventionItem,
  fetchStudents
} from '../services/api';
import {
  UserCheck,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  Filter,
  Search,
  User,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Award,
  BookOpen,
  Code,
  Target,
  MessageSquare
} from 'lucide-react';

interface Props {
  onSelectStudent?: (studentId: string) => void;
  showToast?: (title: string, message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const InterventionTrackerView: React.FC<Props> = ({ onSelectStudent, showToast }) => {
  const [interventions, setInterventions] = useState<InterventionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [studentOptions, setStudentOptions] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [newType, setNewType] = useState('Mentoring');
  const [newFaculty, setNewFaculty] = useState('Prof. Sunita Deshpande');
  const [newStatus, setNewStatus] = useState('Planned');
  const [newFollowUp, setNewFollowUp] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Update / Record Outcome Modal State
  const [editingItem, setEditingItem] = useState<InterventionItem | null>(null);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');
  const [updateFollowUp, setUpdateFollowUp] = useState('');
  const [subsequentCgpa, setSubsequentCgpa] = useState<string>('');
  const [subsequentAtt, setSubsequentAtt] = useState<string>('');
  const [outcomeSummary, setOutcomeSummary] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchInterventions({
        status: statusFilter,
        intervention_type: typeFilter,
        department: departmentFilter
      });
      setInterventions(data);
    } catch (err: any) {
      if (showToast) showToast('Load Failed', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, typeFilter, departmentFilter]);

  // Load students for dropdown when modal opens
  const handleOpenCreateModal = async () => {
    setShowCreateModal(true);
    try {
      const res = await fetchStudents({ limit: 150 });
      setStudentOptions(res.items);
      if (res.items.length > 0 && !selectedStudentId) {
        setSelectedStudentId(res.items[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    setSubmitting(true);
    try {
      const payload: InterventionCreatePayload = {
        student_id: selectedStudentId,
        intervention_type: newType,
        faculty_member: newFaculty,
        status: newStatus,
        follow_up_date: newFollowUp || undefined,
        notes: newNotes
      };
      await createIntervention(payload);
      if (showToast) {
        showToast('Intervention Created', `Action plan initialized for student ${selectedStudentId}`, 'success');
      }
      setShowCreateModal(false);
      setNewNotes('');
      setNewFollowUp('');
      loadData();
    } catch (err: any) {
      if (showToast) showToast('Error', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (item: InterventionItem) => {
    setEditingItem(item);
    setUpdateStatus(item.status);
    setUpdateNotes(item.notes || '');
    setUpdateFollowUp(item.follow_up_date || '');
    setSubsequentCgpa(item.subsequent_cgpa !== null && item.subsequent_cgpa !== undefined ? String(item.subsequent_cgpa) : '');
    setSubsequentAtt(item.subsequent_attendance !== null && item.subsequent_attendance !== undefined ? String(item.subsequent_attendance) : '');
    setOutcomeSummary(item.outcome_summary || '');
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setSubmitting(true);
    try {
      const payload: InterventionUpdatePayload = {
        status: updateStatus,
        notes: updateNotes,
        follow_up_date: updateFollowUp || undefined,
        subsequent_cgpa: subsequentCgpa ? parseFloat(subsequentCgpa) : undefined,
        subsequent_attendance: subsequentAtt ? parseFloat(subsequentAtt) : undefined,
        outcome_summary: outcomeSummary || undefined
      };
      await updateInterventionItem(editingItem.id, payload);
      if (showToast) {
        showToast('Intervention Updated', `Progress recorded for ${editingItem.student_name}`, 'success');
      }
      setEditingItem(null);
      loadData();
    } catch (err: any) {
      if (showToast) showToast('Error', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to remove intervention plan #${id} for ${name}?`)) return;
    try {
      await deleteInterventionItem(id);
      if (showToast) showToast('Record Deleted', `Intervention #${id} removed.`, 'info');
      loadData();
    } catch (err: any) {
      if (showToast) showToast('Error', err.message, 'error');
    }
  };

  // Filter local search
  const filteredList = interventions.filter(it => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      it.student_id.toLowerCase().includes(q) ||
      it.student_name.toLowerCase().includes(q) ||
      it.faculty_member.toLowerCase().includes(q) ||
      it.intervention_type.toLowerCase().includes(q)
    );
  });

  // KPI calculations
  const plannedCount = interventions.filter(i => i.status === 'Planned').length;
  const inProgressCount = interventions.filter(i => i.status === 'In Progress').length;
  const followUpCount = interventions.filter(i => i.status === 'Follow-up Required').length;
  const completedCount = interventions.filter(i => i.status === 'Completed').length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Attendance Counselling': return <Calendar className="w-4 h-4 text-amber-500" />;
      case 'Coding Practice': return <Code className="w-4 h-4 text-emerald-500" />;
      case 'Aptitude Preparation': return <Target className="w-4 h-4 text-purple-500" />;
      case 'Mock Interview Support': return <Award className="w-4 h-4 text-blue-500" />;
      default: return <UserCheck className="w-4 h-4 text-indigo-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-3.5 h-3.5" /> Completed</span>;
      case 'In Progress':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"><Clock className="w-3.5 h-3.5" /> In Progress</span>;
      case 'Follow-up Required':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"><AlertCircle className="w-3.5 h-3.5" /> Follow-up Required</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"><Clock className="w-3.5 h-3.5" /> Planned</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-2">
            <UserCheck className="w-3.5 h-3.5" /> Faculty Intervention & Outcome Tracking
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Intervention Tracker</h1>
          <p className="text-sm text-slate-500 mt-1">
            Assign targeted academic actions, track progress timelines, and objectively measure post-intervention outcomes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/api/interventions/export/csv"
            download
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-medium text-sm transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export CSV
          </a>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all shadow-sm hover:shadow"
          >
            <Plus className="w-4 h-4" />
            New Intervention Plan
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-400" />
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Planned Actions</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{plannedCount}</div>
          <p className="text-xs text-slate-400 mt-0.5">Scheduled for initiation</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
          <div className="text-xs font-medium text-blue-600 uppercase tracking-wider">In Progress</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{inProgressCount}</div>
          <p className="text-xs text-slate-400 mt-0.5">Active mentorship & labs</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
          <div className="text-xs font-medium text-rose-600 uppercase tracking-wider">Follow-up Required</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{followUpCount}</div>
          <p className="text-xs text-slate-400 mt-0.5">Pending milestone review</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Completed</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{completedCount}</div>
          <p className="text-xs text-slate-400 mt-0.5">Measured outcome verified</p>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student, ID, faculty or type..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="All">All Statuses</option>
            <option value="Planned">Planned</option>
            <option value="In Progress">In Progress</option>
            <option value="Follow-up Required">Follow-up Required</option>
            <option value="Completed">Completed</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="All">All Intervention Types</option>
            <option value="Mentoring">Mentoring</option>
            <option value="Attendance Counselling">Attendance Counselling</option>
            <option value="Coding Practice">Coding Practice</option>
            <option value="Aptitude Preparation">Aptitude Preparation</option>
            <option value="Mock Interview Support">Mock Interview Support</option>
          </select>

          <button
            onClick={loadData}
            title="Refresh list"
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interventions List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
            <p className="text-sm font-medium">Loading faculty intervention registry...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <UserCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">No interventions matching criteria</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create a new intervention plan or clear existing filter criteria to view active faculty records.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Intervention Type</th>
                  <th className="py-3 px-4">Assigned Advisor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Follow-up Date</th>
                  <th className="py-3 px-4">Baseline vs Observed Telemetry</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((item) => {
                  const hasSubsequent = item.subsequent_cgpa !== null || item.subsequent_attendance !== null;
                  const cgpaDelta = (item.subsequent_cgpa !== null && item.baseline_cgpa !== null && item.subsequent_cgpa !== undefined && item.baseline_cgpa !== undefined)
                    ? (item.subsequent_cgpa - item.baseline_cgpa).toFixed(2)
                    : null;
                  const attDelta = (item.subsequent_attendance !== null && item.baseline_attendance !== null && item.subsequent_attendance !== undefined && item.baseline_attendance !== undefined)
                    ? (item.subsequent_attendance - item.baseline_attendance).toFixed(1)
                    : null;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                            {item.student_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <button
                              onClick={() => onSelectStudent && onSelectStudent(item.student_id)}
                              className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors text-left"
                            >
                              {item.student_name}
                            </button>
                            <div className="text-xs text-slate-400 font-mono">{item.student_id} • {item.department}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                          {getTypeIcon(item.intervention_type)}
                          <span>{item.intervention_type}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 text-xs">
                        <div className="font-medium text-slate-800">{item.faculty_member}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {getStatusBadge(item.status)}
                      </td>

                      <td className="py-3.5 px-4 text-xs font-mono text-slate-600">
                        {item.follow_up_date ? (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {item.follow_up_date}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None set</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {hasSubsequent ? (
                          <div className="text-xs space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">CGPA:</span>
                              <span className="font-mono text-slate-600">{item.baseline_cgpa?.toFixed(2)}</span>
                              <span className="text-slate-400">→</span>
                              <span className="font-mono font-bold text-slate-900">{item.subsequent_cgpa?.toFixed(2)}</span>
                              {cgpaDelta && (
                                <span className={`text-[10px] font-bold px-1 rounded ${parseFloat(cgpaDelta) >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                  {parseFloat(cgpaDelta) >= 0 ? `+${cgpaDelta}` : cgpaDelta}
                                </span>
                              )}
                            </div>
                            {item.subsequent_attendance && (
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400">Att:</span>
                                <span className="font-mono text-slate-600">{item.baseline_attendance?.toFixed(1)}%</span>
                                <span className="text-slate-400">→</span>
                                <span className="font-mono font-bold text-slate-900">{item.subsequent_attendance?.toFixed(1)}%</span>
                                {attDelta && (
                                  <span className={`text-[10px] font-bold px-1 rounded ${parseFloat(attDelta) >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {parseFloat(attDelta) >= 0 ? `+${attDelta}%` : `${attDelta}%`}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="text-[10px] text-slate-400 italic">Observed Measurement Verified</div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500">
                            <div>Baseline: <span className="font-mono font-medium text-slate-700">{item.baseline_cgpa?.toFixed(2)} CGPA</span> / <span className="font-mono font-medium text-slate-700">{item.baseline_attendance?.toFixed(1)}%</span></div>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              Pending Follow-up Telemetry
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          >
                            Update
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.student_name)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                            title="Delete record"
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Initiate Faculty Intervention</h3>
                <p className="text-xs text-slate-500">Schedule targeted academic support with baseline snapshot</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Target Student
                </label>
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {studentOptions.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id}) — {s.department} • CGPA {s.cgpa} • Risk: {s.risk_level}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Intervention Type
                  </label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Mentoring">Mentoring</option>
                    <option value="Attendance Counselling">Attendance Counselling</option>
                    <option value="Coding Practice">Coding Practice</option>
                    <option value="Aptitude Preparation">Aptitude Preparation</option>
                    <option value="Mock Interview Support">Mock Interview Support</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Initial Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Planned">Planned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Follow-up Required">Follow-up Required</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Assigned Faculty
                  </label>
                  <input
                    type="text"
                    value={newFaculty}
                    onChange={e => setNewFaculty(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Follow-up Target Date
                  </label>
                  <input
                    type="date"
                    value={newFollowUp}
                    onChange={e => setNewFollowUp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Action Plan Notes
                </label>
                <textarea
                  rows={3}
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="Record specific diagnostic reasons, syllabus goals, and agreed student commitments..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-all"
                >
                  {submitting ? 'Creating...' : 'Record Intervention'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Record Outcome Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Update Intervention Progress</h3>
                <p className="text-xs text-slate-500">
                  {editingItem.student_name} ({editingItem.student_id}) — {editingItem.intervention_type}
                </p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Intervention Status
                  </label>
                  <select
                    value={updateStatus}
                    onChange={e => setUpdateStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Planned">Planned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Follow-up Required">Follow-up Required</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Next Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={updateFollowUp}
                    onChange={e => setNewFollowUp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Verified Measurement Inputs */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Post-Intervention Measurements (Optional)
                </div>
                <p className="text-[11px] text-slate-500">
                  Record subsequent test or attendance scores ONLY if an actual post-intervention measurement was conducted.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600">Subsequent CGPA</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      placeholder={`Baseline: ${editingItem.baseline_cgpa?.toFixed(2) ?? 'N/A'}`}
                      value={subsequentCgpa}
                      onChange={e => setSubsequentCgpa(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600">Subsequent Attendance (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder={`Baseline: ${editingItem.baseline_attendance?.toFixed(1) ?? 'N/A'}%`}
                      value={subsequentAtt}
                      onChange={e => setSubsequentAtt(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Meeting Notes & Observations
                </label>
                <textarea
                  rows={2}
                  value={updateNotes}
                  onChange={e => setUpdateNotes(e.target.value)}
                  placeholder="Record summary of session..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Outcome Evaluation Summary
                </label>
                <textarea
                  rows={2}
                  value={outcomeSummary}
                  onChange={e => setOutcomeSummary(e.target.value)}
                  placeholder="Objective findings on student improvement..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-all"
                >
                  {submitting ? 'Saving...' : 'Save Progress'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
