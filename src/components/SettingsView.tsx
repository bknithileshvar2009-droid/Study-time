import React, { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import { ConfirmModal } from './ConfirmModal';
import { TagBadge } from './TagBadge';
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
  Tag as TagIcon,
  Award,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    sessions,
    clearAllHistory,
    importFullData,
    cloudStatus,
    triggerManualCloudSync,
    totalHoursFormatted,
    totalStudyTimeHMS,
    showToast,
  } = useStudy();

  const [studentNameInput, setStudentNameInput] = useState(settings.studentName || 'BK NITHILESHVAR');
  const [dailyGoalInput, setDailyGoalInput] = useState(settings.dailyGoalHours);
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // Handle Save Student Name & Goals
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      studentName: studentNameInput.trim() || 'BK NITHILESHVAR',
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

  // Add Tag Preset
  const handleAddTag = async () => {
    if (!newTagInput.trim()) return;
    const clean = newTagInput.replace(/^#/, '').toLowerCase().trim();
    if (settings.tagPresets.includes(clean)) {
      showToast('Tag preset already exists');
      return;
    }
    const updated = [...settings.tagPresets, clean];
    await updateSettings({ tagPresets: updated });
    setNewTagInput('');
  };

  // Delete Tag Preset
  const handleDeleteTag = async (tagToDelete: string) => {
    if (settings.tagPresets.length <= 1) {
      showToast('At least one tag preset is required');
      return;
    }
    const updated = settings.tagPresets.filter((t) => t !== tagToDelete);
    await updateSettings({ tagPresets: updated });
  };

  // Export JSON Backup
  const handleExportJSON = () => {
    const backupData = {
      app: 'Chronos Study Time Tracker',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      studentName: settings.studentName || 'BK NITHILESHVAR',
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
        if (parsed) {
          const res = await importFullData(parsed, 'merge');
          showToast(`Imported ${res.addedSessions} sessions successfully`);
        } else {
          showToast('Invalid backup file structure');
        }
      } catch {
        showToast('Failed to parse backup JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-amber-400">
            Preferences & Persistence
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight font-display">
            Application Settings
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure report identity, study goals, #tags, subject presets, and auto-sync.
          </p>
        </div>

        {/* Total Hours Badge */}
        <div className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/10 to-rose-500/10 border border-amber-500/30 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <div className="text-xs">
            <span className="text-slate-400">Total Hours Studied: </span>
            <span className="font-mono font-bold text-amber-300">{totalHoursFormatted}</span>
          </div>
        </div>
      </div>

      {/* 1. Student Identity & PDF Header Profile */}
      <div className="p-6 rounded-2xl bg-[#0c0e15] border border-amber-500/20 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Official Student Report Identity
            </h3>
            <p className="text-xs text-slate-400">
              The student name printed on the first page, headers, and running footers of all PDF study reports.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Certified Student Name
            </label>
            <input
              type="text"
              value={studentNameInput}
              onChange={(e) => setStudentNameInput(e.target.value)}
              placeholder="BK NITHILESHVAR"
              className="w-full px-3.5 py-2.5 bg-black/50 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/60 font-semibold"
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

      {/* 2. Tag Presets Management */}
      <div className="p-6 rounded-2xl bg-[#0c0e15] border border-slate-800/80 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400">
            <TagIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Tag Presets (#urgent, #review, #exam-prep)
            </h3>
            <p className="text-xs text-slate-400">
              Quick clickable tags available when starting, inspecting, or filtering study sessions.
            </p>
          </div>
        </div>

        {/* Existing Tag Presets */}
        <div className="flex flex-wrap gap-2 pt-2">
          {settings.tagPresets.map((tag) => (
            <div
              key={tag}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 font-mono"
            >
              <span className="text-amber-400">#</span>
              <span>{tag}</span>
              <button
                onClick={() => handleDeleteTag(tag)}
                className="text-slate-500 hover:text-red-400 p-0.5 rounded transition-colors"
                title={`Remove #${tag}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add new tag preset input */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="text"
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="Add new tag (e.g. lab-work, flashcards)..."
            className="flex-1 px-3.5 py-2 bg-black/50 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/60 font-mono"
          />
          <button
            onClick={handleAddTag}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Tag
          </button>
        </div>
      </div>

      {/* 3. Subjects Management */}
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

      {/* 4. Audio & Feedback */}
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

      {/* 5. Automatic Firebase RTDB Sync (No Login Needed) */}
      <div className="p-6 rounded-2xl bg-[#0c0e15] border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Automatic Firebase Cloud Persistence
              </h3>
              <p className="text-xs text-slate-400">
                Sessions automatically save to Firebase Realtime Database and IndexedDB with zero login required.
              </p>
            </div>
          </div>

          <button
            onClick={() => triggerManualCloudSync()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-500/30 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Force Sync Now
          </button>
        </div>

        <div className="p-4 rounded-xl bg-black/40 border border-slate-800/80 space-y-2 text-xs text-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Cloud Backend:</span>
            <span className="font-semibold text-emerald-400">
              gen-lang-client-0079533925 (Realtime Database Connected)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Local Cache:</span>
            <span className="font-semibold text-emerald-400">IndexedDB & LocalStorage Active</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Historical Records:</span>
            <span className="font-mono text-white font-bold">{sessions.length} saved sessions</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Total Hours Studied:</span>
            <span className="font-mono text-amber-300 font-bold">{totalHoursFormatted} ({totalStudyTimeHMS})</span>
          </div>
        </div>
      </div>

      {/* 6. Data Backup & Export */}
      <div className="p-6 rounded-2xl bg-[#0c0e15] border border-slate-800/80 space-y-4">
        <h3 className="text-sm font-bold text-white tracking-wide">
          Data Backup & Maintenance
        </h3>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
          >
            <Download className="w-4 h-4 text-amber-400" />
            Export JSON Backup
          </button>

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
        message="Are you sure you want to delete all historical study sessions? This will permanently erase all local and cloud records."
        confirmLabel="Yes, Clear All History"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={async () => {
          setIsClearModalOpen(false);
          await clearAllHistory();
        }}
        onCancel={() => setIsClearModalOpen(false)}
      />
    </div>
  );
};
