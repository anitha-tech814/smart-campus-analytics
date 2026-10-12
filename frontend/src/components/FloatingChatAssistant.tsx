import React, { useEffect } from 'react';
import { ChatAssistant } from './ChatAssistant';
import { Bot, X, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
}

export const FloatingChatAssistant: React.FC<Props> = ({ isOpen, onClose, onToggle }) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Floating Action Button (Always Visible at bottom right) */}
      <div className="fixed bottom-6 right-6 z-40 no-print">
        <button
          onClick={onToggle}
          className="group relative flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-navy-950 to-navy-900 hover:from-navy-900 hover:to-navy-800 text-white font-bold text-xs shadow-xl border border-teal-500/30 hover:border-teal-400/60 transition-all duration-200 hover:-translate-y-0.5"
          title="Open Local AI Campus Assistant"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-teal-400 group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse border-2 border-navy-950" />
          </div>
          <span className="font-extrabold tracking-tight">AI Assistant</span>
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30">
            Local
          </span>
        </button>
      </div>

      {/* Slide-Over Drawer Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end no-print">
          
          {/* Backdrop overlay */}
          <div
            onClick={onClose}
            className="fixed inset-0 bg-navy-950/40 backdrop-blur-xs transition-opacity animate-fade-in"
          />

          {/* Slide-In Drawer Panel */}
          <div className="relative w-full max-w-xl h-full bg-white shadow-2xl flex flex-col z-10 animate-slide-right overflow-hidden border-l border-slate-200">
            {/* Top Close bar */}
            <div className="p-3 bg-navy-950 border-b border-navy-900 flex items-center justify-between text-white">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-400">
                <Sparkles className="w-4 h-4" />
                <span>Local RAG Assistant · Grounded Answers</span>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-navy-900 transition-colors"
                title="Close Assistant (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Assistant Body */}
            <div className="flex-1 overflow-hidden p-3 bg-slate-100/60 flex flex-col">
              <div className="flex-1 overflow-hidden rounded-2xl shadow-sm border border-slate-200 bg-white flex flex-col">
                <ChatAssistant />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
