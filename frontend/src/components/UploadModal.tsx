import React, { useState } from 'react';
import { uploadDataset } from '../services/api';
import {
  Upload,
  X,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Download,
  Info
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UploadModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  if (!isOpen) return null;

  const [file, setFile] = useState<File | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);

    try {
      const res = await uploadDataset(file, replaceExisting);
      setUploading(false);
      setResult(res);
      if (res.success) {
        onSuccess();
      }
    } catch (err: any) {
      setUploading(false);
      setResult({
        success: false,
        errors: [err.message || 'Network error occurred while uploading.']
      });
    }
  };

  const downloadSampleCsv = () => {
    const csvContent =
      "id,name,department,year,cgpa,attendance,lms_engagement,coding_score,aptitude_score,mock_interview_score,placement_status,historical_cgpa_prev,faculty_mentor\n" +
      "STU-SAMPLE-01,Aryan Verma,Computer Science,4,8.5,88.5,82.0,85.0,80.0,78.0,Ready,8.4,Dr. Ramesh Raman\n" +
      "STU-SAMPLE-02,Priya Nair,Electronics & Comm,3,6.2,68.0,45.0,38.0,52.0,42.0,Needs Training,7.3,Prof. Sunita Deshpande\n";

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "sample_students_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-navy-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Import Student Records</h3>
              <p className="text-xs text-slate-300">Supports CSV and Excel (.xlsx) with local validation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs">
          
          {/* Download Sample */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-700">
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              <span>Need the required column format?</span>
            </div>
            <button
              onClick={downloadSampleCsv}
              className="text-teal-700 hover:text-teal-800 font-bold flex items-center gap-1.5 hover:underline"
            >
              <Download className="w-3.5 h-3.5" />
              Download Template
            </button>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-teal-500 bg-teal-50/50'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/30'
            }`}
          >
            <input
              type="file"
              id="fileInput"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => e.target.files && setFile(e.target.files[0])}
              className="hidden"
            />
            <label htmlFor="fileInput" className="cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-800 text-sm">
                {file ? file.name : 'Click to select or drag and drop dataset file'}
              </p>
              <p className="text-slate-500 mt-1">
                CSV or Excel (.xlsx) with ID, Name, Department, CGPA, Attendance
              </p>
              {file && (
                <span className="inline-block mt-3 px-3 py-1 rounded-full bg-teal-100 text-teal-800 font-semibold">
                  {(file.size / 1024).toFixed(1)} KB selected
                </span>
              )}
            </label>
          </div>

          {/* Replace vs Merge option */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="replace"
              checked={replaceExisting}
              onChange={(e) => setReplaceExisting(e.target.checked)}
              className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
            />
            <label htmlFor="replace" className="font-medium text-slate-700 cursor-pointer">
              Replace entire current database with uploaded file (otherwise updates by ID)
            </label>
          </div>

          {/* Upload Status / Errors / Warnings */}
          {result && (
            <div className={`p-4 rounded-xl border space-y-2 ${
              result.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                {result.success ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Dataset Ingested Successfully
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Validation Errors Encountered
                  </>
                )}
              </div>

              {result.success && (
                <p className="text-emerald-800">
                  Imported <strong>{result.records_imported}</strong> new records, updated <strong>{result.records_updated}</strong> existing records.
                </p>
              )}

              {result.errors && result.errors.length > 0 && (
                <div className="space-y-1 pt-1">
                  <p className="font-semibold text-rose-800">Errors to resolve:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-rose-700 max-h-32 overflow-y-auto">
                    {result.errors.map((e: string, i: number) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.warnings && result.warnings.length > 0 && (
                <div className="space-y-1 pt-1">
                  <p className="font-semibold text-amber-800">Warnings:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-700 max-h-24 overflow-y-auto">
                    {result.warnings.map((w: string, i: number) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="px-5 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 disabled:opacity-40 text-white font-bold flex items-center gap-2 shadow-sm transition-colors"
            >
              {uploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Validating & Importing...
                </>
              ) : (
                'Import Dataset'
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
