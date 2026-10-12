import React from 'react';
import { CheckCircle2, AlertTriangle, Info, AlertCircle, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title?: string;
  message: string;
}

interface ToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
          info: <Info className="w-4 h-4 text-sky-500 shrink-0" />,
          warning: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
          error: <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
        }[toast.type];

        const borders = {
          success: 'border-emerald-200 bg-white/95 text-slate-800 shadow-emerald-500/10',
          info: 'border-sky-200 bg-white/95 text-slate-800 shadow-sky-500/10',
          warning: 'border-amber-200 bg-white/95 text-slate-800 shadow-amber-500/10',
          error: 'border-rose-200 bg-white/95 text-slate-800 shadow-rose-500/10'
        }[toast.type];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur-md animate-toast transition-all ${borders}`}
          >
            <div className="mt-0.5">{icons}</div>
            <div className="flex-1 min-w-0">
              {toast.title && (
                <div className="text-xs font-bold text-navy-950 mb-0.5">{toast.title}</div>
              )}
              <div className="text-xs text-slate-600 leading-snug">{toast.message}</div>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg transition-colors"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
