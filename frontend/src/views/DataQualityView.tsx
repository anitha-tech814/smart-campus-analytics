import React, { useCallback, useEffect, useState } from 'react';
import { DataQualityData } from '../types';
import { fetchDataQuality } from '../services/api';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ShieldCheck,
  History,
  RefreshCw,
  Layers,
  FileWarning,
  Loader2,
  Scale
} from 'lucide-react';

interface Props {
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const DataQualityView: React.FC<Props> = ({ onShowToast }) => {
  const [data, setData] = useState<DataQualityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDataQuality = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDataQuality();
      setData(res);
    } catch (err) {
      setError('Unable to load the data quality audit from the local analytics engine.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDataQuality();
  }, [loadDataQuality]);

  const handleRefresh = () => {
    loadDataQuality();
    onShowToast?.('Audit Refreshed', 'Data quality metrics recomputed from the active SQLite dataset.', 'info');
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 space-y-3">
        <Loader2 className="w-8 h-8 text-teal-500 mx-auto animate-spin" />
        <p className="text-sm font-semibold">Auditing data completeness and fairness across the full cohort...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-lg mx-auto mt-12 bg-white rounded-2xl border border-rose-200 shadow-xs p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <FileWarning className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-navy-950">Data Quality Audit Unavailable</h3>
        <p className="text-xs text-slate-600 leading-relaxed">{error}</p>
        <button
          onClick={loadDataQuality}
          className="px-4 py-2 rounded-xl bg-navy-950 hover:bg-navy-900 text-white text-xs font-bold transition-colors inline-flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Audit
        </button>
      </div>
    );
  }

  const deptEntries = Object.entries(data.department_sample_sizes).sort((a, b) => b[1] - a[1]);
  const maxDeptCount = Math.max(...deptEntries.map(([, c]) => c), 1);
  const coverage = data.historical_telemetry_coverage;
  const completenessHealthy = data.data_completeness_pct >= 99.0;
  const noDuplicates = data.duplicate_ids_detected === 0;

  const summaryCards = [
    {
      title: 'Total Records',
      value: data.total_records.toLocaleString(),
      subtitle: 'Active student telemetry rows',
      icon: <Database className="w-5 h-5" />,
      accent: 'bg-blue-50/80 text-blue-600 border-blue-100',
      bar: 'bg-blue-600'
    },
    {
      title: 'Data Completeness',
      value: `${data.data_completeness_pct}%`,
      subtitle: `${data.missing_fields_count} missing core fields`,
      icon: <CheckCircle2 className="w-5 h-5" />,
      accent: completenessHealthy
        ? 'bg-emerald-50/80 text-emerald-600 border-emerald-100'
        : 'bg-amber-50/80 text-amber-600 border-amber-100',
      bar: completenessHealthy ? 'bg-emerald-500' : 'bg-amber-500'
    },
    {
      title: 'Duplicate IDs',
      value: data.duplicate_ids_detected.toLocaleString(),
      subtitle: noDuplicates ? 'No conflicting identifiers' : 'Review duplicate enrolment IDs',
      icon: noDuplicates ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />,
      accent: noDuplicates
        ? 'bg-emerald-50/80 text-emerald-600 border-emerald-100'
        : 'bg-rose-50/80 text-rose-600 border-rose-100',
      bar: noDuplicates ? 'bg-emerald-500' : 'bg-rose-500'
    },
    {
      title: 'Historical Coverage',
      value: `${coverage.coverage_pct}%`,
      subtitle: `${coverage.available_count.toLocaleString()} with prior-term CGPA`,
      icon: <History className="w-5 h-5" />,
      accent: 'bg-indigo-50/80 text-indigo-600 border-indigo-100',
      bar: 'bg-indigo-600'
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8 animate-fade-in">

      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-navy-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30">
              <Scale className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-white">
              Data Quality, Completeness &amp; Fairness Audit
            </h2>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Live verification of dataset integrity across {data.total_records.toLocaleString()} records.
            This audit confirms completeness, duplicate integrity, sample distribution, and the institutional
            zero-demographic-bias policy. Generated {data.generated_at}.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="shrink-0 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-navy-950 font-bold text-xs transition-colors inline-flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Re-run Audit
        </button>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Department Sample Sizes */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-navy-950">Department Sample Sizes</h3>
              <p className="text-[11px] text-slate-500">Distribution of records across academic departments</p>
            </div>
          </div>

          <div className="space-y-3">
            {deptEntries.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No department data available.</p>
            ) : (
              deptEntries.map(([dept, count]) => (
                <div key={dept} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{dept}</span>
                    <span className="font-bold text-navy-950">{count.toLocaleString()}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-sky-400"
                      style={{ width: `${(count / maxDeptCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Historical Telemetry Coverage */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-navy-950">Longitudinal Telemetry Coverage</h3>
              <p className="text-[11px] text-slate-500">Students with verified prior-term progression data</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative w-28 h-28 shrink-0">
              <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${coverage.coverage_pct} ${100 - coverage.coverage_pct}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-navy-950">{coverage.coverage_pct}%</span>
                <span className="text-[9px] uppercase font-bold text-slate-400">Covered</span>
              </div>
            </div>

            <div className="space-y-3 text-xs flex-1">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="font-semibold text-emerald-800">Historical records tracked</span>
                <span className="font-black text-emerald-900">{coverage.available_count.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                <span className="font-semibold text-amber-800">Current-semester only</span>
                <span className="font-black text-amber-900">{coverage.missing_count.toLocaleString()}</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Records without prior-term telemetry are evaluated on current-semester signals only. No
                historical trajectory is assumed or fabricated.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Optional Dimension Coverage (N/A honesty) */}
      {data.optional_field_coverage && data.optional_field_coverage.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-navy-950">Optional Dimension Coverage</h3>
              <p className="text-[11px] text-slate-500">
                Availability of future-compatible fields. Absent fields are displayed as N/A and never inferred.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.optional_field_coverage.map((f) => (
              <div key={f.field} className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 capitalize">
                    {f.field.replace(/_/g, ' ')}
                  </span>
                  <span className={`font-bold ${f.coverage_pct > 0 ? 'text-slate-700' : 'text-slate-400'}`}>
                    {f.coverage_pct > 0 ? `${f.coverage_pct}%` : 'N/A'}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200/70 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${f.coverage_pct > 0 ? 'bg-gradient-to-r from-teal-500 to-sky-400' : 'bg-slate-300'}`}
                    style={{ width: `${f.coverage_pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  {f.available_count.toLocaleString()} of {data.total_records.toLocaleString()} records populated
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Observed Data Limitations */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="p-2 rounded-xl bg-amber-50 border border-amber-100 text-amber-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy-950">Observed Data Limitations</h3>
            <p className="text-[11px] text-slate-500">Transparency notes on how these metrics should be interpreted</p>
          </div>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.observed_data_limitations.map((limitation, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2.5 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3 leading-relaxed"
            >
              <span className="mt-0.5 w-4 h-4 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <span>{limitation}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Fairness Statement */}
      <div className="bg-navy-950 text-white rounded-2xl p-6 border border-navy-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Zero Demographic Bias Policy</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {data.fairness_statement}
        </p>
      </div>

    </div>
  );
};

export default DataQualityView;
