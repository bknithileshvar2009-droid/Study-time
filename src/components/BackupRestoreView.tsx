import React, { useState, useRef } from 'react';
import { useStudy } from '../context/StudyContext';
import { BackupSnapshot } from '../types';
import { formatDurationHuman, formatDateDisplay } from '../utils/timeFormat';
import {
  Database,
  Download,
  Upload,
  Camera,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Cloud,
  RefreshCw,
  HardDrive,
  ShieldCheck,
  FileJson,
} from 'lucide-react';

export const BackupRestoreView: React.FC = () => {
  const {
    snapshots,
    createSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    exportFullDataJSON,
    importFullData,
    cloudStatus,
    triggerManualCloudSync,
    sessions,
    subjects,
    goals,
    dailyReviews,
    showToast,
  } = useStudy();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // New snapshot modal/input
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  // Import preview state
  const [importPreview, setImportPreview] = useState<{
    rawJson: any;
    sessionsCount: number;
    subjectsCount: number;
    goalsCount: number;
    reviewsCount: number;
  } | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  // 1. Export JSON download
  const handleExportJSON = () => {
    const jsonStr = exportFullDataJSON();
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `BK_NITHILESHVAR_Study_Backup_${dateStr}.json`;
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Full backup downloaded (${sessions.length} sessions).`);
  };

  // 2. Select file for import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const sessCount = Array.isArray(parsed.sessions) ? parsed.sessions.length : 0;
        const subjCount = Array.isArray(parsed.subjects) ? parsed.subjects.length : 0;
        const goalCount = Array.isArray(parsed.goals) ? parsed.goals.length : 0;
        const revCount = Array.isArray(parsed.dailyReviews) ? parsed.dailyReviews.length : 0;

        setImportPreview({
          rawJson: parsed,
          sessionsCount: sessCount,
          subjectsCount: subjCount,
          goalsCount: goalCount,
          reviewsCount: revCount,
        });
      } catch (err) {
        alert('Invalid JSON file format. Please ensure you selected a valid study backup JSON.');
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 3. Confirm Import
  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setIsImporting(true);
    try {
      const result = await importFullData(importPreview.rawJson, importMode);
      showToast(`Data restored successfully (${result.addedSessions} sessions processed).`);
      setImportPreview(null);
    } catch (err: any) {
      alert(`Import failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  // 4. Create Snapshot
  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingSnapshot(true);
    try {
      await createSnapshot(snapshotLabel.trim() || undefined);
      setSnapshotLabel('');
      showToast('Instant study snapshot created.');
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  // 5. Cloud Sync trigger
  const handleManualSync = async () => {
    setIsSyncingCloud(true);
    try {
      const success = await triggerManualCloudSync();
      if (success) {
        showToast('Firebase cloud sync completed.');
      } else {
        showToast('Firebase sync failed. Check internet connection.');
      }
    } finally {
      setIsSyncingCloud(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d0f17] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight text-white flex items-center gap-2">
              Backup, Restore & Cloud Sync
            </h1>
            <p className="text-xs text-slate-400">
              Preserve your authentic study records with JSON exports, local snapshots, and live Firebase synchronization.
            </p>
          </div>
        </div>

        {/* Cloud Status Pill */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111420] border border-slate-800 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                cloudStatus.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-300 font-mono text-[11px]">
              {cloudStatus.isConnected ? 'Firebase RTDB Connected' : 'Cloud Sync Idle'}
            </span>
          </div>

          <button
            onClick={handleManualSync}
            disabled={isSyncingCloud}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin text-amber-400' : ''}`} />
            <span>Sync Now</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Full JSON Export & Import Card */}
        <div className="bg-[#0a0c12] border border-slate-800/80 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <FileJson className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold text-white">JSON Archive Export & Import</h2>
            </div>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Export your entire database (sessions, syllabus, goals, reviews, and configurations) into a standardized JSON file, or restore from a previous archive.
            </p>

            {/* Quick Data Stats */}
            <div className="grid grid-cols-4 gap-2 mb-6 p-3 rounded-xl bg-[#111420] border border-slate-800 text-center">
              <div>
                <span className="text-sm font-bold font-mono text-amber-400">{sessions.length}</span>
                <span className="block text-[9px] text-slate-500 uppercase mt-0.5">Sessions</span>
              </div>
              <div>
                <span className="text-sm font-bold font-mono text-slate-200">{subjects.length}</span>
                <span className="block text-[9px] text-slate-500 uppercase mt-0.5">Subjects</span>
              </div>
              <div>
                <span className="text-sm font-bold font-mono text-slate-200">{goals.length}</span>
                <span className="block text-[9px] text-slate-500 uppercase mt-0.5">Goals</span>
              </div>
              <div>
                <span className="text-sm font-bold font-mono text-slate-200">{dailyReviews.length}</span>
                <span className="block text-[9px] text-slate-500 uppercase mt-0.5">Reviews</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Export Button */}
              <button
                onClick={handleExportJSON}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-bold rounded-xl shadow-md transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export Full Backup</span>
              </button>

              {/* Import Trigger */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors border border-slate-700"
              >
                <Upload className="w-4 h-4 text-amber-400" />
                <span>Import JSON Backup</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Encrypted local storage with zero-leak privacy. ₹0 budget compliant.</span>
          </div>
        </div>

        {/* Snapshot Generator Card */}
        <div className="bg-[#0a0c12] border border-slate-800/80 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <Camera className="w-5 h-5 text-rose-400" />
              <h2 className="text-sm font-bold text-white">Local Snapshot Generator</h2>
            </div>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Create an instant internal restore point before major revisions, timetable updates, or system tests.
            </p>

            <form onSubmit={handleCreateSnapshot} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Snapshot Label (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Before Physics Final Prep, Weekly milestone..."
                  value={snapshotLabel}
                  onChange={(e) => setSnapshotLabel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#141824] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingSnapshot}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/30 transition-colors"
              >
                <Camera className="w-4 h-4 text-amber-400" />
                <span>{isCreatingSnapshot ? 'Creating...' : 'Take Instant Snapshot'}</span>
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
            <span>Snapshots are safely stored in IndexedDB and mirrored to Firebase RTDB.</span>
          </div>
        </div>
      </div>

      {/* Import Preview Modal */}
      {importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0e111a] border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Upload className="w-5 h-5 text-amber-400" />
              Confirm Database Restore
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Review contents of the imported JSON file before applying to your study records.
            </p>

            <div className="p-4 rounded-xl bg-[#141824] border border-slate-800 space-y-2 mb-5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Study Sessions Detected:</span>
                <span className="font-mono font-bold text-amber-400">{importPreview.sessionsCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Subjects / Syllabus:</span>
                <span className="font-mono font-bold text-slate-200">{importPreview.subjectsCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Study Goals:</span>
                <span className="font-mono font-bold text-slate-200">{importPreview.goalsCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Daily Journals:</span>
                <span className="font-mono font-bold text-slate-200">{importPreview.reviewsCount}</span>
              </div>
            </div>

            {/* Mode selector */}
            <div className="space-y-2 mb-6">
              <label className="block text-xs font-semibold text-slate-300">
                Import Strategy:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setImportMode('merge')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    importMode === 'merge'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                      : 'bg-[#141824] border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="text-xs font-bold">Merge with Existing</div>
                  <div className="text-[10px] mt-0.5 text-slate-400">
                    Safely adds new records without deleting current data.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setImportMode('replace')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    importMode === 'replace'
                      ? 'bg-rose-500/10 border-rose-500 text-rose-300'
                      : 'bg-[#141824] border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="text-xs font-bold text-rose-400">Replace Everything</div>
                  <div className="text-[10px] mt-0.5 text-slate-400">
                    Overwrites entire current database with backup.
                  </div>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setImportPreview(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isImporting}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-black text-xs font-bold rounded-xl shadow-lg hover:from-amber-400 hover:to-amber-500"
              >
                {isImporting ? 'Restoring...' : 'Confirm Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snapshots Archive List */}
      <div className="bg-[#0a0c12] border border-slate-800/80 rounded-2xl p-6 shadow-lg">
        <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-amber-400" />
          Saved Local Snapshots ({snapshots.length})
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Roll back to any previous state in one click.
        </p>

        {snapshots.length === 0 ? (
          <p className="text-xs text-slate-500 py-8 text-center italic">
            No local snapshots created yet. Use the "Take Instant Snapshot" tool above.
          </p>
        ) : (
          <div className="space-y-3">
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                className="p-3.5 rounded-xl bg-[#111420] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">
                      {snap.label || 'Manual Snapshot'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {formatDateDisplay(snap.timestamp)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {snap.sessionsCount} sessions recorded • {snap.totalHours.toFixed(1)} total hours
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => {
                      if (confirm(`Restore snapshot "${snap.label || 'Snapshot'}"? Current records will be replaced.`)) {
                        restoreSnapshot(snap.id, 'replace');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm('Delete this snapshot?')) {
                        deleteSnapshot(snap.id);
                      }
                    }}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
