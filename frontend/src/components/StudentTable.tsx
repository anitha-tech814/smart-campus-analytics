import React from 'react';
import { Student } from '../types';
import { RiskBadge } from './RiskBadge';
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileCheck,
  Download,
  RotateCcw
} from 'lucide-react';

interface Props {
  students: Student[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  search: string;
  department: string;
  riskLevel: string;
  placementStatus: string;
  sortBy: string;
  sortDesc: boolean;
  loading: boolean;
  onSearchChange: (val: string) => void;
  onDepartmentChange: (val: string) => void;
  onRiskChange: (val: string) => void;
  onPlacementChange: (val: string) => void;
  onSortChange: (column: string) => void;
  onPageChange: (newPage: number) => void;
  onSelectStudent: (student: Student) => void;
  onExportCsv: () => void;
}

export const StudentTable: React.FC<Props> = ({
  students,
  total,
  page,
  limit,
  totalPages,
  search,
  department,
  riskLevel,
  placementStatus,
  sortBy,
  sortDesc,
  loading,
  onSearchChange,
  onDepartmentChange,
  onRiskChange,
  onPlacementChange,
  onSortChange,
  onPageChange,
  onSelectStudent,
  onExportCsv
}) => {
  const departments = [
    'All',
    'Computer Science',
    'Information Technology',
    'Electronics & Comm',
    'Data Science',
    'Mechanical Engineering'
  ];

  const riskLevels = ['All', 'Critical', 'High', 'Medium', 'Low', 'Minimal'];
  const placements = ['All', 'Placed', 'Ready', 'In Progress', 'Needs Training'];

  const hasActiveFilters =
    search !== '' || department !== 'All' || riskLevel !== 'All' || placementStatus !== 'All';

  const handleResetAllFilters = () => {
    onSearchChange('');
    onDepartmentChange('All');
    onRiskChange('All');
    onPlacementChange('All');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      
      {/* Controls Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col lg:flex-row gap-3.5 items-stretch lg:items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by student name, roll ID, or mentor..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-2xs"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={department}
              onChange={(e) => onDepartmentChange(e.target.value)}
              className="bg-transparent focus:outline-none font-semibold text-slate-700 cursor-pointer"
            >
              <option disabled>Department</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d === 'All' ? 'All Departments' : d}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs text-xs">
            <select
              value={riskLevel}
              onChange={(e) => onRiskChange(e.target.value)}
              className="bg-transparent focus:outline-none font-semibold text-slate-700 cursor-pointer"
            >
              <option disabled>Risk Level</option>
              {riskLevels.map((r) => (
                <option key={r} value={r}>
                  {r === 'All' ? 'All Risk Levels' : `${r} Priority`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs text-xs">
            <select
              value={placementStatus}
              onChange={(e) => onPlacementChange(e.target.value)}
              className="bg-transparent focus:outline-none font-semibold text-slate-700 cursor-pointer"
            >
              <option disabled>Placement Status</option>
              {placements.map((p) => (
                <option key={p} value={p}>
                  {p === 'All' ? 'All Placements' : p}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetAllFilters}
              className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold px-2.5 py-1.5 rounded-xl text-xs transition-colors shadow-2xs"
              title="Reset all search filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors shadow-2xs"
            title="Export filtered records as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px] select-none">
            <tr>
              <th
                onClick={() => onSortChange('id')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  ID
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => onSortChange('name')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  Student Name
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => onSortChange('department')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  Department
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => onSortChange('cgpa')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  CGPA
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => onSortChange('attendance')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  Attendance
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => onSortChange('coding_score')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  Coding Lab
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => onSortChange('success_score')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  Success Score
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4">Risk Priority</th>
              <th className="py-3 px-4">Placement</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              // Polished skeleton loading rows
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk-${i}`} className="animate-pulse">
                  <td className="py-3 px-4">
                    <div className="h-4 w-20 bg-slate-200 rounded"></div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="h-4 w-32 bg-slate-200 rounded mb-1"></div>
                    <div className="h-3 w-20 bg-slate-100 rounded"></div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="h-4 w-28 bg-slate-200 rounded"></div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="h-4 w-12 bg-slate-200 rounded"></div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="h-4 w-12 bg-slate-200 rounded"></div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="h-4 w-12 bg-slate-200 rounded"></div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="h-4 w-16 bg-slate-200 rounded"></div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="h-5 w-20 bg-slate-200 rounded-full"></div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="h-4 w-16 bg-slate-200 rounded"></div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="h-6 w-14 bg-slate-200 rounded mx-auto"></div>
                  </td>
                </tr>
              ))
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-500 space-y-2">
                  <p className="font-bold text-slate-700">No student records match current criteria.</p>
                  <p className="text-xs text-slate-400">Try clearing active search filters to view full cohort.</p>
                  {hasActiveFilters && (
                    <button
                      onClick={handleResetAllFilters}
                      className="mt-2 px-3 py-1.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold hover:bg-teal-100 transition-colors"
                    >
                      Reset All Filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              students.map((stu) => {
                // Generate consistent initial initials
                const initials = stu.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2);

                return (
                  <tr
                    key={stu.id}
                    onClick={() => onSelectStudent(stu)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-slate-500">
                      {stu.id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200/80 text-teal-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-navy-950 group-hover:text-teal-700 flex items-center gap-1.5 transition-colors">
                            <span className="truncate">{stu.name}</span>
                            {stu.reviewed && (
                              <span title="Reviewed by faculty mentor">
                                <FileCheck className="w-3.5 h-3.5 text-teal-600" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            Yr {stu.year} &bull; {stu.faculty_mentor}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{stu.department}</td>
                    <td className="py-3 px-4">
                      <span className={`font-bold ${stu.cgpa < 6.5 ? 'text-rose-600' : 'text-slate-800'}`}>
                        {stu.cgpa.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">/10</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-semibold ${stu.attendance < 75.0 ? 'text-rose-600' : 'text-slate-800'}`}>
                        {stu.attendance.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-medium ${stu.coding_score < 45.0 ? 'text-amber-600' : 'text-slate-700'}`}>
                        {stu.coding_score.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-teal-500 h-full rounded-full"
                            style={{ width: `${Math.min(stu.success_score, 100)}%` }}
                          ></div>
                        </div>
                        <span className="font-extrabold text-navy-950">{stu.success_score.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <RiskBadge level={stu.risk_level} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-700 font-semibold text-[11px] px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                        {stu.placement_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStudent(stu);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 font-bold inline-flex items-center gap-1 transition-colors text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Profile</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div>
          Showing <strong>{students.length > 0 ? (page - 1) * limit + 1 : 0}</strong> to{' '}
          <strong>{Math.min(page * limit, total)}</strong> of <strong>{total}</strong> students
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 font-semibold text-slate-800">
            Page {page} of {totalPages || 1}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
