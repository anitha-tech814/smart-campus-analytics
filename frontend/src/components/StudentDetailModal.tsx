import React, { useState } from 'react';
import { Student } from '../types';
import { RiskBadge } from './RiskBadge';
import { ScoreBreakdownRadar } from './ScoreBreakdownRadar';
import {
  X,
  User,
  GraduationCap,
  Calendar,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Clock,
  BookOpen,
  Award,
  ChevronRight,
  Save,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';
import { updateIntervention } from '../services/api';

interface Props {
  student: Student | null;
  onClose: () => void;
  onUpdated: (updatedStudent: Student) => void;
}

export const StudentDetailModal: React.FC<Props> = ({ student, onClose, onUpdated }) => {
  if (!student) return null;

  const [activeTab, setActiveTab] = useState<'overview' | 'score' | 'risk' | 'recommendations' | 'intervention'>('overview');
  
  // Intervention form state
  const [reviewed, setReviewed] = useState<boolean>(student.reviewed);
  const [interventionStatus, setInterventionStatus] = useState<string>(student.intervention_status);
  const [interventionAction, setInterventionAction] = useState<string>(student.intervention_action || '');
  const [reviewNotes, setReviewNotes] = useState<string>(student.review_notes || '');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      const updated = await updateIntervention(student.id, {
        reviewed,
        intervention_status: interventionStatus,
        intervention_action: interventionAction,
        review_notes: reviewNotes
      });
      setSaving(false);
      setSaveSuccess(true);
      onUpdated(updated);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaving(false);
      alert('Failed to save intervention. Please verify backend connection.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-slate-900 text-white p-5 sm:p-6 flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-300 flex items-center justify-center text-lg font-bold">
              {student.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-bold text-white tracking-tight">{student.name}</h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {student.id}
                </span>
                <RiskBadge level={student.risk_level} />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mt-2">
                <span className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5 text-teal-400" /> {student.department}</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-teal-400" /> Year {student.year}</span>
                <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-teal-400" /> Mentor: {student.faculty_mentor || 'Unassigned'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-navy-900 text-navy-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Core Metrics
          </button>
          <button
            onClick={() => setActiveTab('score')}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'score'
                ? 'border-navy-900 text-navy-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-3.5 h-3.5" /> Success Score Breakdown
          </button>
          <button
            onClick={() => setActiveTab('risk')}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'risk'
                ? 'border-navy-900 text-navy-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Explainable Risk ({student.risk_reasons.length})
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'recommendations'
                ? 'border-navy-900 text-navy-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" /> Recommendations ({student.recommendations.length})
          </button>
          <button
            onClick={() => setActiveTab('intervention')}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'intervention'
                ? 'border-navy-900 text-navy-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Faculty Case Review
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-medium">Academic CGPA</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{student.cgpa.toFixed(2)}</div>
                  <span className="text-[11px] text-slate-500">Benchmark: &ge; 6.5</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-medium">Attendance</span>
                  <div className={`text-2xl font-bold mt-1 ${student.attendance < 75 ? 'text-rose-600' : 'text-slate-900'}`}>
                    {student.attendance.toFixed(1)}%
                  </div>
                  <span className="text-[11px] text-slate-500">Benchmark: &ge; 75.0%</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-medium">Coding Lab</span>
                  <div className={`text-2xl font-bold mt-1 ${student.coding_score < 45 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {student.coding_score.toFixed(1)}
                  </div>
                  <span className="text-[11px] text-slate-500">Benchmark: &ge; 45.0</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-medium">Placement Status</span>
                  <div className="text-base font-bold text-slate-900 mt-1.5">{student.placement_status}</div>
                  <span className="text-[11px] text-slate-500">Mock: {student.mock_interview_score.toFixed(0)}/100</span>
                </div>
              </div>

              {/* Status Banner */}
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex items-start gap-3 text-xs text-blue-900">
                <Lightbulb className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Student Success Summary:</p>
                  <p className="mt-0.5 text-blue-800">
                    This profile holds a composite success score of <strong>{student.success_score.toFixed(1)} / 100</strong> ({student.success_category}).
                    {student.risk_level === 'Critical' || student.risk_level === 'High'
                      ? ' High-priority indicators triggered for faculty advisory review.'
                      : ' Performing steadily within expected cohort standards.'}
                  </p>
                </div>
              </div>

              {/* Academic & Skill Snapshot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Observed Academic Facts</h4>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">Verified Telemetry</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Current CGPA:</span>
                      <span className="font-bold text-slate-800">{student.cgpa.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Historical Term CGPA:</span>
                      <span className="text-slate-800 font-medium">
                        {student.historical_cgpa_prev ? (
                          <span className="inline-flex items-center gap-1.5 font-mono">
                            {student.historical_cgpa_prev.toFixed(2)}
                            <span className={`text-[10px] font-bold px-1 rounded ${
                              student.cgpa >= student.historical_cgpa_prev ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              Δ {(student.cgpa - student.historical_cgpa_prev).toFixed(2)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No prior term records (current only)</span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">LMS Portal Engagement:</span>
                      <span className="font-bold text-slate-800">{student.lms_engagement.toFixed(1)} / 100</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Assigned Faculty Mentor:</span>
                      <span className="font-medium text-slate-800">{student.faculty_mentor || 'Unassigned'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Career & Placement Readiness</h4>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">Evaluation</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Coding Lab Benchmark:</span>
                      <span className="font-bold text-slate-800">{student.coding_score.toFixed(1)} / 100</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Aptitude & Logic Test:</span>
                      <span className="font-bold text-slate-800">{student.aptitude_score.toFixed(1)} / 100</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Mock Interview Score:</span>
                      <span className="font-bold text-slate-800">{student.mock_interview_score.toFixed(1)} / 100</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Intervention Case State:</span>
                      <span className="font-semibold text-teal-700">{student.intervention_status}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SCORE BREAKDOWN */}
          {activeTab === 'score' && (
            <ScoreBreakdownRadar
              factors={student.factor_contributions}
              score={student.success_score}
              category={student.success_category}
            />
          )}

          {/* TAB 3: EXPLAINABLE RISK */}
          {activeTab === 'risk' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-bold text-slate-900">Explainable Decision Support Rationale</h4>
                  <p className="text-slate-600 mt-1">
                    Risk classification: <strong className="text-slate-900">{student.risk_level} Priority</strong>.
                    Every flag below represents an observed threshold deviation evaluated from current academic and attendance records.
                    Flags are intended strictly as human review prompts and do not represent predictive determinism.
                  </p>
                </div>
              </div>

              {/* Flag-level audit: observed value vs. the exact threshold that fired */}
              {(() => {
                const activeFlags = (student.risk_flags || []).filter(
                  (f) => f.severity === 'high' || f.severity === 'watch'
                );
                if (activeFlags.length === 0) return null;
                return (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Trigger Details (Observed Value vs. Threshold)
                    </h4>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
                            <th className="text-left px-3 py-2 font-bold">Dimension</th>
                            <th className="text-left px-3 py-2 font-bold">Severity</th>
                            <th className="text-left px-3 py-2 font-bold">Observed Value</th>
                            <th className="text-left px-3 py-2 font-bold">Threshold Rule</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeFlags.map((f, i) => (
                            <tr key={i} className="align-top">
                              <td className="px-3 py-2 font-bold text-slate-800 whitespace-nowrap">{f.label}</td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    f.severity === 'high'
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}
                                >
                                  {f.severity === 'high' ? 'High concern' : 'Watch'}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-semibold text-slate-800 whitespace-nowrap">{f.display_value}</td>
                              <td className="px-3 py-2 text-slate-600 leading-relaxed">{f.threshold}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[11px] text-slate-400 italic">
                      Each row shows the actual observed value beside the rule that triggered the flag. Flags prompt human
                      review and are not proof of failure. See the Recommendations tab for suggested intervention and follow-up timeline.
                    </p>
                  </div>
                );
              })()}

              <div className="space-y-2.5">
                {student.risk_reasons.map((reason, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm flex items-start gap-3 text-xs"
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{reason}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Triggered by verified student metric comparison against institution policies.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: RECOMMENDATIONS */}
          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 flex items-start gap-3 text-xs text-teal-900">
                <Lightbulb className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">Transparent Action Recommendations</h4>
                  <p className="mt-0.5 text-teal-800">
                    Recommendations are generated from clear campus decision rules to support faculty and placement advisors.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {student.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <ChevronRight className="w-4 h-4 text-teal-600" />
                        {rec.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        rec.urgency === 'High' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        Urgency: {rec.urgency}
                      </span>
                    </div>

                    <div className="text-slate-700 font-medium pl-5">
                      {rec.recommended_action}
                    </div>

                    <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-500 pl-5">
                      <div><strong className="text-slate-700">Trigger:</strong> {rec.trigger}</div>
                      <div><strong className="text-slate-700">Assigned Role:</strong> {rec.assigned_role}</div>
                      <div><strong className="text-slate-700">Timeline:</strong> {rec.suggested_timeline}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: FACULTY CASE REVIEW */}
          {activeTab === 'intervention' && (
            <form onSubmit={handleSaveIntervention} className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900">Faculty Intervention Workflow</h4>
                  <p className="text-slate-600 mt-0.5">
                    Record advisory follow-up actions, counseling session notes, and case status. Changes persist directly into the local SQLite database.
                  </p>
                </div>
              </div>

              {saveSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Intervention updated and saved successfully!
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Intervention Status</label>
                  <select
                    value={interventionStatus}
                    onChange={(e) => setInterventionStatus(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="Pending Review">Pending Review</option>
                    <option value="Mentoring Assigned">Mentoring Assigned</option>
                    <option value="Workshop Scheduled">Workshop Scheduled</option>
                    <option value="Resolved">Resolved / Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Action Plan</label>
                  <input
                    type="text"
                    value={interventionAction}
                    onChange={(e) => setInterventionAction(e.target.value)}
                    placeholder="e.g. 1-on-1 Attendance Counseling & DSA Drill"
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Faculty Mentor Notes & Observations</label>
                <textarea
                  rows={4}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Record discussions with student, academic advisor recommendations, parent contacts, or next review dates..."
                  className="w-full p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="markReviewed"
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
                <label htmlFor="markReviewed" className="font-semibold text-slate-800 cursor-pointer">
                  Mark case as formally reviewed by faculty
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-2 shadow-sm transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Case Review'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
