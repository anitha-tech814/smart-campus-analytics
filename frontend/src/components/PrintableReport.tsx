import React from 'react';
import { ExecutiveReportData } from '../types';
import { Printer, Shield, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

interface Props {
  reportData: ExecutiveReportData | null;
  onClose?: () => void;
}

export const PrintableReport: React.FC<Props> = ({ reportData, onClose }) => {
  if (!reportData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="printable-area bg-white text-slate-900 p-8 sm:p-12 max-w-4xl mx-auto space-y-8 rounded-2xl shadow-sm border border-slate-200">
      
      {/* Print Action Bar (hidden when printing) */}
      <div className="no-print flex items-center justify-between pb-6 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <FileText className="w-4 h-4 text-teal-600" />
          <span>Management Presentation Print Layout</span>
        </div>
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs rounded-lg border border-slate-300 hover:bg-slate-50 font-medium"
            >
              Back to Dashboard
            </button>
          )}
          <button
            onClick={handlePrint}
            className="px-5 py-1.5 text-xs rounded-lg bg-navy-900 text-white font-bold hover:bg-navy-800 flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save to PDF
          </button>
        </div>
      </div>

      {/* Institutional Letterhead */}
      <div className="border-b-2 border-navy-900 pb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-navy-900 text-white flex items-center justify-center font-black text-sm">
              SC
            </div>
            <h1 className="text-2xl font-black tracking-tight text-navy-900">
              SMART CAMPUS ANALYTICS
            </h1>
          </div>
          <p className="text-xs uppercase tracking-widest text-slate-500 mt-1 font-semibold">
            Office of Academic Excellence & Student Placement Success
          </p>
        </div>
        <div className="text-right text-xs text-slate-500 space-y-0.5">
          <p className="font-semibold text-slate-800">Confidential Executive Memo</p>
          <p>Generated: {reportData.generated_at}</p>
          {reportData.is_demo_data && (
            <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px]">
              SYNTHETIC DEMO DATASET
            </span>
          )}
        </div>
      </div>

      {/* Executive Overview Box */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-navy-900 uppercase tracking-wider border-l-4 border-teal-600 pl-3">
          Executive Summary & Key Institutional Indicators
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          This report presents synthesized academic progression, class attendance compliance, and corporate recruitment readiness metrics across the active student cohort ({reportData.dataset_scope}). All figures derive directly from verified student records.
        </p>

        {/* KPI Grid */}
        <div className="grid grid-cols-4 gap-4 pt-3">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Students</span>
            <div className="text-2xl font-extrabold text-navy-900 mt-1">{reportData.total_cohort}</div>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Cohort Mean CGPA</span>
            <div className="text-2xl font-extrabold text-navy-900 mt-1">{reportData.average_cgpa.toFixed(2)}</div>
            <span className="text-[10px] text-slate-400">Scale 0.0 - 10.0</span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Average Attendance</span>
            <div className="text-2xl font-extrabold text-navy-900 mt-1">{reportData.average_attendance.toFixed(1)}%</div>
            <span className="text-[10px] text-slate-400">Target &ge; 75.0%</span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Critical Action Cases</span>
            <div className="text-2xl font-extrabold text-rose-600 mt-1">{reportData.critical_cases_count}</div>
            <span className="text-[10px] text-slate-400">Priority 1 Advisory</span>
          </div>
        </div>
      </div>

      {/* Critical Student Case Roster */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-navy-900 uppercase tracking-wider border-l-4 border-rose-600 pl-3">
          Priority 1: Critical Support Roster ({reportData.critical_students.length} Students)
        </h2>
        <p className="text-xs text-slate-600">
          Identified based on multi-factor thresholds: critical attendance deficits (&lt;70%), severe academic warnings, or sharp term-over-term grade drops. Recommended for immediate Head of Department intervention.
        </p>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px]">
              <tr>
                <th className="py-2 px-3">Student ID</th>
                <th className="py-2 px-3">Name</th>
                <th className="py-2 px-3">Department & Year</th>
                <th className="py-2 px-3">CGPA</th>
                <th className="py-2 px-3">Attendance</th>
                <th className="py-2 px-3">Score</th>
                <th className="py-2 px-3">Primary Trigger Factors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {reportData.critical_students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    No critical risk cases detected in this cohort.
                  </td>
                </tr>
              ) : (
                reportData.critical_students.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2 px-3 font-mono font-bold text-slate-800">{s.id}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{s.name}</td>
                    <td className="py-2 px-3 text-slate-600">{s.department} (Yr {s.year})</td>
                    <td className="py-2 px-3 font-bold text-rose-600">{s.cgpa.toFixed(2)}</td>
                    <td className="py-2 px-3 font-bold text-rose-600">{s.attendance.toFixed(1)}%</td>
                    <td className="py-2 px-3 font-bold text-slate-700">{s.success_score.toFixed(1)}</td>
                    <td className="py-2 px-3 text-[11px] text-slate-600 max-w-xs">
                      {s.reasons.slice(0, 2).join('; ')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommended Institutional Directives */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
        <h3 className="font-bold text-slate-900 uppercase tracking-wider">Mandatory Next Steps</h3>
        <ul className="list-disc pl-5 space-y-1 text-slate-700">
          <li>Class counselors to issue formal attendance advisory letters for all students under 75%.</li>
          <li>Placement cell to schedule hands-on Data Structures & Algorithms diagnostic bootcamps for 3rd and 4th-year cohorts.</li>
          <li>Department mentors to complete 1-on-1 counseling interviews and log case resolutions in the system within 7 calendar days.</li>
        </ul>
      </div>

      {/* Signature & Privacy Disclaimer */}
      <div className="pt-6 border-t-2 border-slate-200 space-y-6">
        <div className="grid grid-cols-2 gap-8 text-xs text-slate-600">
          <div>
            <p className="font-semibold text-slate-800">Prepared By:</p>
            <div className="mt-6 border-b border-slate-400 w-48"></div>
            <p className="mt-1">Head of Student Academic Analytics</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-slate-800">Approved By:</p>
            <div className="mt-6 border-b border-slate-400 w-48 ml-auto"></div>
            <p className="mt-1">Dean of Academics & Student Welfare</p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-[10px] text-amber-900 flex items-start gap-2">
          <Shield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p>{reportData.privacy_notice}</p>
        </div>
      </div>
    </div>
  );
};
