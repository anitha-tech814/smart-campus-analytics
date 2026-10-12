import React from 'react';
import { AlertTriangle, AlertCircle, ShieldCheck, Info } from 'lucide-react';

interface Props {
  level: 'Critical' | 'High' | 'Medium' | 'Low' | 'Minimal' | string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<Props> = ({ level, showIcon = true, size = 'md' }) => {
  const norm = (level || 'Minimal').toLowerCase();

  let bg = 'bg-slate-100 text-slate-700 border-slate-200';
  let icon = <Info className="w-3.5 h-3.5" />;
  let label = level;

  if (norm === 'critical') {
    bg = 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/10 font-semibold';
    icon = <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />;
    label = 'Critical Support';
  } else if (norm === 'high') {
    bg = 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/10 font-semibold';
    icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />;
    label = 'High Priority';
  } else if (norm === 'medium') {
    bg = 'bg-yellow-50 text-yellow-800 border-yellow-200 font-medium';
    icon = <AlertCircle className="w-3.5 h-3.5 text-yellow-600" />;
    label = 'Medium Priority';
  } else if (norm === 'low') {
    bg = 'bg-sky-50 text-sky-700 border-sky-200 font-medium';
    icon = <Info className="w-3.5 h-3.5 text-sky-600" />;
    label = 'Low Priority';
  } else {
    bg = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium';
    icon = <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />;
    label = 'On Track';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2'
  }[size];

  return (
    <span className={`inline-flex items-center rounded-full border ${bg} ${sizeClasses} transition-all`}>
      {showIcon && icon}
      <span>{label}</span>
    </span>
  );
};
