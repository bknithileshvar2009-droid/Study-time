import React, { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import { ConfirmModal } from './ConfirmModal';
import { AuthModal } from './AuthModal';
import {
  User,
  Target,
  BookOpen,
  Volume2,
  VolumeX,
  HardDrive,
  Cloud,
  Download,
  Upload,
  Trash2,
  Plus,
  X,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    sessions,
    clearAllHistory,
    importData,
    cloudStatus,
    syncWithCloud,
    showToast,
  } = useStudy();

  const [studentNameInput, setStudentNameInput] = useState(settings.studentName);
  const [dailyGoalInput, setDailyGoalInput] = useState(settings.dailyGoalHours);
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Handle Save Student Name & Goals
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      studentName: studentNameInput.trim() || 'Student',
      dailyGoalHours: Math.max(0.5, Math.min(24, dailyGoalInput)),
    });
  };

  // Add Subject Preset
  const handleAddSubject = async () => {
    if (!newSubjectInput.trim()) return;
    const trimmed = newSubjectInput.trim();
    if (settings.subjectPresets.includes(trimmed)) {
      showToast('Subject already exists');
      return;
    }
    const updated = [...settings.subjectPresets, trimmed];
    await updateSettings({ subjectPresets: updated });
    setNewSubjectInput('');
  };

  // Delete Subject Preset
  const handleDeleteSubject = async (subject: string) => {
    if (settings.subjectPresets.length <= 1) {
      showToast('At least one subject preset is required');
      return;
    }
    const updated = settings.subjectPresets.filter((s) => s !== subject);
    await updateSettings({ subjectPresets: updated });
  };

  // Export JSON Backup
  const handleExportJSON = () => {
    const backupData = {
      app: 'Chronos Study Time Tracker',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      studentName: settings.studentName,
      settings,
      sessions,
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ChronosStudy_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON backup exported successfully');
  };

  // Import JSON Backup
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.sessions)) {
          await importData(parsed.sessions, parsed.settings, 'merge');
        } else if (Array.isArray(parsed)) {
          await importData(parsed, undefined, 'merge');
        } else {
          showToast('Invalid backup file structure');
        }
      } catch (err) {
        showToast('Failed to parse backup JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <span className="text-xs uppercase font-bold tracking-widest text-amber-400">
          Preferences & Persistence
        </span>
        <h2 className="text-2xl font-bold text-white tracking-tight font-display">
          Application Settings
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure report identification, daily target hours, subject presets, and storage sync.
        </p>
      </div>

      {/* 1. Student Identity & PDF Header Profile */}
      <div className="p-6 rounded-2xl bg-[#0c0e15] border border-amber-500/20 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Student Identification & Report Profile
            </h3>
            <p className="text-xs text-slate-400">
              The display name configured here appears on all official PDF study reports.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Student Display Name
            </label>
            <input
              type="text"
              value={studentNameInput}
              onChange={(e) => setStudentNameInput(e.target.value)}
              placeholder="e.g. John Doe, Alex Mercer"
              className="w-full px-3.5 py-2.5 bg-black/50 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Daily Target Study Hours
            </label>
            <input
              type="number"
              min="0.5"
              max="24"
              step="0.5"
              value={dailyGoalInput}
              onChange={(e) => setDailyGoalInput(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-black/50 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-colors shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              Save Profile Settings
            </button>
          </div>
        </form>
      </div>

      {/* 2. Subjects Management */}
      <div className="p-6 rounded-2xl bg-[#0c0e15] border border-slate-800/80 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Subject & Study Presets
            </h3>
            <p className="text-xs text-slate-400">
              Preset options available for quick selection in the study timer.
            </p>
          </div>
        </div>

        {/* Existing Subject Tags */}
        <div className="flex flex-wrap gap-2 pt-2">
          {settings.subjectPresets.map((subject) => (
            <div
              key={subject}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200"
            >
              <span>{subject}</span>
              <button
                onClick={() => handleDeleteSubject(subject)}
                className="text-slate-500 hover:text-red-400 p-0.5 rounded transition-colors"
                title={`Remove ${subject}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add new subject input */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="text"
            value={newSubjectInput}
            onChange={(e) => setNewSubjectInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddSubject();
              }
            }}
            placeholder="Add new subject (e.g. Economics, Organic Chemistry)..."
            className="flex-1 px-3.5 py-2 bg-black/50 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/60"
          />
          <button
            onClick={handleAddSubject}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>

      {/* 3. Audio & Feedback */}
      <div className="p-6 rounded-2xl bg-[#0c0e15] border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400">
              {settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Synthesized Audio Cues (₹0 Free Web Audio API)
              </h3>
              <p className="text-xs text-slate-400">
                Play gentle harmonic chimes upon timer Start, Pause, Resume, and Stop.
              </p>
            </div>
          </div>

          <button
            onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
              settings.soundEnabled ? 'bg-amber-500' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                settings.soundEnabled ? 'right-1' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 4. Storage Architecture & Cloud Sync */}
      <div className="p-6 rounded-2xl bg-[#0c0e15] border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Storage & Synchronization Architecture
              </h3>
              <p className="text-xs text-slate-400">
                Reliable IndexedDB browser storage + Firebase Realtime Database
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition-colors"
          >
            {cloudStatus.user ? 'Manage Sync' : 'Connect Cloud'}
          </button>
        </div>

        <div className="p-4 rounded-xl bg-black/40 border border-slate-800/80 space-y-2 text-xs text-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Local Storage Engine:</span>
            <span className="font-semibold text-emerald-400">Browser IndexedDB (Active & Permanent)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Cloud Sync (Firebase RTDB):</span>
            <span className={`font-semibold ${cloudStatus.user ? 'text-emerald-400' : 'text-amber-400'}`}>
              {cloudStatus.user
                ? `Connected (${cloudStatus.user.isAnonymous ? '1-Click Anonymous' : cloudStatus.user.email})`
                : 'Local Only (Click "Connect Cloud" for multi-device sync)'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Total Saved Sessions:</span>
            <span className="font-mono text-white font-bold">{sessions.length} records</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          <strong>Storage Architecture Notice:</strong> Browser IndexedDB ensures your session history, timers, and reports survive browser reloads, system reboots, and page switches with zero server costs. Connecting to Firebase Realtime Database enables instant backup across multiple devices (e.g. your phone and laptop).
        </p>
      </div>

      {/* 5. Data Backup, Export & Reset */}
      <div className="p-6 rounded-2xl bg-[#0c0e15] border border-slate-800/80 space-y-4">
        <h3 className="text-sm font-bold text-white tracking-wide">
          Data Backup & Maintenance
        </h3>

        <div className="flex flex-wrap items-center gap-3">
          {/* JSON Export */}
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
          >
            <Download className="w-4 h-4 text-amber-400" />
            Export JSON Backup
          </button>

          {/* JSON Import */}
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer">
            <Upload className="w-4 h-4 text-emerald-400" />
            Import JSON Backup
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>

          {/* Clear All Data */}
          <button
            onClick={() => setIsClearModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors ml-auto"
          >
            <Trash2 className="w-4 h-4" />
            Clear All History
          </button>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      <ConfirmModal
        isOpen={isClearModalOpen}
        title="Clear All Study History?"
        message="Are you sure you want to delete all historical study sessions? This will permanently erase all local records and cannot be undone."
        confirmLabel="Yes, Clear All History"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={async () => {
          setIsClearModalOpen(false);
          await clearAllHistory();
        }}
        onCancel={() => setIsClearModalOpen(false)}
      />

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};
