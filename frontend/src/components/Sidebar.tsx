import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  Target,
  Sparkles,
  FileText,
  Sliders,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Database,
  UserCheck,
  Calculator,
  ShieldCheck,
  Radar,
  Building2
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'students'
  | 'risk'
  | 'branches'
  | 'dimensions'
  | 'interventions'
  | 'simulator'
  | 'segmentation'
  | 'recommendations'
  | 'report'
  | 'quality'
  | 'settings';

interface Props {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  supportCount?: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<Props> = ({
  currentTab,
  onTabChange,
  supportCount = 0,
  isCollapsed,
  onToggleCollapse
}) => {
  const [hoveredTab, setHoveredTab] = useState<NavTab | null>(null);

  const navItems: {
    id: NavTab;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
    badgeColor?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />
    },
    {
      id: 'risk',
      label: 'Early Warning & Risk',
      icon: <AlertTriangle className="w-4 h-4" />,
      badge: supportCount > 0 ? supportCount : undefined,
      badgeColor: 'bg-rose-500 text-white'
    },
    {
      id: 'branches',
      label: 'Branch Risk Analysis',
      icon: <Building2 className="w-4 h-4" />
    },
    {
      id: 'dimensions',
      label: 'Risk Dimensions',
      icon: <Radar className="w-4 h-4" />
    },
    {
      id: 'interventions',
      label: 'Intervention Tracker',
      icon: <UserCheck className="w-4 h-4" />
    },
    {
      id: 'simulator',
      label: 'What-If Simulator',
      icon: <Calculator className="w-4 h-4" />
    },
    {
      id: 'students',
      label: 'Student Directory',
      icon: <Users className="w-4 h-4" />
    },
    {
      id: 'segmentation',
      label: 'Student Segmentation',
      icon: <Target className="w-4 h-4" />
    },
    {
      id: 'recommendations',
      label: 'Action Hub',
      icon: <Sparkles className="w-4 h-4" />
    },
    {
      id: 'report',
      label: 'Reports',
      icon: <FileText className="w-4 h-4" />
    },
    {
      id: 'quality',
      label: 'Data Quality & Fairness',
      icon: <ShieldCheck className="w-4 h-4" />
    },
    {
      id: 'settings',
      label: 'Settings & Formulas',
      icon: <Sliders className="w-4 h-4" />
    }
  ];

  return (
    <aside
      className={`bg-navy-950 text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-navy-900 select-none no-print transition-all duration-300 ease-in-out relative z-40 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className={`p-4 border-b border-navy-900/80 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between gap-3'}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-sky-400 text-navy-950 flex items-center justify-center font-black shadow-md shadow-teal-500/10 shrink-0">
            <GraduationCap className="w-5 h-5 text-navy-950" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden whitespace-nowrap animate-fade-in">
              <h1 className="text-sm font-extrabold text-white tracking-tight leading-tight">
                Smart Campus
              </h1>
              <p className="text-[10px] uppercase font-bold tracking-widest text-teal-400">
                Analytics Platform
              </p>
            </div>
          )}
        </div>

        {/* Desktop Toggle Button */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 rounded-lg bg-navy-900/80 hover:bg-navy-800 text-slate-400 hover:text-white transition-colors"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto overflow-x-hidden">
        {!isCollapsed && (
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-3 py-2 animate-fade-in">
            Academic Intelligence
          </div>
        )}

        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <div
              key={item.id}
              className="relative"
              onMouseEnter={() => setHoveredTab(item.id)}
              onMouseLeave={() => setHoveredTab(null)}
            >
              <button
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-semibold transition-all group relative ${
                  isActive
                    ? 'bg-teal-500 text-navy-950 font-bold shadow-md shadow-teal-500/20'
                    : 'text-slate-300 hover:bg-navy-900/80 hover:text-white'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className={`flex items-center ${isCollapsed ? '' : 'gap-3'} min-w-0`}>
                  <span className={`shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-navy-950' : 'text-slate-400 group-hover:text-teal-400'}`}>
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </div>

                {!isCollapsed && item.badge !== undefined && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${item.badgeColor || 'bg-navy-800 text-slate-300'}`}>
                    {item.badge}
                  </span>
                )}

                {/* Collapsed dot badge for alerts */}
                {isCollapsed && item.badge !== undefined && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>

              {/* Floating Tooltip when Sidebar is Collapsed */}
              {isCollapsed && hoveredTab === item.id && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 px-3 py-1.5 bg-navy-900 text-white rounded-xl text-xs font-bold shadow-xl border border-navy-700 whitespace-nowrap pointer-events-none animate-fade-in flex items-center gap-2">
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-navy-800 text-slate-300'}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer Local Status */}
      <div className={`p-3 border-t border-navy-900/80 m-2 rounded-xl bg-navy-900/50 border border-navy-800/60 ${isCollapsed ? 'text-center' : ''}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'}`}>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></div>
          {!isCollapsed && (
            <span className="text-[11px] font-bold text-white truncate">100% Local SQLite</span>
          )}
        </div>
        {!isCollapsed && (
          <p className="text-[10px] text-slate-300 leading-relaxed mt-1">
            Zero cloud APIs &bull; Scikit-Learn ML
          </p>
        )}
      </div>
    </aside>
  );
};
