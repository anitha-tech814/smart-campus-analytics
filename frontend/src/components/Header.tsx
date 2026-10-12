import React from 'react';
import { NavTab } from './Sidebar';
import {
  Upload,
  Download,
  Bot,
  Sliders,
  RotateCcw,
  Menu,
  ChevronRight,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

interface Props {
  currentTab: NavTab;
  studentCount: number;
  supportCount?: number;
  dataStatus?: 'loading' | 'online' | 'offline' | 'empty';
  activeFilterSummary?: string;
  onOpenUpload: () => void;
  onOpenSettings: () => void;
  onToggleAssistant: () => void;
  onExportCsv: () => void;
  onResetFilters?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<Props> = ({
  currentTab,
  studentCount,
  supportCount = 0,
  dataStatus,
  activeFilterSummary,
  onOpenUpload,
  onOpenSettings,
  onToggleAssistant,
  onExportCsv,
  onResetFilters,
  onToggleMobileMenu
}) => {
  const titles: Record<NavTab, { title: string; category: string; subtitle: string }> = {
    dashboard: {
      category: 'Intelligence',
      title: 'Institutional Overview',
      subtitle: 'Key performance indicators, attendance compliance, and placement analytics'
    },
    students: {
      category: 'Data Management',
      title: 'Student Directory',
      subtitle: 'Roster directory with normalized academic signals and performance dossiers'
    },
    risk: {
      category: 'Early Warning',
      title: 'Early Warning & Risk',
      subtitle: 'Rule-based multi-factor flags and longitudinal progression drops for proactive faculty guidance'
    },
    branches: {
      category: 'Early Warning',
      title: 'Branch-wise Student Risk Analysis',
      subtitle: 'Per-branch risk overview, drill-down by priority & dimension, and a searchable at-risk student register'
    },
    dimensions: {
      category: 'Early Warning',
      title: 'Risk Dimensions & Overlap',
      subtitle: 'Explainable per-dimension flags, overlap statistics, and normalized department risk matrices'
    },
    interventions: {
      category: 'Faculty Action',
      title: 'Intervention Tracker',
      subtitle: 'Plan, record, and verify targeted mentoring, bootcamps, and measurable follow-ups'
    },
    simulator: {
      category: 'Simulation Modeling',
      title: 'What-If Success Simulator',
      subtitle: 'Non-destructive score forecasting using active formula weights and sensitivity sliders'
    },
    segmentation: {
      category: 'Machine Learning',
      title: 'Student Segmentation',
      subtitle: 'Unsupervised K-Means clustering into actionable educational archetypes'
    },
    recommendations: {
      category: 'Interventions',
      title: 'Prescriptive Recommendations',
      subtitle: 'Automated, targeted action playbooks and faculty case workflows'
    },
    report: {
      category: 'Governance',
      title: 'Executive Reports',
      subtitle: 'Institutional review document formatted for academic deans and board'
    },
    quality: {
      category: 'Governance',
      title: 'Data Quality & Fairness',
      subtitle: 'Live completeness, duplicate integrity, sample distribution, and zero-bias audit'
    },
    settings: {
      category: 'Configuration',
      title: 'Settings & Formulas',
      subtitle: 'Dynamic scoring weights, alert sensitivities, and database lifecycle'
    }
  };

  const currentInfo = titles[currentTab] || {
    category: 'Campus',
    title: 'Smart Campus Analytics',
    subtitle: ''
  };

  return (
    <header className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 sticky top-0 z-30 no-print shadow-2xs">
      
      {/* Left: Mobile Toggle, Breadcrumb & Page Title */}
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Toggle Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <span>Smart Campus</span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span className="text-slate-500 font-medium">{currentInfo.category}</span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span className="text-teal-700 font-bold">{currentInfo.title}</span>

            {/* Active filter badge in breadcrumb */}
            {activeFilterSummary && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                Filter: {activeFilterSummary}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 mt-0.5">
            <h2 className="text-base sm:text-lg font-black text-navy-950 tracking-tight">
              {currentInfo.title}
            </h2>
            {(() => {
              const status = dataStatus || (studentCount > 0 ? 'online' : 'empty');
              const badge: Record<
                'loading' | 'online' | 'offline' | 'empty',
                { dot: string; text: string; cls: string }
              > = {
                online: {
                  dot: 'bg-emerald-500',
                  text: `Demo Dataset (${studentCount.toLocaleString()} Records)`,
                  cls: 'bg-slate-100 text-slate-700 border-slate-200'
                },
                loading: {
                  dot: 'bg-amber-400 animate-pulse',
                  text: 'Loading campus data…',
                  cls: 'bg-slate-100 text-slate-600 border-slate-200'
                },
                offline: {
                  dot: 'bg-rose-500',
                  text: 'Backend Offline',
                  cls: 'bg-rose-50 text-rose-700 border-rose-200'
                },
                empty: {
                  dot: 'bg-slate-400',
                  text: 'No Data — Import CSV',
                  cls: 'bg-amber-50 text-amber-700 border-amber-200'
                }
              };
              const s = badge[status];
              return (
                <span
                  className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border items-center gap-1 ${s.cls}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
                  {s.text}
                </span>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Right: Quick Action Controls */}
      <div className="flex items-center flex-wrap gap-2 text-xs">
        {/* Reset Filters action button if filters are active */}
        {activeFilterSummary && onResetFilters && (
          <button
            onClick={onResetFilters}
            className="px-2.5 py-1.5 rounded-xl border border-amber-200 bg-amber-50/80 hover:bg-amber-100 font-semibold text-amber-800 flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Clear all active filters"
          >
            <RotateCcw className="w-3 h-3 text-amber-700" />
            <span>Reset Filters</span>
          </button>
        )}

        <button
          onClick={onOpenUpload}
          className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors hover:border-slate-300"
          title="Import CSV or Excel dataset"
        >
          <Upload className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Import</span>
        </button>

        <button
          onClick={onExportCsv}
          className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors hover:border-slate-300"
          title="Export Active Dataset to CSV"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Export CSV</span>
        </button>

        <button
          onClick={onToggleAssistant}
          className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-navy-950 font-bold flex items-center gap-1.5 shadow-xs transition-all hover:shadow-teal-500/20"
          title="Open Local AI Assistant"
        >
          <Bot className="w-3.5 h-3.5" />
          <span>AI Assistant</span>
          <span className="w-1.5 h-1.5 rounded-full bg-navy-950 animate-pulse hidden sm:inline-block" />
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-navy-950 transition-colors hover:border-slate-300"
          title="Configure Scoring Weights & Alert Thresholds"
          aria-label="Settings"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>

    </header>
  );
};
