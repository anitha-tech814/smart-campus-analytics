import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { FactorContribution } from '../types';

interface Props {
  factors: FactorContribution[];
  score: number;
  category: string;
}

export const ScoreBreakdownRadar: React.FC<Props> = ({ factors, score, category }) => {
  const radarData = factors.map(f => ({
    subject: f.label.split(' ')[0], // short name
    fullLabel: f.label,
    normalized: f.normalized_value,
    max: 100
  }));

  const barData = factors.map(f => ({
    name: f.label,
    Contribution: f.weighted_score,
    MaxPossible: f.max_possible,
    Weight: `${(f.weight * 100).toFixed(0)}%`
  }));

  return (
    <div className="space-y-6">
      {/* Score Summary Box */}
      <div className="bg-gradient-to-br from-navy-900 to-navy-800 text-white p-5 rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-teal-300 font-semibold">Composite Success Score</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl font-extrabold text-white">{score.toFixed(1)}</span>
            <span className="text-slate-300 text-sm">/ 100</span>
          </div>
          <p className="text-xs text-slate-300 mt-1">Classification: <span className="text-teal-300 font-medium">{category}</span></p>
        </div>
        <div className="text-right text-xs text-slate-300 bg-navy-950/60 p-3 rounded-lg border border-navy-700/60 max-w-xs">
          <p className="font-medium text-slate-200">Transparent Formula:</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Sum of (Normalized Factor Score × Configured Weight). No black-box machine learning used for scoring.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Multi-Factor Skill Radar</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#cbd5e1" />
                <Radar name="Performance" dataKey="normalized" stroke="#0284c7" fill="#38bdf8" fillOpacity={0.45} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weighted Contribution Bar Chart */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Points Contributed to Total Score</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <XAxis type="number" domain={[0, 30]} stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="name" type="category" width={110} stroke="#94a3b8" fontSize={10} tickFormatter={(val) => val.split(' ')[0]} />
                <Tooltip
                  formatter={(val: any, name: string) => [`${val} pts`, name === 'Contribution' ? 'Points Earned' : 'Max Possible']}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="Contribution" fill="#0d9488" radius={[0, 4, 4, 0]} />
                <Bar dataKey="MaxPossible" fill="#e2e8f0" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Factor Breakdown Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Evaluation Factor</th>
              <th className="py-2.5 px-3">Observed Raw Value</th>
              <th className="py-2.5 px-3">Normalized (0-100)</th>
              <th className="py-2.5 px-3">Factor Weight</th>
              <th className="py-2.5 px-3 text-right">Points Earned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {factors.map((f, i) => (
              <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-2.5 px-3 font-medium text-slate-800">{f.label}</td>
                <td className="py-2.5 px-3 text-slate-600">
                  {f.factor === 'cgpa' ? `${f.raw_value.toFixed(2)} / 10.0` : `${f.raw_value.toFixed(1)}${f.factor === 'attendance' ? '%' : '/100'}`}
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-teal-500 h-full rounded-full" style={{ width: `${f.normalized_value}%` }}></div>
                    </div>
                    <span className="text-slate-700 font-medium">{f.normalized_value.toFixed(1)}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-slate-600 font-mono">{(f.weight * 100).toFixed(0)}%</td>
                <td className="py-2.5 px-3 text-right font-bold text-teal-700">
                  +{f.weighted_score.toFixed(1)} <span className="text-slate-400 font-normal">/ {f.max_possible.toFixed(1)}</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
            <tr>
              <td colSpan={3} className="py-2.5 px-3 text-slate-700">Total Weighted Score</td>
              <td className="py-2.5 px-3 font-mono">100%</td>
              <td className="py-2.5 px-3 text-right text-teal-800 text-sm">{score.toFixed(1)} / 100</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
