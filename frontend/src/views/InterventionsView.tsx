import React, { useState } from 'react';
import { Student } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import {
  ShieldCheck,
  FileCheck,
  Clock,
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  UserCheck
} from 'lucide-react';

interface Props {
  students: Student[];
  onSelectStudent: (student: Student) => void;
}

export const InterventionsView: React.FC<Props> = ({ students, onSelectStudent }) => {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [search, setSearch] = useState('');

  const statuses = ['All', 'Pending Review', 'Mentoring Assigned', 'Workshop Scheduled', 'Resolved'];

  const filtered = students.filter((s) => {
    if (statusFilter !== 'All' && s.intervention_status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.review_notes && s.review_notes.toLowerCase().includes(q)) ||
        (s.faculty_mentor && s.faculty_mentor.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const resolvedCount = students.filter((s) => s.intervention_status === 'Resolved').length;
  const inProgressCount = students.filter(
    (s) => s.intervention_status === 'Mentoring Assigned' || s.intervention_status === 'Workshop Scheduled'
  ).length;
  const pendingCount = students.filter((s) => s.intervention_status === 'Pending Review').length;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Pending Review</span>
            <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{pendingCount}</div>
          <p className="text-xs text-slate-500 mt-1">Cases awaiting faculty review</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Active Interventions</span>
            <span className="p-2 rounded-lg bg-teal-50 text-teal-600">
              <UserCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{inProgressCount}</div>
          <p className="text-xs text-slate-500 mt-1">Mentoring or workshops assigned</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Resolved Cases</span>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{resolvedCount}</div>
          <p className="text-xs text-slate-500 mt-1">Successfully addressed and closed</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-navy-900 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student, mentor, or notes..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Case Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4">Intervention Status</th>
                <th className="py-3 px-4">Assigned Action</th>
                <th className="py-3 px-4">Faculty Mentor</th>
                <th className="py-3 px-4">Review Notes</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No cases match the selected filter.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => onSelectStudent(s)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{s.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{s.id}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{s.department}</td>
                    <td className="py-3 px-4">
                      <RiskBadge level={s.risk_level} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        s.intervention_status === 'Resolved'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : s.intervention_status === 'Pending Review'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-teal-50 text-teal-800 border-teal-200'
                      }`}>
                        {s.intervention_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {s.intervention_action || <span className="text-slate-400 italic">None assigned</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{s.faculty_mentor}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {s.review_notes || <span className="text-slate-400 italic">No notes logged</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStudent(s);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 font-bold transition-colors"
                      >
                        Edit Case
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
