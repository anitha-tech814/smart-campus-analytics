import React, { useState, useEffect } from 'react';
import { fetchSettings, saveSettings, resetDemoData, clearAllData } from '../services/api';
import { ScoringWeights, RiskThresholds } from '../types';
import {
  Settings,
  Sliders,
  RotateCcw,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Shield,
  Save,
  Info
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved: () => void;
}

export const WeightSettingsModal: React.FC<Props> = ({ isOpen, onClose, onSettingsSaved }) => {
  if (!isOpen) return null;

  const [weights, setWeights] = useState<ScoringWeights>({
    cgpa: 0.25,
    attendance: 0.20,
    lms_engagement: 0.15,
    coding_score: 0.15,
    aptitude_score: 0.15,
    mock_interview_score: 0.10
  });

  const [thresholds, setThresholds] = useState<RiskThresholds>({
    attendance_critical: 70.0,
    attendance_warning: 75.0,
    cgpa_critical: 5.5,
    cgpa_warning: 6.5,
    cgpa_drop_threshold: 1.0,
    coding_warning: 45.0,
    aptitude_warning: 50.0,
    mock_interview_warning: 45.0,
    success_score_critical: 45.0,
    success_score_warning: 60.0
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetchSettings().then((res) => {
      if (res.scoring_weights) setWeights(res.scoring_weights);
      if (res.risk_thresholds) setThresholds(res.risk_thresholds);
    }).catch(console.error);
  }, []);

  const totalWeightPct = Math.round(
    (weights.cgpa +
      weights.attendance +
      weights.lms_engagement +
      weights.coding_score +
      weights.aptitude_score +
      weights.mock_interview_score) * 100
  );

  const handleWeightChange = (key: keyof ScoringWeights, val: number) => {
    setWeights((prev) => ({
      ...prev,
      [key]: Math.max(0, Math.min(100, val)) / 100
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    try {
      await saveSettings({
        scoring_weights: weights,
        risk_thresholds: thresholds
      });
      setLoading(false);
      setSuccessMsg('Settings and scoring formulas updated successfully!');
      onSettingsSaved();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setLoading(false);
      alert('Failed to save settings: ' + err.message);
    }
  };

  const handleResetDemo = async () => {
    if (window.confirm('Reset database to the default synthetic demo dataset (12,000 student records)? A backup is saved to backend/backups before reset. This will overwrite current custom entries.')) {
      setResetting(true);
      try {
        await resetDemoData();
        setResetting(false);
        alert('Reset to demo dataset completed successfully!');
        onSettingsSaved();
        onClose();
      } catch (err: any) {
        setResetting(false);
        alert('Failed to reset: ' + err.message);
      }
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to delete ALL student records? The database will become empty.')) {
      setResetting(true);
      try {
        await clearAllData();
        setResetting(false);
        alert('All student records cleared.');
        onSettingsSaved();
        onClose();
      } catch (err: any) {
        setResetting(false);
        alert('Failed to clear data: ' + err.message);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-navy-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">System Settings & Algorithm Weights</h3>
              <p className="text-xs text-slate-300">Tune scoring formula and risk thresholds locally</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
          >
            &times;
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              {successMsg}
            </div>
          )}

          {/* Scoring Weights Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Success Score Dimension Weights</h4>
                <p className="text-slate-500 text-[11px]">Weights are normalized automatically to sum to 100%.</p>
              </div>
              <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                totalWeightPct === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                Sum: {totalWeightPct}%
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between mb-1 font-semibold text-slate-700">
                  <span>Academic CGPA:</span>
                  <span className="text-teal-700 font-bold">{Math.round(weights.cgpa * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={Math.round(weights.cgpa * 100)}
                  onChange={(e) => handleWeightChange('cgpa', Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1 font-semibold text-slate-700">
                  <span>Class Attendance:</span>
                  <span className="text-teal-700 font-bold">{Math.round(weights.attendance * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={Math.round(weights.attendance * 100)}
                  onChange={(e) => handleWeightChange('attendance', Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1 font-semibold text-slate-700">
                  <span>LMS Engagement:</span>
                  <span className="text-teal-700 font-bold">{Math.round(weights.lms_engagement * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={Math.round(weights.lms_engagement * 100)}
                  onChange={(e) => handleWeightChange('lms_engagement', Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1 font-semibold text-slate-700">
                  <span>Coding Lab Score:</span>
                  <span className="text-teal-700 font-bold">{Math.round(weights.coding_score * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={Math.round(weights.coding_score * 100)}
                  onChange={(e) => handleWeightChange('coding_score', Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1 font-semibold text-slate-700">
                  <span>Quantitative Aptitude:</span>
                  <span className="text-teal-700 font-bold">{Math.round(weights.aptitude_score * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={Math.round(weights.aptitude_score * 100)}
                  onChange={(e) => handleWeightChange('aptitude_score', Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1 font-semibold text-slate-700">
                  <span>Mock Interview:</span>
                  <span className="text-teal-700 font-bold">{Math.round(weights.mock_interview_score * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={Math.round(weights.mock_interview_score * 100)}
                  onChange={(e) => handleWeightChange('mock_interview_score', Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Risk Thresholds Section */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h4 className="font-bold text-slate-900 text-sm">Explainable Risk Detection Thresholds</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Attendance Critical (&lt; %)</label>
                <input
                  type="number"
                  value={thresholds.attendance_critical}
                  onChange={(e) => setThresholds({ ...thresholds, attendance_critical: Number(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Attendance Warning (&lt; %)</label>
                <input
                  type="number"
                  value={thresholds.attendance_warning}
                  onChange={(e) => setThresholds({ ...thresholds, attendance_warning: Number(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">CGPA Warning (&lt; 10)</label>
                <input
                  type="number"
                  step="0.1"
                  value={thresholds.cgpa_warning}
                  onChange={(e) => setThresholds({ ...thresholds, cgpa_warning: Number(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">CGPA Drop Flag (&ge; pts)</label>
                <input
                  type="number"
                  step="0.1"
                  value={thresholds.cgpa_drop_threshold}
                  onChange={(e) => setThresholds({ ...thresholds, cgpa_drop_threshold: Number(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Coding Deficit (&lt; 100)</label>
                <input
                  type="number"
                  value={thresholds.coding_warning}
                  onChange={(e) => setThresholds({ ...thresholds, coding_warning: Number(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Mock Deficit (&lt; 100)</label>
                <input
                  type="number"
                  value={thresholds.mock_interview_warning}
                  onChange={(e) => setThresholds({ ...thresholds, mock_interview_warning: Number(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Database Reset Controls */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 text-sm">Dataset Lifecycle Management</h4>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleResetDemo}
                disabled={resetting}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold flex items-center gap-2 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-teal-600" />
                Reset to Default Demo Dataset (12,000 Students)
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={resetting}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold flex items-center gap-2 transition-colors border border-rose-200"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                Clear All Student Records
              </button>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">Local Privacy Guarantee:</p>
              <p className="mt-0.5">
                All records, formulas, calculations, and local machine learning models run exclusively on this machine. No student information or analytics data is ever transmitted to external cloud servers or commercial AI APIs.
              </p>
            </div>
          </div>

          {/* Footer Save */}
          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold flex items-center gap-2 shadow-sm transition-colors"
            >
              <Save className="w-4 h-4 text-teal-400" />
              {loading ? 'Saving Changes...' : 'Save Configuration'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
