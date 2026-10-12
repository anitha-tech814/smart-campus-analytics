import React, { useState, useEffect, useMemo } from 'react';
import { Student, ScoringWeights, SettingsPayload } from '../types';
import { fetchStudents, fetchSettings } from '../services/api';
import {
  Sliders,
  Sparkles,
  Info,
  RotateCcw,
  TrendingUp,
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  Calendar,
  Code,
  Target,
  Layers,
  HelpCircle
} from 'lucide-react';

interface Props {
  onSelectStudent?: (studentId: string) => void;
  showToast?: (title: string, message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  cgpa: 0.30,
  attendance: 0.20,
  coding_score: 0.15,
  aptitude_score: 0.15,
  lms_engagement: 0.10,
  mock_interview_score: 0.10
};

export const SimulatorView: React.FC<Props> = ({ onSelectStudent, showToast }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [weights, setWeights] = useState<ScoringWeights>(DEFAULT_WEIGHTS);
  const [loading, setLoading] = useState(true);

  // Baseline metrics
  const [baselineCgpa, setBaselineCgpa] = useState<number>(7.0);
  const [baselineAtt, setBaselineAtt] = useState<number>(75.0);
  const [baselineCoding, setBaselineCoding] = useState<number>(60.0);
  const [baselineApt, setBaselineApt] = useState<number>(60.0);
  const [baselineLms, setBaselineLms] = useState<number>(65.0);
  const [baselineMock, setBaselineMock] = useState<number>(60.0);

  // Simulated metrics
  const [simCgpa, setSimCgpa] = useState<number>(7.0);
  const [simAtt, setSimAtt] = useState<number>(75.0);
  const [simCoding, setSimCoding] = useState<number>(60.0);
  const [simApt, setSimApt] = useState<number>(60.0);
  const [simLms, setSimLms] = useState<number>(65.0);
  const [simMock, setSimMock] = useState<number>(60.0);

  useEffect(() => {
    async function init() {
      try {
        const [stuRes, setRes] = await Promise.all([
          fetchStudents({ limit: 100 }),
          fetchSettings().catch(() => null)
        ]);
        setStudents(stuRes.items);
        if (setRes?.scoring_weights) {
          setWeights(setRes.scoring_weights);
        }
        if (stuRes.items.length > 0) {
          const first = stuRes.items[0];
          setSelectedStudentId(first.id);
          applyStudentBaseline(first);
        }
      } catch (e: any) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const applyStudentBaseline = (s: Student) => {
    setBaselineCgpa(s.cgpa);
    setBaselineAtt(s.attendance);
    setBaselineCoding(s.coding_score);
    setBaselineApt(s.aptitude_score);
    setBaselineLms(s.lms_engagement);
    setBaselineMock(s.mock_interview_score);

    setSimCgpa(s.cgpa);
    setSimAtt(s.attendance);
    setSimCoding(s.coding_score);
    setSimApt(s.aptitude_score);
    setSimLms(s.lms_engagement);
    setSimMock(s.mock_interview_score);
  };

  const handleStudentSelect = (id: string) => {
    setSelectedStudentId(id);
    const found = students.find(s => s.id === id);
    if (found) {
      applyStudentBaseline(found);
      if (showToast) {
        showToast('Student Baseline Loaded', `Loaded metrics for ${found.name} (${found.id})`, 'info');
      }
    }
  };

  const handleReset = () => {
    setSimCgpa(baselineCgpa);
    setSimAtt(baselineAtt);
    setSimCoding(baselineCoding);
    setSimApt(baselineApt);
    setSimLms(baselineLms);
    setSimMock(baselineMock);
    if (showToast) showToast('Simulator Reset', 'Restored to actual student baseline values.', 'info');
  };

  // Helper score calculator (normalized 0-100)
  const computeScore = (cgpa: number, att: number, code: number, apt: number, lms: number, mock: number) => {
    const cgpaNorm = (Math.min(Math.max(cgpa, 0), 10) / 10.0) * 100.0;
    const attNorm = Math.min(Math.max(att, 0), 100);
    const codeNorm = Math.min(Math.max(code, 0), 100);
    const aptNorm = Math.min(Math.max(apt, 0), 100);
    const lmsNorm = Math.min(Math.max(lms, 0), 100);
    const mockNorm = Math.min(Math.max(mock, 0), 100);

    const score = (
      cgpaNorm * weights.cgpa +
      attNorm * weights.attendance +
      codeNorm * weights.coding_score +
      aptNorm * weights.aptitude_score +
      lmsNorm * weights.lms_engagement +
      mockNorm * weights.mock_interview_score
    );

    return Math.round(score * 10) / 10;
  };

  const baselineScore = useMemo(() => {
    return computeScore(baselineCgpa, baselineAtt, baselineCoding, baselineApt, baselineLms, baselineMock);
  }, [baselineCgpa, baselineAtt, baselineCoding, baselineApt, baselineLms, baselineMock, weights]);

  const simulatedScore = useMemo(() => {
    return computeScore(simCgpa, simAtt, simCoding, simApt, simLms, simMock);
  }, [simCgpa, simAtt, simCoding, simApt, simLms, simMock, weights]);

  const scoreDelta = Math.round((simulatedScore - baselineScore) * 10) / 10;

  const getCategory = (score: number) => {
    if (score >= 85) return { label: 'Outstanding (Tier 1)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (score >= 70) return { label: 'High Achiever (Tier 2)', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    if (score >= 55) return { label: 'Satisfactory (Tier 3)', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' };
    if (score >= 40) return { label: 'Needs Support (Tier 4)', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'Critical Risk (Tier 5)', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  const simCat = getCategory(simulatedScore);
  const baseCat = getCategory(baselineScore);

  // Table factors
  const factorRows = [
    {
      factor: 'Academic CGPA',
      icon: <BookOpen className="w-4 h-4 text-indigo-500" />,
      weight: weights.cgpa,
      baselineRaw: baselineCgpa.toFixed(2),
      simRaw: simCgpa.toFixed(2),
      unit: '/ 10.0',
      baselineWeighted: ((baselineCgpa / 10.0) * 100.0 * weights.cgpa).toFixed(1),
      simWeighted: ((simCgpa / 10.0) * 100.0 * weights.cgpa).toFixed(1),
      delta: (((simCgpa - baselineCgpa) / 10.0) * 100.0 * weights.cgpa).toFixed(1)
    },
    {
      factor: 'Class Attendance',
      icon: <Calendar className="w-4 h-4 text-amber-500" />,
      weight: weights.attendance,
      baselineRaw: baselineAtt.toFixed(1),
      simRaw: simAtt.toFixed(1),
      unit: '%',
      baselineWeighted: (baselineAtt * weights.attendance).toFixed(1),
      simWeighted: (simAtt * weights.attendance).toFixed(1),
      delta: ((simAtt - baselineAtt) * weights.attendance).toFixed(1)
    },
    {
      factor: 'Coding Assessments',
      icon: <Code className="w-4 h-4 text-emerald-500" />,
      weight: weights.coding_score,
      baselineRaw: baselineCoding.toFixed(1),
      simRaw: simCoding.toFixed(1),
      unit: '/ 100',
      baselineWeighted: (baselineCoding * weights.coding_score).toFixed(1),
      simWeighted: (simCoding * weights.coding_score).toFixed(1),
      delta: ((simCoding - baselineCoding) * weights.coding_score).toFixed(1)
    },
    {
      factor: 'Quantitative Aptitude',
      icon: <Target className="w-4 h-4 text-purple-500" />,
      weight: weights.aptitude_score,
      baselineRaw: baselineApt.toFixed(1),
      simRaw: simApt.toFixed(1),
      unit: '/ 100',
      baselineWeighted: (baselineApt * weights.aptitude_score).toFixed(1),
      simWeighted: (simApt * weights.aptitude_score).toFixed(1),
      delta: ((simApt - baselineApt) * weights.aptitude_score).toFixed(1)
    },
    {
      factor: 'LMS Engagement',
      icon: <Layers className="w-4 h-4 text-cyan-500" />,
      weight: weights.lms_engagement,
      baselineRaw: baselineLms.toFixed(1),
      simRaw: simLms.toFixed(1),
      unit: '/ 100',
      baselineWeighted: (baselineLms * weights.lms_engagement).toFixed(1),
      simWeighted: (simLms * weights.lms_engagement).toFixed(1),
      delta: ((simLms - baselineLms) * weights.lms_engagement).toFixed(1)
    },
    {
      factor: 'Mock Interviews',
      icon: <Award className="w-4 h-4 text-blue-500" />,
      weight: weights.mock_interview_score,
      baselineRaw: baselineMock.toFixed(1),
      simRaw: simMock.toFixed(1),
      unit: '/ 100',
      baselineWeighted: (baselineMock * weights.mock_interview_score).toFixed(1),
      simWeighted: (simMock * weights.mock_interview_score).toFixed(1),
      delta: ((simMock - baselineMock) * weights.mock_interview_score).toFixed(1)
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sliders className="w-3.5 h-3.5" /> What-If Success Score Simulator
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hypothetical Score Modeling</h1>
          <p className="text-sm text-slate-500 mt-1">
            Explore how targeted academic interventions impact student success scores without altering active student database records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-medium text-sm transition-all shadow-sm"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            Reset to Baseline
          </button>
        </div>
      </div>

      {/* Non-destructive guarantee notice */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900 text-xs leading-relaxed">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Strict Non-Destructive Simulation Guarantee: </span>
          Hypothetical values adjusted via sliders are calculated live in-memory using the campus weighted scoring formula.
          Simulated scores are strictly labeled as hypothetical simulations and are never persisted or overwritten into actual student database records.
        </div>
      </div>

      {/* Select Student Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider shrink-0">
            Select Baseline Student:
          </label>
          <select
            value={selectedStudentId}
            onChange={e => handleStudentSelect(e.target.value)}
            className="flex-1 md:w-96 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
          >
            {students.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.id}) — {s.department} • CGPA {s.cgpa} • Att {s.attendance}%
              </option>
            ))}
          </select>
        </div>

        {selectedStudentId && (
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Current Risk: <span className="font-semibold text-slate-700">{students.find(s => s.id === selectedStudentId)?.risk_level}</span></span>
            <span>•</span>
            <span>Placement: <span className="font-semibold text-slate-700">{students.find(s => s.id === selectedStudentId)?.placement_status}</span></span>
          </div>
        )}
      </div>

      {/* Two Column Layout: Sliders & Real-Time Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Sliders (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Adjust Factor Values</h2>
              <span className="text-xs text-slate-400 font-mono">Formula Weights Applied</span>
            </div>

            {/* Slider 1: CGPA */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Academic CGPA
                  <span className="text-slate-400 font-normal">({(weights.cgpa * 100).toFixed(0)}% weight)</span>
                </span>
                <div className="space-x-2 font-mono">
                  <span className="text-slate-400 text-[11px]">Base: {baselineCgpa.toFixed(2)}</span>
                  <span className="font-bold text-indigo-600 text-sm bg-indigo-50 px-2 py-0.5 rounded">
                    {simCgpa.toFixed(2)} / 10.0
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.05"
                value={simCgpa}
                onChange={e => setSimCgpa(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Slider 2: Attendance */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" /> Class Attendance
                  <span className="text-slate-400 font-normal">({(weights.attendance * 100).toFixed(0)}% weight)</span>
                </span>
                <div className="space-x-2 font-mono">
                  <span className="text-slate-400 text-[11px]">Base: {baselineAtt.toFixed(1)}%</span>
                  <span className="font-bold text-amber-600 text-sm bg-amber-50 px-2 py-0.5 rounded">
                    {simAtt.toFixed(1)}%
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={simAtt}
                onChange={e => setSimAtt(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Slider 3: Coding */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-emerald-500" /> Coding Lab Score
                  <span className="text-slate-400 font-normal">({(weights.coding_score * 100).toFixed(0)}% weight)</span>
                </span>
                <div className="space-x-2 font-mono">
                  <span className="text-slate-400 text-[11px]">Base: {baselineCoding.toFixed(1)}</span>
                  <span className="font-bold text-emerald-600 text-sm bg-emerald-50 px-2 py-0.5 rounded">
                    {simCoding.toFixed(1)} / 100
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={simCoding}
                onChange={e => setSimCoding(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Slider 4: Aptitude */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-purple-500" /> Aptitude Assessment
                  <span className="text-slate-400 font-normal">({(weights.aptitude_score * 100).toFixed(0)}% weight)</span>
                </span>
                <div className="space-x-2 font-mono">
                  <span className="text-slate-400 text-[11px]">Base: {baselineApt.toFixed(1)}</span>
                  <span className="font-bold text-purple-600 text-sm bg-purple-50 px-2 py-0.5 rounded">
                    {simApt.toFixed(1)} / 100
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={simApt}
                onChange={e => setSimApt(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            {/* Slider 5: LMS Engagement */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-500" /> LMS Engagement Score
                  <span className="text-slate-400 font-normal">({(weights.lms_engagement * 100).toFixed(0)}% weight)</span>
                </span>
                <div className="space-x-2 font-mono">
                  <span className="text-slate-400 text-[11px]">Base: {baselineLms.toFixed(1)}</span>
                  <span className="font-bold text-cyan-600 text-sm bg-cyan-50 px-2 py-0.5 rounded">
                    {simLms.toFixed(1)} / 100
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={simLms}
                onChange={e => setSimLms(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Slider 6: Mock Interview */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-blue-500" /> Mock Interview Rating
                  <span className="text-slate-400 font-normal">({(weights.mock_interview_score * 100).toFixed(0)}% weight)</span>
                </span>
                <div className="space-x-2 font-mono">
                  <span className="text-slate-400 text-[11px]">Base: {baselineMock.toFixed(1)}</span>
                  <span className="font-bold text-blue-600 text-sm bg-blue-50 px-2 py-0.5 rounded">
                    {simMock.toFixed(1)} / 100
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={simMock}
                onChange={e => setSimMock(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Comparison Card & Outcomes (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Composite Score Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <h2 className="text-base font-bold text-slate-900 flex items-center justify-between">
              <span>Simulation Outcome</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                Formula Verified
              </span>
            </h2>

            <div className="grid grid-cols-2 gap-4 items-center text-center">
              {/* Baseline */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-medium text-slate-500">Baseline Score</div>
                <div className="text-3xl font-extrabold text-slate-700 mt-1 font-mono">
                  {baselineScore.toFixed(1)}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {baseCat.label.split(' ')[0]}
                </div>
              </div>

              {/* Simulated */}
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200">
                <div className="text-xs font-medium text-indigo-700">Simulated Score</div>
                <div className="text-3xl font-extrabold text-indigo-950 mt-1 font-mono">
                  {simulatedScore.toFixed(1)}
                </div>
                <div className="text-[10px] text-indigo-600 font-semibold mt-1">
                  {simCat.label.split(' ')[0]}
                </div>
              </div>
            </div>

            {/* Delta Banner */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${scoreDelta >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
              <div className="flex items-center gap-2">
                <TrendingUp className={`w-5 h-5 ${scoreDelta >= 0 ? 'text-emerald-600' : 'text-rose-600 rotate-180'}`} />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider">Hypothetical Delta (Δ)</div>
                  <div className="text-xs opacity-80">
                    {scoreDelta >= 0 ? 'Predicted gain from proposed actions' : 'Score regression observed'}
                  </div>
                </div>
              </div>
              <div className="text-2xl font-black font-mono">
                {scoreDelta >= 0 ? `+${scoreDelta.toFixed(1)}` : scoreDelta.toFixed(1)}
              </div>
            </div>

            {/* Tier Category Shift */}
            <div className="space-y-2 text-xs">
              <div className="text-slate-500 font-medium">Estimated Success Classification:</div>
              <div className={`px-3 py-2 rounded-lg border font-semibold text-center ${simCat.color}`}>
                {simCat.label}
              </div>
            </div>

            {/* Strategic Leverage Insight */}
            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Intervention Leverage Insight
              </div>
              <p className="leading-relaxed text-[11px]">
                CGPA ({(weights.cgpa * 100).toFixed(0)}%) and Attendance ({(weights.attendance * 100).toFixed(0)}%) represent {(weights.cgpa * 100 + weights.attendance * 100).toFixed(0)}% of composite weight. Prioritizing attendance recovery yields the most immediate numerical lift.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Factor Delta Contribution Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Factor Contribution Delta Breakdown</h3>
            <p className="text-xs text-slate-500">Transparent mathematical attribution of hypothetical changes</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-4">Factor</th>
                <th className="py-2.5 px-4">Weight</th>
                <th className="py-2.5 px-4">Baseline Raw</th>
                <th className="py-2.5 px-4">Simulated Raw</th>
                <th className="py-2.5 px-4">Baseline Weighted</th>
                <th className="py-2.5 px-4">Simulated Weighted</th>
                <th className="py-2.5 px-4 text-right">Attributed Delta (Δ)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {factorRows.map((r, idx) => {
                const deltaNum = parseFloat(r.delta);
                return (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-semibold text-slate-800 flex items-center gap-2">
                      {r.icon}
                      {r.factor}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">
                      {(r.weight * 100).toFixed(0)}%
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      {r.baselineRaw} {r.unit}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-indigo-700">
                      {r.simRaw} {r.unit}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      {r.baselineWeighted} pts
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-indigo-900">
                      {r.simWeighted} pts
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-right">
                      <span className={`px-2 py-0.5 rounded text-[11px] ${deltaNum > 0 ? 'bg-emerald-100 text-emerald-800' : deltaNum < 0 ? 'bg-rose-100 text-rose-800' : 'text-slate-400'}`}>
                        {deltaNum > 0 ? `+${r.delta}` : r.delta} pts
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
