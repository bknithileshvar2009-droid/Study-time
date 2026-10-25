import React, { useState, useEffect } from 'react';
import { useStudy } from '../context/StudyContext';
import {
  authenticateGoogleDrive,
  listDriveFiles,
  uploadJsonToDrive,
  uploadPdfToDrive,
  getDriveFileContent,
  deleteDriveFile,
  getDriveStorageAbout,
  getCachedDriveToken,
  DriveFileItem,
} from '../services/googleDrive';
import { buildProductionStudyReport } from '../services/pdfReport';
import { ConfirmModal } from './ConfirmModal';
import {
  HardDrive,
  CloudUpload,
  RefreshCw,
  FileJson,
  FileText,
  Trash2,
  ExternalLink,
  Download,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Search,
  User,
} from 'lucide-react';

export const GoogleDriveView: React.FC = () => {
  const {
    exportFullDataJSON,
    importFullData,
    sessions,
    subjects,
    goals,
    dailyReviews,
    settings,
    showToast,
  } = useStudy();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(Boolean(getCachedDriveToken()));
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [driveUserEmail, setDriveUserEmail] = useState<string>('');
  const [storageQuota, setStorageQuota] = useState<{ limit?: string; usage?: string }>({});

  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Upload state
  const [isUploadingJson, setIsUploadingJson] = useState<boolean>(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState<boolean>(false);

  // Delete modal state
  const [deletingFile, setDeletingFile] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Restore preview modal state
  const [restoreFile, setRestoreFile] = useState<DriveFileItem | null>(null);
  const [restoreJsonData, setRestoreJsonData] = useState<any>(null);
  const [isDownloadingContent, setIsDownloadingContent] = useState<boolean>(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  // Load Drive files and quota
  const loadDriveData = async () => {
    setErrorMsg(null);
    setIsLoadingFiles(true);
    try {
      const quota = await getDriveStorageAbout();
      setStorageQuota({ limit: quota.limit, usage: quota.usage });
      if (quota.userEmail) setDriveUserEmail(quota.userEmail);

      const items = await listDriveFiles(searchQuery.trim() ? `trashed = false and name contains '${searchQuery.trim()}'` : undefined);
      setFiles(items);
      setIsAuthenticated(true);
    } catch (err: any) {
      console.error('Drive load error:', err);
      setErrorMsg(err.message || 'Failed to connect to Google Drive.');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (getCachedDriveToken()) {
      loadDriveData();
    }
  }, []);

  // Connect / Re-authenticate
  const handleConnectDrive = async () => {
    setIsAuthenticating(true);
    setErrorMsg(null);
    try {
      await authenticateGoogleDrive();
      setIsAuthenticated(true);
      showToast('Connected to Google Drive');
      await loadDriveData();
    } catch (err: any) {
      console.error('Drive auth error:', err);
      setErrorMsg(err.message || 'Google Drive authentication failed.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Upload JSON Backup
  const handleUploadJson = async () => {
    setIsUploadingJson(true);
    setErrorMsg(null);
    try {
      const jsonStr = exportFullDataJSON();
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `Chronos_Study_Backup_${dateStr}.json`;

      const uploaded = await uploadJsonToDrive(filename, jsonStr);
      showToast(`Backup saved to Google Drive: ${uploaded.name}`);
      await loadDriveData();
    } catch (err: any) {
      console.error('JSON Upload error:', err);
      setErrorMsg(err.message || 'Failed to upload JSON backup to Google Drive.');
    } finally {
      setIsUploadingJson(false);
    }
  };

  // Upload PDF Report
  const handleUploadPdf = async () => {
    if (sessions.length === 0) {
      showToast('No study sessions available to build PDF report.');
      return;
    }

    setIsUploadingPdf(true);
    setErrorMsg(null);
    try {
      const report = buildProductionStudyReport({
        studentName: settings.studentName || 'BK NITHILESHVAR',
        reportOption: 'all',
        dateRangeLabel: 'All Available History',
        startDateStr: '',
        endDateStr: new Date().toISOString().slice(0, 10),
        sessions,
      });

      const pdfArrayBuffer = report.doc.output('arraybuffer');
      const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });

      const uploaded = await uploadPdfToDrive(report.filename, pdfBlob);
      showToast(`PDF Report saved to Google Drive: ${uploaded.name}`);
      await loadDriveData();
    } catch (err: any) {
      console.error('PDF Upload error:', err);
      setErrorMsg(err.message || 'Failed to upload PDF report to Google Drive.');
    } finally {
      setIsUploadingPdf(false);
    }
  };

  // Trigger Restore from file
  const handlePrepareRestore = async (fileItem: DriveFileItem) => {
    setIsDownloadingContent(true);
    setRestoreFile(fileItem);
    setErrorMsg(null);
    try {
      const contentStr = await getDriveFileContent(fileItem.id);
      const parsed = JSON.parse(contentStr);
      setRestoreJsonData(parsed);
    } catch (err: any) {
      console.error('Download content error:', err);
      setErrorMsg(`Failed to parse file content: ${err.message || 'Invalid JSON'}`);
      setRestoreFile(null);
      setRestoreJsonData(null);
    } finally {
      setIsDownloadingContent(false);
    }
  };

  // Execute Restore
  const handleConfirmRestore = async () => {
    if (!restoreJsonData) return;
    setIsRestoring(true);
    try {
      const result = await importFullData(restoreJsonData, importMode);
      showToast(`Restored study data from Google Drive (${result.addedSessions} sessions processed).`);
      setRestoreFile(null);
      setRestoreJsonData(null);
    } catch (err: any) {
      setErrorMsg(`Restore failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsRestoring(false);
    }
  };

  // Execute Delete
  const handleConfirmDelete = async () => {
    if (!deletingFile) return;
    setIsDeleting(true);
    try {
      await deleteDriveFile(deletingFile.id);
      showToast(`Deleted "${deletingFile.name}" from Google Drive.`);
      setDeletingFile(null);
      await loadDriveData();
    } catch (err: any) {
      setErrorMsg(`Failed to delete file from Google Drive: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Format bytes helper
  const formatBytes = (bytesStr?: string) => {
    if (!bytesStr) return '—';
    const b = parseInt(bytesStr, 10);
    if (isNaN(b)) return '—';
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
    return `${(b / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // Calculate usage percentage
  const usagePercentage = () => {
    if (!storageQuota.limit || !storageQuota.usage) return 0;
    const limit = parseInt(storageQuota.limit, 10);
    const usage = parseInt(storageQuota.usage, 10);
    if (!limit || isNaN(limit) || isNaN(usage)) return 0;
    return Math.min(100, Math.round((usage / limit) * 100));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d0f17] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight text-white flex items-center gap-2">
              Google Drive Cloud Storage
            </h1>
            <p className="text-xs text-slate-400">
              Save study session backups and certified A4 PDF reports directly to your Google Drive.
            </p>
          </div>
        </div>

        {/* Auth / Connection Status */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          {isAuthenticated ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[11px]">
                {driveUserEmail || 'Google Drive Connected'}
              </span>
            </div>
          ) : (
            <button
              onClick={handleConnectDrive}
              disabled={isAuthenticating}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-400 hover:to-emerald-400 text-black text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              <User className="w-4 h-4 fill-black" />
              <span>{isAuthenticating ? 'Connecting...' : 'Connect Google Drive'}</span>
            </button>
          )}

          {isAuthenticated && (
            <button
              onClick={loadDriveData}
              disabled={isLoadingFiles}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors cursor-pointer"
              title="Refresh Google Drive files"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingFiles ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-xs font-semibold text-rose-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Storage Quota & Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Drive Quota Card */}
        <div className="bg-[#0a0c12] border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Drive Storage Quota
              </span>
              <span className="text-xs font-mono font-bold text-amber-400">
                {usagePercentage()}% used
              </span>
            </div>

            <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800 mb-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full transition-all duration-500"
                style={{ width: `${usagePercentage()}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>Used: {formatBytes(storageQuota.usage)}</span>
              <span>Total: {formatBytes(storageQuota.limit)}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-[10px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>OAuth 2.0 In-Memory Secured</span>
          </div>
        </div>

        {/* Action 1: Upload Backup JSON */}
        <div className="bg-[#0a0c12] border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileJson className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Cloud JSON Backup</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Upload all study sessions ({sessions.length}), subjects ({subjects.length}), goals ({goals.length}), and journals as a JSON backup file.
            </p>
          </div>

          <button
            onClick={handleUploadJson}
            disabled={isUploadingJson || !isAuthenticated}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <CloudUpload className="w-4 h-4" />
            <span>{isUploadingJson ? 'Uploading Backup...' : 'Save JSON Backup to Drive'}</span>
          </button>
        </div>

        {/* Action 2: Export & Upload PDF Report */}
        <div className="bg-[#0a0c12] border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-rose-400" />
              <h3 className="text-sm font-bold text-white">Export PDF Report</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Generate certified A4 PDF study report and upload it directly to your Google Drive storage.
            </p>
          </div>

          <button
            onClick={handleUploadPdf}
            disabled={isUploadingPdf || !isAuthenticated || sessions.length === 0}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <CloudUpload className="w-4 h-4 text-amber-400" />
            <span>{isUploadingPdf ? 'Generating & Saving PDF...' : 'Save PDF Report to Drive'}</span>
          </button>
        </div>
      </div>

      {/* Google Drive Files List & Search */}
      <div className="bg-[#0a0c12] border border-slate-800/80 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-blue-400" />
              Your Google Drive Files ({files.length})
            </h2>
            <p className="text-xs text-slate-400">
              Browse, restore from, or manage Chronos backups and reports in Google Drive.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search Drive files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadDriveData()}
              className="w-full pl-9 pr-3 py-2 bg-[#141824] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
            />
          </div>
        </div>

        {/* Files Table / Cards */}
        {!isAuthenticated ? (
          <div className="py-12 text-center space-y-3 bg-[#111420] rounded-xl border border-slate-800">
            <HardDrive className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">
              Connect your Google Drive account above to view and manage your cloud study backups.
            </p>
            <button
              onClick={handleConnectDrive}
              disabled={isAuthenticating}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-emerald-500 text-black text-xs font-bold rounded-xl shadow cursor-pointer"
            >
              Sign in with Google Drive
            </button>
          </div>
        ) : isLoadingFiles ? (
          <div className="py-12 text-center space-y-2 bg-[#111420] rounded-xl border border-slate-800">
            <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-mono">Fetching files from Google Drive...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="py-12 text-center space-y-2 bg-[#111420] rounded-xl border border-slate-800">
            <FileJson className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">
              No Chronos backup files found in Google Drive.
            </p>
            <p className="text-[11px] text-slate-500">
              Use "Save JSON Backup to Drive" above to create your first cloud backup!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => {
              const isJson = file.mimeType === 'application/json' || file.name.endsWith('.json');
              const isPdf = file.mimeType === 'application/pdf' || file.name.endsWith('.pdf');

              return (
                <div
                  key={file.id}
                  className="p-4 rounded-xl bg-[#111420] border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                      {isJson ? (
                        <FileJson className="w-5 h-5 text-amber-400" />
                      ) : isPdf ? (
                        <FileText className="w-5 h-5 text-rose-400" />
                      ) : (
                        <HardDrive className="w-5 h-5 text-blue-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate max-w-sm sm:max-w-md">
                        {file.name}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono mt-1">
                        <span>Size: {formatBytes(file.size)}</span>
                        <span>•</span>
                        <span>
                          Modified:{' '}
                          {file.modifiedTime
                            ? new Date(file.modifiedTime).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {/* Restore button if JSON */}
                    {isJson && (
                      <button
                        onClick={() => handlePrepareRestore(file)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        title="Restore study database from this file"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore Data</span>
                      </button>
                    )}

                    {/* Web Link */}
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                        title="Open in Google Drive"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}

                    {/* Delete File Button -> Must trigger ConfirmModal */}
                    <button
                      onClick={() => setDeletingFile(file)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                      title="Delete file from Google Drive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MANDATORY Confirmation Modal for Destructive Operations (Deleting Drive File) */}
      <ConfirmModal
        isOpen={Boolean(deletingFile)}
        title="Delete File from Google Drive?"
        message={`Are you sure you want to permanently delete "${deletingFile?.name}" from your Google Drive? This action cannot be undone.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete File'}
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingFile(null)}
      />

      {/* Restore Data Confirmation Modal */}
      {restoreFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0e111a] border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-400" />
              Restore Database from Google Drive
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              File: <strong className="text-slate-200">{restoreFile.name}</strong>
            </p>

            {isDownloadingContent ? (
              <div className="py-8 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-mono">Downloading file content from Google Drive...</p>
              </div>
            ) : restoreJsonData ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#141824] border border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Sessions Found:</span>
                    <span className="font-mono font-bold text-amber-400">
                      {Array.isArray(restoreJsonData.sessions) ? restoreJsonData.sessions.length : 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Subjects / Syllabus:</span>
                    <span className="font-mono font-bold text-slate-200">
                      {Array.isArray(restoreJsonData.subjects) ? restoreJsonData.subjects.length : 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Study Goals:</span>
                    <span className="font-mono font-bold text-slate-200">
                      {Array.isArray(restoreJsonData.goals) ? restoreJsonData.goals.length : 0}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Restore Strategy:
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
                      <div className="text-xs font-bold">Merge Records</div>
                      <div className="text-[10px] mt-0.5 text-slate-400">
                        Safely adds new records without overwriting current data.
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
                        Overwrites current study database entirely.
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setRestoreFile(null);
                      setRestoreJsonData(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRestore}
                    disabled={isRestoring}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-black text-xs font-bold rounded-xl shadow-lg hover:from-amber-400 hover:to-amber-500 cursor-pointer"
                  >
                    {isRestoring ? 'Restoring...' : 'Confirm Restore'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
