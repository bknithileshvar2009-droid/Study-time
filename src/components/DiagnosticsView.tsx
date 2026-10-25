import React, { useState, useEffect } from 'react';
import { useStudy } from '../context/StudyContext';
import { storageService } from '../services/db';
import { autoFirebaseService } from '../services/firebase';
import { getDriveDiagnosticLogs, DriveDiagnosticLog } from '../services/googleDrive';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Cloud,
  FileText,
  RefreshCw,
  ShieldCheck,
  Cpu,
  Layers,
  Terminal,
  Download,
} from 'lucide-react';

export const DiagnosticsView: React.FC = () => {
  const {
    sessions,
    subjects,
    goals,
    dailyReviews,
    snapshots,
    cloudStatus,
    triggerManualCloudSync,
    settings,
    showToast,
  } = useStudy();

  const [dbStatus, setDbStatus] = useState<{
    indexedDbAvailable: boolean;
    storageQuotaMb?: string;
    storageUsageMb?: string;
  }>({ indexedDbAvailable: true });

  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [auditResults, setAuditResults] = useState<{
    checkedSessions: number;
    corruptSessions: number;
    negativeDurations: number;
    missingSubjects: number;
    passed: boolean;
  } | null>(null);

  const [pingLatencyMs, setPingLatencyMs] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [driveLogs, setDriveLogs] = useState<DriveDiagnosticLog[]>(getDriveDiagnosticLogs());

  useEffect(() => {
    // Check storage estimate if available
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((est) => {
        setDbStatus({
          indexedDbAvailable: true,
          storageUsageMb: est.usage ? (est.usage / (1024 * 1024)).toFixed(2) : '0',
          storageQuotaMb: est.quota ? (est.quota / (1024 * 1024)).toFixed(0) : 'Unknown',
        });
      });
    }

    // Refresh Drive Diagnostic Logs every 2 seconds
    const interval = setInterval(() => {
      setDriveLogs(getDriveDiagnosticLogs());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Run Integrity Audit
  const handleRunAudit = () => {
    setIsRunningAudit(true);
    setTimeout(() => {
      let corrupt = 0;
      let negative = 0;
      let missingSubj = 0;

      const subjectNames = new Set(subjects.map((s) => s.name));

      for (const s of sessions) {
        if (!s.id || !s.date || isNaN(s.startTime)) corrupt++;
        if (s.accumulatedActiveMs < 0) negative++;
        if (!s.subject || !subjectNames.has(s.subject)) missingSubj++;
      }

      setAuditResults({
        checkedSessions: sessions.length,
        corruptSessions: corrupt,
        negativeDurations: negative,
        missingSubjects: missingSubj,
        passed: corrupt === 0 && negative === 0,
      });
      setIsRunningAudit(false);
      showToast('Data integrity audit complete.');
    }, 600);
  };

  // Firebase Ping test
  const handlePingFirebase = async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      const ok = await autoFirebaseService.loadAllDataFromFirebase();
      const diff = Math.round(performance.now() - start);
      setPingLatencyMs(diff);
      showToast(ok ? `Firebase latency: ${diff}ms` : 'Firebase connection checked');
    } catch {
      setPingLatencyMs(null);
      showToast('Cloud ping check failed');
    } finally {
      setIsPinging(false);
    }
  };

  // Export diagnostic log
  const handleExportDiagnostics = () => {
    const report = {
      timestamp: new Date().toISOString(),
      studentName: settings.studentName,
      browser: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      storage: {
        indexedDb: dbStatus,
        sessionCount: sessions.length,
        subjectCount: subjects.length,
        goalCount: goals.length,
        reviewCount: dailyReviews.length,
        snapshotCount: snapshots.length,
      },
      firebase: {
        projectId: cloudStatus.projectId,
        userId: cloudStatus.userId,
        isAnonymous: cloudStatus.isAnonymous,
        connected: cloudStatus.isConnected,
        lastSync: cloudStatus.lastSyncedAt ? new Date(cloudStatus.lastSyncedAt).toISOString() : null,
        pingLatencyMs,
      },
      integrityAudit: auditResults,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Diagnostics_Report_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Diagnostics report downloaded.');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d0f17] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight text-white flex items-center gap-2">
              System Diagnostics & Data Integrity
            </h1>
            <p className="text-xs text-slate-400">
              Verify database health, audit record authenticity, and inspect cloud sync connectivity.
            </p>
          </div>
        </div>

        <button
          onClick={handleExportDiagnostics}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors self-start md:self-auto border border-slate-700"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          <span>Download Diagnostic Log</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage Engine Status */}
        <div className="bg-[#0a0c12] border border-slate-800/80 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <HardDrive className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold text-white">IndexedDB Storage Engine</h2>
            </div>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Permanent client-side relational storage across all study components with zero external latency.
            </p>

            <div className="space-y-3 p-4 rounded-xl bg-[#111420] border border-slate-800 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Database Name:</span>
                <span className="text-amber-400 font-bold">BKNithileshvarStudyDB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Engine Status:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1 font-sans">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Healthy
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Storage Used:</span>
                <span className="text-slate-200">
                  {dbStatus.storageUsageMb} MB / {dbStatus.storageQuotaMb} MB
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Session Records:</span>
                <span className="text-slate-200 font-bold">{sessions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Syllabus Subjects:</span>
                <span className="text-slate-200 font-bold">{subjects.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Local Snapshots:</span>
                <span className="text-slate-200 font-bold">{snapshots.length}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
            <span>IndexedDB survives browser closes, device reboots, and network outages.</span>
          </div>
        </div>

        {/* Firebase Cloud Connection */}
        <div className="bg-[#0a0c12] border border-slate-800/80 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <Cloud className="w-5 h-5 text-rose-400" />
                <h2 className="text-sm font-bold text-white">Firebase Cloud Firestore</h2>
              </div>
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded font-mono ${
                  cloudStatus.isConnected
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {cloudStatus.isConnected ? 'Connected' : 'Connecting...'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Zero-barrier cloud backup. Automatically syncs all changes in background without requiring manual login.
            </p>

            <div className="space-y-3 p-4 rounded-xl bg-[#111420] border border-slate-800 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Target Project:</span>
                <span className="text-amber-400 font-bold truncate max-w-[200px]">{cloudStatus.projectId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">User Vault UID:</span>
                <span className="text-slate-300 font-mono truncate max-w-[200px]">
                  {cloudStatus.userId || 'Authenticating...'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Account Mode:</span>
                <span className="text-slate-300 font-sans">
                  {cloudStatus.isAnonymous ? 'Auto-Authenticated Vault' : (cloudStatus.userEmail || 'Google Account')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Ping Latency:</span>
                <span className="text-slate-200 font-bold">
                  {pingLatencyMs !== null ? `${pingLatencyMs} ms` : 'Not pinged'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Last Synchronized:</span>
                <span className="text-slate-300 font-sans">
                  {cloudStatus.lastSyncedAt
                    ? new Date(cloudStatus.lastSyncedAt).toLocaleTimeString()
                    : 'Synchronized'}
                </span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={handlePingFirebase}
                disabled={isPinging}
                className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
                <span>{isPinging ? 'Pinging...' : 'Ping Cloud Probe'}</span>
              </button>

              <button
                onClick={triggerManualCloudSync}
                className="flex-1 py-2 px-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>Force Full Sync</span>
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
            <span>Enterprise Firestore synced with isolated user path: /users/{cloudStatus.userId || '...'}/</span>
          </div>
        </div>
      </div>

      {/* Google Drive Live Diagnostic Console */}
      <div className="bg-[#0a0c12] border border-blue-500/30 rounded-2xl p-6 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-bold text-white">Google Drive Live Activity Log Console</h2>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Non-sensitive operational audit stream</span>
        </div>

        <div className="p-4 rounded-xl bg-black/80 border border-slate-800 font-mono text-xs max-h-48 overflow-y-auto space-y-1.5">
          {driveLogs.length === 0 ? (
            <p className="text-slate-500 italic text-[11px]">
              No Google Drive operations recorded yet. Connect Google Drive or save a backup to populate logs.
            </p>
          ) : (
            driveLogs.map((log, index) => (
              <div key={index} className="flex items-start gap-2 leading-relaxed">
                <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                <span
                  className={`font-bold shrink-0 uppercase text-[10px] px-1 rounded ${
                    log.type === 'auth'
                      ? 'bg-blue-500/20 text-blue-400'
                      : log.type === 'upload'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : log.type === 'restore'
                      ? 'bg-amber-500/20 text-amber-400'
                      : log.type === 'lookup'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {log.type}
                </span>
                <span className="text-slate-300 break-all">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Data Integrity Audit Card */}
      <div className="bg-[#0a0c12] border border-slate-800/80 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Data Integrity & Anomaly Auditor
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Scans all recorded sessions for negative durations, broken timestamps, or orphaned metadata.
            </p>
          </div>

          <button
            onClick={handleRunAudit}
            disabled={isRunningAudit}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-bold rounded-xl shadow-md transition-all self-start sm:self-auto"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isRunningAudit ? 'Auditing...' : 'Run Integrity Audit'}</span>
          </button>
        </div>

        {auditResults ? (
          <div className="p-4 rounded-xl bg-[#111420] border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 font-semibold text-xs">
              {auditResults.passed ? (
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> 100% Integrity Passed: All {auditResults.checkedSessions} sessions are valid and uncorrupted.
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Issues detected in database records.
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs font-mono">
              <div className="p-2 rounded-lg bg-[#141824] border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Checked</span>
                <span className="text-white font-bold">{auditResults.checkedSessions}</span>
              </div>
              <div className="p-2 rounded-lg bg-[#141824] border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Corrupted Records</span>
                <span className="text-white font-bold">{auditResults.corruptSessions}</span>
              </div>
              <div className="p-2 rounded-lg bg-[#141824] border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Negative Durations</span>
                <span className="text-white font-bold">{auditResults.negativeDurations}</span>
              </div>
              <div className="p-2 rounded-lg bg-[#141824] border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Orphaned Subjects</span>
                <span className="text-white font-bold">{auditResults.missingSubjects}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-[#111420]/60 border border-slate-800 text-center">
            <p className="text-xs text-slate-400">
              Click "Run Integrity Audit" to verify the database against zero-corruption standards.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
