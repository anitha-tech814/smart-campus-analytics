import React, { useCallback, useEffect, useState } from 'react';
import {
  RiskDimensionsData,
  RiskOverlapData,
  DeptRiskMatrixData
} from '../types';
import {
  fetchRiskDimensions,
  fetchRiskOverlap,
  fetchDepartmentRiskMatrix
} from '../services/api';
import {
  Radar,
  Layers,
  Grid3x3,
  Building2,
  RefreshCw,
  Loader2,
  FileWarning,
  Download,
  AlertTriangle,
  Info,
  MinusCircle
} from 'lucide-react';

interface Props {
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const shortLabel = (label: string) => label.replace(/\s*\(.*\)\s*$/, '').trim();

const heatColor = (value: number, max: number, band: 'rose' | 'teal') => {
  if (max <= 0 || value <= 0) return 'rgba(148, 163, 184, 0.08)';
  const ratio = Math.min(value / max, 1);
  const alpha = 0.12 + ratio * 0.78;
  return band === 'rose' ? `rgba(244, 63, 94, ${alpha})` : `rgba(20, 184, 166, ${alpha})`;
};

export const RiskDimensionsView: React.FC<Props> = ({ onShowToast }) => {
  const [dimensions, setDimensions] = useState<RiskDimensionsData | null>(null);
  const [overlap, setOverlap] = useState<RiskOverlapData | null>(null);
  const [matrix, setMatrix] = useState<DeptRiskMatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dims, ov, mat] = await Promise.all([
        fetchRiskDimensions(),
        fetchRiskOverlap(),
        fetchDepartmentRiskMatrix()
      ]);
      setDimensions(dims);
      setOverlap(ov);
      setMatrix(mat);
    } catch (err) {
      setError('Unable to compute the multi-dimension risk analytics from the local engine.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleRefresh = () => {
    loadAll();
    onShowToast?.('Dimensions Recalculated', 'Multi-dimension risk analytics recomputed across the full cohort.', 'info');
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 space-y-3">
        <Loader2 className="w-8 h-8 text-teal-500 mx-auto animate-spin" />
        <p className="text-sm font-semibold">Computing multi-dimension risk flags, overlap, and departmental matrices...</p>
      </div>
    );
  }

  if (error || !dimensions || !overlap || !matrix) {
    return (
      <div className="max-w-lg mx-auto mt-12 bg-white rounded-2xl border border-rose-200 shadow-xs p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <FileWarning className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-navy-950">Risk Dimension Analytics Unavailable</h3>
        <p className="text-xs text-slate-600 leading-relaxed">{error}</p>
        <button
          onClick={loadAll}
          className="px-4 py-2 rounded-xl bg-navy-950 hover:bg-navy-900 text-white text-xs font-bold transition-colors inline-flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Analysis
        </button>
      </div>
    );
  }

  const maxOverlap = Math.max(
    ...overlap.dimensions.flatMap((a) => overlap.dimensions.map((b) => overlap.matrix[a]?.[b] || 0)),
    1
  );

  const maxMatrixPercent = Math.max(
    ...matrix.cells.flatMap((cell) => matrix.dimensions.map((d) => cell.dimensions[d]?.percentage || 0)),
    1
  );

  const summaryCards = [
    {
      title: 'Cohort Size',
      value: dimensions.total_students.toLocaleString(),
      subtitle: 'Students evaluated',
      icon: <Layers className="w-5 h-5" />,
      accent: 'bg-blue-50/80 text-blue-600 border-blue-100',
      bar: 'bg-blue-600'
    },
    {
      title: 'Unique Flagged',
      value: dimensions.unique_flagged.toLocaleString(),
      subtitle: `${dimensions.unique_flagged_percentage}% of cohort (deduplicated)`,
      icon: <AlertTriangle className="w-5 h-5" />,
      accent: 'bg-amber-50/80 text-amber-600 border-amber-100',
      bar: 'bg-amber-500'
    },
    {
      title: 'High-Concern Students',
      value: dimensions.unique_high.toLocaleString(),
      subtitle: '≥ 1 high-severity dimension',
      icon: <Radar className="w-5 h-5" />,
      accent: 'bg-rose-50/80 text-rose-600 border-rose-100',
      bar: 'bg-rose-500'
    },
    {
      title: 'Dimensions Not Supplied',
      value: dimensions.fully_unavailable_students.toLocaleString(),
      subtitle: 'Students with all inputs N/A',
      icon: <MinusCircle className="w-5 h-5" />,
      accent: 'bg-slate-100 text-slate-600 border-slate-200',
      bar: 'bg-slate-400'
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8 animate-fade-in">

      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-navy-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30">
              <Radar className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-white">
              Multi-Dimension Risk Analytics &amp; Overlap
            </h2>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Deterministic, explainable flags across {dimensions.dimensions.length} dimensions. Overlap and departmental
            matrices use deduplicated student counts so no student is double-counted. Dimensions without source data are
            reported as <strong className="text-teal-300">N/A</strong> — never inferred.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => window.open('/api/analytics/export/risk-dimensions.csv', '_blank')}
            className="px-3 py-2 rounded-xl border border-navy-700 hover:bg-navy-800 text-slate-200 font-semibold text-xs transition-colors inline-flex items-center gap-2"
            title="Export dimension summary as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Dimensions CSV
          </button>
          <button
            onClick={() => window.open('/api/analytics/export/risk-register.csv', '_blank')}
            className="px-3 py-2 rounded-xl border border-navy-700 hover:bg-navy-800 text-slate-200 font-semibold text-xs transition-colors inline-flex items-center gap-2"
            title="Export full student risk register as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Risk Register CSV
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

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
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

      {/* Dimension Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy-950">Dimension-by-Dimension Flags</h3>
            <p className="text-[11px] text-slate-500">
              Counts and rules per dimension. Percentages are shown against both available and full-cohort denominators.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {dimensions.dimensions.map((d) => {
            const isNa = d.available_count === 0;
            const totalBar = Math.max(d.available_count, 1);
            const highPct = (d.high_count / totalBar) * 100;
            const watchPct = (d.watch_count / totalBar) * 100;
            const threshold = dimensions.thresholds.find((t) => t.dimension === d.dimension);
            return (
              <div
                key={d.dimension}
                className="rounded-xl border border-slate-200/80 p-4 space-y-3 bg-slate-50/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-navy-950">{d.label}</h4>
                    {isNa ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        N/A — not in dataset
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-500">
                        {d.affected_percentage_of_available}% of {d.available_count.toLocaleString()} available
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isNa
                        ? 'bg-slate-100 text-slate-500 border-slate-200'
                        : d.affected_count > 0
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {isNa ? 'No data' : `${d.affected_count.toLocaleString()} flagged`}
                  </span>
                </div>

                {!isNa && (
                  <div className="space-y-1.5">
                    <div className="h-2.5 w-full rounded-full bg-slate-200/70 overflow-hidden flex">
                      <div className="h-full bg-rose-500" style={{ width: `${highPct}%` }} title={`${d.high_count} high`} />
                      <div className="h-full bg-amber-400" style={{ width: `${watchPct}%` }} title={`${d.watch_count} watch`} />
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> {d.high_count.toLocaleString()} high
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400" /> {d.watch_count.toLocaleString()} watch
                      </span>
                    </div>
                  </div>
                )}

                {threshold && (
                  <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-200/70 pt-2">
                    <span className="font-semibold text-slate-600">Rule:</span> {threshold.rule}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Overlap Matrix */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
              <Grid3x3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-navy-950">Dimension Overlap</h3>
              <p className="text-[11px] text-slate-500">
                Students flagged in both dimensions (high or watch). Diagonal = unique per dimension.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-[11px] border-separate border-spacing-0.5">
              <thead>
                <tr>
                  <th className="text-left p-1.5 font-bold text-slate-500 sticky left-0 bg-white">Dimension</th>
                  {overlap.dimensions.map((b) => (
                    <th key={b} className="p-1.5 font-bold text-slate-500 align-bottom">
                      <span className="block max-w-[64px] mx-auto leading-tight">{shortLabel(overlap.labels[b] || b)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overlap.dimensions.map((a) => (
                  <tr key={a}>
                    <td className="p-1.5 font-semibold text-slate-600 whitespace-nowrap sticky left-0 bg-white">
                      {shortLabel(overlap.labels[a] || a)}
                    </td>
                    {overlap.dimensions.map((b) => {
                      const value = overlap.matrix[a]?.[b] || 0;
                      const isDiag = a === b;
                      return (
                        <td
                          key={b}
                          className={`p-1.5 text-center rounded font-bold ${isDiag ? 'ring-1 ring-teal-400' : ''}`}
                          style={{
                            backgroundColor: isDiag
                              ? heatColor(value, maxOverlap, 'teal')
                              : heatColor(value, maxOverlap, 'rose'),
                            color: value > maxOverlap * 0.5 ? '#fff' : '#1e293b'
                          }}
                          title={`${overlap.labels[a] || a} ∩ ${overlap.labels[b] || b}: ${value.toLocaleString()}`}
                        >
                          {value > 0 ? value.toLocaleString() : '·'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400 italic">
            {overlap.unique_flagged.toLocaleString()} unique students carry at least one high/watch flag across the
            {` ${overlap.total_students.toLocaleString()} `} evaluated. Counts are deduplicated.
          </p>
        </div>

        {/* Department × Dimension Matrix */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-navy-950">Department × Dimension Heatmap</h3>
              <p className="text-[11px] text-slate-500">
                Share of each department flagged per dimension (%), normalized to department size.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-[11px] border-separate border-spacing-0.5">
              <thead>
                <tr>
                  <th className="text-left p-1.5 font-bold text-slate-500 sticky left-0 bg-white">Department</th>
                  {matrix.dimensions.map((d) => (
                    <th key={d} className="p-1.5 font-bold text-slate-500 align-bottom">
                      <span className="block max-w-[60px] mx-auto leading-tight">{shortLabel(matrix.labels[d] || d)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.cells.map((cell) => (
                  <tr key={cell.department}>
                    <td className="p-1.5 font-semibold text-slate-600 whitespace-nowrap sticky left-0 bg-white">
                      <span className="block max-w-[120px] truncate" title={cell.department}>
                        {cell.department}
                      </span>
                      <span className="text-[9px] text-slate-400 font-normal">n={cell.denominator.toLocaleString()}</span>
                    </td>
                    {matrix.dimensions.map((d) => {
                      const info = cell.dimensions[d];
                      const pct = info?.percentage || 0;
                      return (
                        <td
                          key={d}
                          className="p-1.5 text-center rounded font-bold"
                          style={{
                            backgroundColor: heatColor(pct, maxMatrixPercent, 'rose'),
                            color: pct > maxMatrixPercent * 0.5 ? '#fff' : '#1e293b'
                          }}
                          title={`${cell.department} · ${matrix.labels[d] || d}: ${info?.count || 0} of ${cell.denominator} (${pct}%)`}
                        >
                          {pct > 0 ? `${pct}` : '·'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400 italic">
            Cells show the percentage of the department flagged. Larger departments are not penalized — values are
            size-normalized.
          </p>
        </div>

      </div>

      {/* Threshold Catalogue */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy-950">Transparent Threshold Catalogue</h3>
            <p className="text-[11px] text-slate-500">
              Exact rule applied per dimension. Configurable in Settings &amp; Formulas.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {dimensions.thresholds.map((t) => (
            <div
              key={t.dimension}
              className="flex items-start justify-between gap-3 text-xs bg-slate-50 border border-slate-100 rounded-xl p-3"
            >
              <span className="font-bold text-slate-700">{t.label}</span>
              <span className="text-slate-500 text-right leading-relaxed">{t.rule}</span>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-xl bg-navy-950 text-slate-300 text-[11px] leading-relaxed flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
          <span>
            These flags support human review and early assistance. They are <strong className="text-white">not</strong> predictions
            of failure and never incorporate demographic attributes. Dimensions without source data remain N/A.
          </span>
        </div>
      </div>

    </div>
  );
};

export default RiskDimensionsView;
