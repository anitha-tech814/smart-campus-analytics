import React from 'react';
import { useCountUp } from '../hooks/useCountUp';
import { ArrowUpRight } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    text: string;
    type: 'positive' | 'negative' | 'neutral' | 'urgent';
  };
  onClick?: () => void;
  accentColor?: 'blue' | 'teal' | 'amber' | 'rose' | 'indigo';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  onClick,
  accentColor = 'blue'
}) => {
  // If value is numeric or percentage / score string, extract number for animated count-up.
  // The hook is always called (unconditionally) to satisfy the Rules of Hooks; a fallback
  // of 0 is passed for non-numeric values, which then bypass animation entirely.
  const numericValue = typeof value === 'number'
    ? value
    : parseFloat(String(value).replace(/[^0-9.-]+/g, ''));

  const isNumeric = !isNaN(numericValue);
  const isPercentage = typeof value === 'string' && value.includes('%');
  const decimals = typeof value === 'string' && value.includes('.') ? 1 : (Number.isInteger(numericValue) ? 0 : 2);

  const animatedValue = useCountUp(isNumeric ? numericValue : 0, 750, decimals);

  const displayValue = isNumeric
    ? (isPercentage ? `${animatedValue}%` : animatedValue)
    : value;

  const accentStyles = {
    blue: {
      bar: 'bg-blue-600',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      iconBg: 'bg-blue-50/80 text-blue-600 border-blue-100'
    },
    teal: {
      bar: 'bg-teal-500',
      badge: 'bg-teal-50 text-teal-700 border-teal-200',
      iconBg: 'bg-teal-50/80 text-teal-600 border-teal-100'
    },
    amber: {
      bar: 'bg-amber-500',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      iconBg: 'bg-amber-50/80 text-amber-600 border-amber-100'
    },
    rose: {
      bar: 'bg-rose-500',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      iconBg: 'bg-rose-50/80 text-rose-600 border-rose-100'
    },
    indigo: {
      bar: 'bg-indigo-600',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      iconBg: 'bg-indigo-50/80 text-indigo-600 border-indigo-100'
    }
  }[accentColor];

  const trendBg = {
    positive: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    negative: 'bg-rose-50 text-rose-700 border-rose-200/80',
    urgent: 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200'
  }[trend?.type || 'neutral'];

  return (
    <div
      onClick={onClick}
      className={`group relative bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:border-slate-300' : ''
      }`}
    >
      {/* Top Accent Strip */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${accentStyles.bar} opacity-80 group-hover:opacity-100 transition-opacity`} />

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <div className="text-2xl sm:text-3xl font-black text-navy-950 tracking-tight font-sans">
            {displayValue}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 font-medium pt-0.5">{subtitle}</p>
          )}
        </div>

        <div className={`p-3 rounded-xl border ${accentStyles.iconBg} transition-transform group-hover:scale-105 duration-200 shrink-0`}>
          {icon}
        </div>
      </div>

      {trend && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${trendBg}`}>
            {trend.text}
          </span>
          {onClick && (
            <span className="text-slate-400 group-hover:text-teal-600 transition-colors flex items-center gap-0.5 text-[11px] font-semibold">
              Inspect <ArrowUpRight className="w-3 h-3" />
            </span>
          )}
        </div>
      )}
    </div>
  );
};
