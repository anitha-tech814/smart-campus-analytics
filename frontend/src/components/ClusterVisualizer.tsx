import React from 'react';
import { ClusterSummary } from '../types';
import {
  Users,
  Target,
  GraduationCap,
  Sparkles,
  BarChart2,
  CheckCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface Props {
  clusters: ClusterSummary[];
  totalStudents: number;
  onFilterByCluster?: (clusterId: number) => void;
}

export const ClusterVisualizer: React.FC<Props> = ({ clusters, totalStudents, onFilterByCluster }) => {
  if (!clusters || clusters.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
        <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
        <p className="font-semibold text-slate-700">No clusters available.</p>
        <p className="text-xs text-slate-400">Ensure at least 4 student records exist in the database.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Explainability Banner */}
      <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-teal-400 font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Unsupervised Machine Learning Segmentation (K-Means)
          </span>
          <h3 className="text-base font-bold mt-1">Multi-Dimensional Behavioral & Skill Cohorts</h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Trained locally on standardized vectors (CGPA, Attendance, LMS, Coding, Aptitude, Mock Interview).
            Grouped into 4 interpretable educational profiles.
          </p>
        </div>
        <div className="text-right text-xs bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700">
          <span className="text-slate-400">Total Analyzed:</span>
          <div className="text-lg font-bold text-teal-300">{totalStudents} Students</div>
        </div>
      </div>

      {/* Cluster Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {clusters.map((c) => {
          const chartData = [
            { name: 'CGPA (x10)', value: c.avg_cgpa * 10 },
            { name: 'Attendance', value: c.avg_attendance },
            { name: 'Coding', value: c.avg_coding },
            { name: 'Aptitude', value: c.avg_aptitude },
            { name: 'Mock', value: c.avg_mock }
          ];

          return (
            <div
              key={c.cluster_id}
              className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      Segment #{c.cluster_id + 1}
                    </span>
                    <h4 className="text-base font-bold text-slate-900 mt-1.5">{c.name}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-slate-900">{c.count}</span>
                    <span className="text-xs text-slate-400 block font-medium">({c.percentage}%)</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">{c.description}</p>

                {/* Metric Centroids */}
                <div className="grid grid-cols-3 gap-2 my-4 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Avg CGPA</span>
                    <span className="font-bold text-slate-800">{c.avg_cgpa.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Avg Att.</span>
                    <span className="font-bold text-slate-800">{c.avg_attendance.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Avg Coding</span>
                    <span className="font-bold text-slate-800">{c.avg_coding.toFixed(1)}</span>
                  </div>
                </div>

                {/* Centroid Bar Chart */}
                <div className="h-28 w-full my-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" fontSize={9} stroke="#94a3b8" />
                      <YAxis domain={[0, 100]} fontSize={9} stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '6px', color: '#fff', fontSize: '11px' }}
                      />
                      <Bar dataKey="value" fill="#0f766e" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Actionable Strategy */}
                <div className="mt-3 p-3 rounded-xl bg-teal-50/70 border border-teal-200/80 text-xs">
                  <span className="font-bold text-teal-900 flex items-center gap-1 mb-0.5">
                    <Target className="w-3.5 h-3.5 text-teal-600" /> Strategic Campus Action:
                  </span>
                  <p className="text-teal-800 text-[11px] leading-relaxed">{c.recommendation}</p>
                </div>
              </div>

              {/* Sample Students */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  Samples: {c.sample_students.join(', ')}
                </span>
                {onFilterByCluster && (
                  <button
                    onClick={() => onFilterByCluster(c.cluster_id)}
                    className="text-teal-700 hover:text-teal-800 font-bold flex items-center gap-1 transition-colors text-xs"
                  >
                    View Cohort <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
