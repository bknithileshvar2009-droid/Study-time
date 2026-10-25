import React, { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import {
  formatDurationHMS,
  formatDurationHuman,
  formatTimeOfDay,
  formatDateDisplay,
  getLocalDateString,
} from '../utils/timeFormat';
import { StudySession } from '../types';
import { TagBadge } from './TagBadge';
import {
  Play,
  Pause,
  Square,
  Clock,
  CheckCircle2,
  Calendar,
  History,
  FileBarChart,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
  Target,
  ArrowUpRight,
  TrendingUp,
  Tag as TagIcon,
  Award,
  Flame,
  Plus,
  Star,
  FileEdit,
  Save,
  Edit3,
  X,
  ArrowRight,
  HardDrive,
} from 'lucide-react';

interface DashboardViewProps {
  onInspectSession: (session: StudySession) => void;
  onOpenManualEntry?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onInspectSession, onOpenManualEntry }) => {
  const {
    activeSession,
    timerElapsedMs,
    isTimerRunning,
    isTimerPaused,
    startStudy,
    pauseStudy,
    resumeStudy,
    stopStudy,
    stats,
    totalHoursStudied,
    totalHoursFormatted,
    totalStudyTimeHMS,
    sessions,
    todaySessions,
    settings,
    dailyReviews,
    saveDailyReview,
    showToast,
    setActiveTab,
    isDriveConnected,
    driveAutoBackupStatus,
    lastDriveBackupMs,
    connectDrive,
    triggerDriveAutoBackup,
  } = useStudy();

  const [selectedSubject, setSelectedSubject] = useState<string>(settings.defaultSubject);
  const [quickNotes, setQuickNotes] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState<string>('');
  const [isStarting, setIsStarting] = useState(false);

  // Daily Review in Dashboard state
  const todayStr = getLocalDateString();
  const todayReview = dailyReviews.find((r) => r.date === todayStr);

  const [isReviewEditing, setIsReviewEditing] = useState<boolean>(!todayReview);
  const [reviewRating, setReviewRating] = useState<number>(todayReview?.rating || 5);
  const [reviewReflection, setReviewReflection] = useState<string>(todayReview?.reflection || '');
  const [reviewTomorrowPlan, setReviewTomorrowPlan] = useState<string>(todayReview?.tomorrowPlan || '');
  const [reviewDifficultTopics, setReviewDifficultTopics] = useState<string[]>(
    todayReview?.difficultTopics || []
  );
  const [reviewDifficultInput, setReviewDifficultInput] = useState<string>('');
  const [isSavingReview, setIsSavingReview] = useState<boolean>(false);

  // Sync if todayReview updates
  React.useEffect(() => {
    if (todayReview && !isReviewEditing) {
      setReviewRating(todayReview.rating);
      setReviewReflection(todayReview.reflection || '');
      setReviewTomorrowPlan(todayReview.tomorrowPlan || '');
      setReviewDifficultTopics(todayReview.difficultTopics || []);
    }
  }, [todayReview, isReviewEditing]);

  const handleAddDifficultTopic = () => {
    const clean = reviewDifficultInput.trim();
    if (!clean) return;
    if (!reviewDifficultTopics.includes(clean)) {
      setReviewDifficultTopics([...reviewDifficultTopics, clean]);
    }
    setReviewDifficultInput('');
  };

  const handleRemoveDifficultTopic = (topic: string) => {
    setReviewDifficultTopics(reviewDifficultTopics.filter((t) => t !== topic));
  };

  const handleSaveReview = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingReview(true);
    try {
      await saveDailyReview({
        date: todayStr,
        rating: reviewRating,
        reflection: reviewReflection.trim(),
        completedTopics: [],
        difficultTopics: reviewDifficultTopics,
        tomorrowPlan: reviewTomorrowPlan.trim(),
      });
      setIsReviewEditing(false);
      showToast("Today's review saved successfully.");
    } finally {
      setIsSavingReview(false);
    }
  };

  // Today progress against daily goal
  const dailyGoalMs = (settings.dailyGoalHours || 4) * 3600 * 1000;
  const progressPercent = Math.min(100, Math.round((stats.todayTotalMs / dailyGoalMs) * 100));

  // Recent completed or active sessions (top 5)
  const recentSessions = sessions.slice(0, 5);

  const toggleTag = (tag: string) => {
    const clean = tag.replace(/^#/, '').toLowerCase().trim();
    if (!clean) return;
    if (selectedTags.includes(clean)) {
      setSelectedTags(selectedTags.filter((t) => t !== clean));
    } else {
      setSelectedTags([...selectedTags, clean]);
    }
  };

  const addCustomTag = () => {
    const clean = customTagInput.replace(/^#/, '').toLowerCase().trim();
    if (clean && !selectedTags.includes(clean)) {
      setSelectedTags([...selectedTags, clean]);
      setCustomTagInput('');
    }
  };

  const handleStart = async () => {
    if (isTimerRunning || isStarting) return;
    setIsStarting(true);
    try {
      await startStudy({
        subject: selectedSubject,
        notes: quickNotes,
        tags: selectedTags,
      });
      setQuickNotes('');
    } finally {
      setIsStarting(false);
    }
  };

  const timerStateLabel = activeSession
    ? isTimerRunning
      ? 'RUNNING'
      : isTimerPaused
      ? 'PAUSED'
      : 'IDLE'
    : 'IDLE';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Hero Command Banner with Prominent TOTAL HOURS TILL NOW */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#111420] via-[#0d0f17] to-[#161019] border border-amber-500/25 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-rose-600/15 via-amber-500/15 to-transparent blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-widest text-amber-400">
                Study Command Center
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-xs text-slate-400">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white font-display">
              Welcome back, {settings.studentName || 'Scholar'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Automatic Firebase cloud persistence is active. Every second studied is permanently recorded.
            </p>
          </div>

          {/* Prominent High-Visibility Hero Card: Total Hours Studied Till Now */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-black/60 to-rose-500/15 border border-amber-500/40 min-w-[240px] shadow-lg shadow-amber-950/20">
              <div className="flex items-center justify-between text-xs text-amber-400/90 font-semibold mb-1">
                <span className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" /> Total Hours Till Now
                </span>
                <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400">
                  All Time
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-bold font-mono text-white tracking-tight">
                {totalHoursFormatted}
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-1 flex items-center justify-between">
                <span>{formatDurationHuman(stats.allTimeTotalMs)}</span>
                <span className="text-amber-400/80 font-bold">{stats.totalSessionsCount} sessions</span>
              </div>
            </div>

            {/* Daily Goal Gauge */}
            <div className="p-4 rounded-2xl bg-black/50 border border-slate-800 min-w-[200px]">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 font-medium">Daily Goal: {settings.dailyGoalHours}h</span>
                <span className="font-bold text-amber-300 font-mono">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden my-2">
                <div
                  className="bg-gradient-to-r from-amber-500 to-rose-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-400">
                Today: <strong className="text-white font-mono">{formatDurationHuman(stats.todayTotalMs)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Primary Study Timer & Interactive Start/Controls */}
      <div className="p-6 rounded-2xl bg-[#0c0e15] border border-amber-500/20 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Digital Timer Display */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isTimerRunning
                    ? 'bg-emerald-400 animate-ping'
                    : isTimerPaused
                    ? 'bg-amber-400'
                    : 'bg-slate-600'
                }`}
              />
              <span className="text-xs uppercase font-bold tracking-widest text-slate-400">
                Timer: <span className="text-amber-400 font-mono">{timerStateLabel}</span>
              </span>
              {activeSession && (
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  {activeSession.subject}
                </span>
              )}
            </div>

            <div className="font-mono text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white drop-shadow-md select-none">
              {formatDurationHMS(timerElapsedMs)}
            </div>

            <div className="text-xs text-slate-400">
              {activeSession
                ? `Started at ${formatTimeOfDay(activeSession.startTime)}`
                : 'Configure subject & tags below, then press START STUDY.'}
            </div>

            {/* Active Session Tags if running */}
            {activeSession && activeSession.tags && activeSession.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {activeSession.tags.map((t) => (
                  <TagBadge key={t} tag={t} size="xs" />
                ))}
              </div>
            )}
          </div>

          {/* Controls & Action Buttons */}
          <div className="w-full lg:w-auto flex flex-col items-stretch sm:items-center lg:items-end gap-3">
            {!activeSession ? (
              <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="px-3.5 py-3 bg-black/60 border border-slate-800 rounded-xl text-xs font-medium text-slate-200 focus:outline-none focus:border-amber-500/60"
                >
                  {settings.subjectPresets.map((p) => (
                    <option key={p} value={p} className="bg-slate-900 text-white">
                      {p}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleStart}
                  disabled={isStarting}
                  className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm text-black bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/25 active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-black" />
                  START STUDY
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3">
                {isTimerRunning && (
                  <button
                    onClick={pauseStudy}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-xs text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition-all active:scale-98 cursor-pointer"
                  >
                    <Pause className="w-4 h-4 text-amber-400" />
                    PAUSE
                  </button>
                )}

                {isTimerPaused && (
                  <button
                    onClick={resumeStudy}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-xs text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all active:scale-98 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-emerald-400 text-emerald-400" />
                    RESUME
                  </button>
                )}

                <button
                  onClick={stopStudy}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-lg shadow-red-900/30 transition-all active:scale-98 cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-white" />
                  STOP & SAVE
                </button>
              </div>
            )}

            <button
              onClick={() => setActiveTab('timer')}
              className="text-xs text-slate-400 hover:text-amber-300 underline transition-colors"
            >
              Open Fullscreen Timer View →
            </button>
          </div>
        </div>

        {/* Tag Selector Pill Bar for upcoming session (when idle) */}
        {!activeSession && (
          <div className="pt-4 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5 text-amber-400" />
                Select Session Tags:
              </span>
              <span className="text-[11px] text-slate-500">
                Click tags to toggle (e.g. #urgent, #review, #exam-prep)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {settings.tagPresets.map((tag) => {
                const clean = tag.replace(/^#/, '');
                const isSelected = selectedTags.includes(clean);
                return (
                  <button
                    key={clean}
                    type="button"
                    onClick={() => toggleTag(clean)}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-mono transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-amber-500/25 text-amber-300 border-amber-500/50 shadow-sm font-semibold'
                        : 'bg-slate-900/70 text-slate-400 hover:text-slate-200 border-slate-800'
                    }`}
                  >
                    <span>#</span>
                    <span>{clean}</span>
                  </button>
                );
              })}

              {/* Add custom tag input */}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomTag();
                    }
                  }}
                  placeholder="+ tag"
                  className="w-20 px-2 py-1 bg-black/60 border border-slate-800 rounded-lg text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60"
                />
                {customTagInput && (
                  <button
                    onClick={addCustomTag}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Aggregate Metric Cards (Highlighting Total Study Hours Till Now) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Study Hours Till Now */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#121522] to-[#0c0e17] border border-amber-500/30 shadow-md">
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
            <span>Total Studied Till Now</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-amber-300">
            {totalHoursFormatted}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            {totalStudyTimeHMS} (accurate)
          </div>
        </div>

        {/* Metric 2: Today's Total Study Time */}
        <div className="p-4 rounded-xl bg-[#0b0d14] border border-slate-800/90 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Today's Study Time</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-white">
            {formatDurationHMS(stats.todayTotalMs)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {formatDurationHuman(stats.todayTotalMs)}
          </div>
        </div>

        {/* Metric 3: Today's Completed Sessions */}
        <div className="p-4 rounded-xl bg-[#0b0d14] border border-slate-800/90 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Today's Sessions</span>
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-white">
            {stats.todaySessionsCount} <span className="text-sm font-normal text-slate-400">blocks</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across {todaySessions.length} recorded segments
          </div>
        </div>

        {/* Metric 4: All-Time Total Sessions Count */}
        <div className="p-4 rounded-xl bg-[#0b0d14] border border-slate-800/90 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Sessions Saved</span>
            <Calendar className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-white">
            {stats.totalSessionsCount} <span className="text-sm font-normal text-slate-400">sessions</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Avg: {formatDurationHuman(stats.averageSessionMs)} / session
          </div>
        </div>
      </div>

      {/* 4. Recent Study Sessions with Tag Badges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#0a0c13] border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white tracking-wide">
                Recent Study Sessions
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {onOpenManualEntry && (
                <button
                  onClick={onOpenManualEntry}
                  className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 transition-colors px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Log Past Session</span>
                </button>
              )}
              <button
                onClick={() => setActiveTab('history')}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                View Full History <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {recentSessions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Clock className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-xs">No study sessions recorded yet.</p>
              <p className="text-[11px] text-slate-600">
                Press START STUDY above to begin logging your first session.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => onInspectSession(session)}
                  className="py-3 px-2 flex items-center justify-between hover:bg-slate-900/40 rounded-xl cursor-pointer transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 group-hover:border-amber-500/40 transition-colors shrink-0 mt-0.5">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                          {session.subject || 'General Study'}
                        </span>
                        {/* Tags display */}
                        {session.tags && session.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            {session.tags.map((t) => (
                              <TagBadge key={t} tag={t} size="xs" />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{formatDateDisplay(session.date || session.startTime)}</span>
                        <span>•</span>
                        <span>{formatTimeOfDay(session.startTime)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-white">
                        {formatDurationHMS(session.accumulatedActiveMs)}
                      </div>
                      <div className="text-[10px] uppercase font-semibold text-emerald-400">
                        {session.status}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Quick Action Shortcuts */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#0a0c13] border border-slate-800/80 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Quick Navigation
            </h3>

            <button
              onClick={() => setActiveTab('history')}
              className="w-full p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/30 text-left transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-amber-300">
                    Study History
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Filter by #tags, subjects, and dates
                  </div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
            </button>

            <button
              onClick={() => setActiveTab('drive')}
              className="w-full p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/30 text-left transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-blue-300 flex items-center gap-1.5">
                    <span>Google Drive Vault</span>
                    <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono font-bold ${
                      isDriveConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isDriveConnected ? 'Connected' : 'Offline'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isDriveConnected ? 'Auto-backing up StudyTrackerBackup.json' : 'Connect your Drive for automatic backups'}
                  </div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
            </button>
          </div>

          {/* All-Time Study Record Insight */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0c0e16] to-[#12141f] border border-amber-500/20">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" /> All-Time Record Till Now
            </span>
            <div className="mt-1 text-2xl font-bold font-mono text-white">
              {totalHoursFormatted}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Recorded across <span className="font-semibold text-slate-200">{stats.totalSessionsCount} sessions</span> and synced automatically with Firebase.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Daily Review & Reflection Card (Fully Responsive) */}
      <div className="rounded-3xl bg-gradient-to-b from-[#0c0e17] to-[#07090f] border border-slate-800/90 shadow-2xl overflow-hidden transition-all">
        {/* Card Header Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2 font-display">
                  Daily Study Review & Reflection
                </h2>
                {todayReview ? (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3 h-3" /> Reviewed Today
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 font-mono">
                    <Sparkles className="w-3 h-3" /> Awaiting Reflection
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Reflect on today's focus quality, log concepts needing revision, and plan tomorrow's session.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {todayReview && !isReviewEditing && (
              <button
                onClick={() => setIsReviewEditing(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Edit Today's Entry</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('review')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Full Journal</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card Body: Read-only summary or Interactive Form */}
        <div className="p-4 sm:p-6">
          {todayReview && !isReviewEditing ? (
            /* Saved Review Showcase View */
            <div className="space-y-5">
              {/* Star Rating & KPI bar */}
              <div className="p-4 rounded-2xl bg-[#111422]/80 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-5 h-5 ${
                          s <= todayReview.rating
                            ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                            : 'text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs sm:text-sm font-bold font-mono text-amber-300">
                    {todayReview.rating === 5 && '5/5 • Outstanding Deep Work'}
                    {todayReview.rating === 4 && '4/5 • Solid Productive Session'}
                    {todayReview.rating === 3 && '3/5 • Moderate Focus'}
                    {todayReview.rating === 2 && '2/5 • Suboptimal / Distracted'}
                    {todayReview.rating === 1 && '1/5 • Challenging / Low Focus'}
                  </span>
                </div>

                <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                  <span>Tracked Today:</span>
                  <span className="text-amber-400 font-bold">{formatDurationHuman(stats.todayTotalMs)}</span>
                  <span>({stats.todaySessionsCount} sessions)</span>
                </div>
              </div>

              {/* 3-Part Responsive Content Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Accomplishments & Reflection */}
                <div className="p-4 rounded-2xl bg-[#0f121d] border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Accomplishments & Insights
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed italic">
                    {todayReview.reflection || 'No written reflection provided for today.'}
                  </p>
                </div>

                {/* Difficult Topics */}
                <div className="p-4 rounded-2xl bg-[#0f121d] border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-rose-400" />
                    Concepts For Revision
                  </span>
                  {todayReview.difficultTopics && todayReview.difficultTopics.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {todayReview.difficultTopics.map((topic, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-mono"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No difficult concepts logged.</p>
                  )}
                </div>

                {/* Tomorrow's Plan */}
                <div className="p-4 rounded-2xl bg-[#0f121d] border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                    Tomorrow's Battle Plan
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed font-mono">
                    {todayReview.tomorrowPlan || 'No targets scheduled yet.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Interactive Review Form */
            <form onSubmit={handleSaveReview} className="space-y-5">
              {/* Star Rating Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Rate Today's Focus & Discipline
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 bg-[#121522] p-1.5 rounded-xl border border-slate-800">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="p-1 sm:p-1.5 rounded-lg text-slate-600 hover:text-amber-400 transition-transform active:scale-110 cursor-pointer"
                        title={`${star} Star${star > 1 ? 's' : ''}`}
                      >
                        <Star
                          className={`w-6 h-6 transition-colors ${
                            star <= reviewRating
                              ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                              : 'text-slate-700'
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  <span className="text-xs sm:text-sm font-bold font-mono text-amber-300 ml-1">
                    {reviewRating === 5 && 'Outstanding Deep Work'}
                    {reviewRating === 4 && 'Solid Productive Session'}
                    {reviewRating === 3 && 'Moderate Focus'}
                    {reviewRating === 2 && 'Suboptimal / Distracted'}
                    {reviewRating === 1 && 'Challenging / Low Focus'}
                  </span>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Reflection */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Daily Reflection & Key Accomplishments
                  </label>
                  <textarea
                    rows={4}
                    placeholder="What did you learn today? Which chapters or problem sets did you complete? Any breakthroughs?"
                    value={reviewReflection}
                    onChange={(e) => setReviewReflection(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#121522] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none resize-none transition-colors"
                  />
                </div>

                {/* Right: Difficult topics + Tomorrow plan */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Difficult Concepts Requiring Revision
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="e.g. Carnot efficiency formula, Calculus..."
                        value={reviewDifficultInput}
                        onChange={(e) => setReviewDifficultInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddDifficultTopic();
                          }
                        }}
                        className="flex-1 px-3.5 py-2 bg-[#121522] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddDifficultTopic}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-xl transition-colors cursor-pointer"
                      >
                        Add
                      </button>
                    </div>

                    {reviewDifficultTopics.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {reviewDifficultTopics.map((topic) => (
                          <span
                            key={topic}
                            className="px-2.5 py-0.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-1.5 font-mono"
                          >
                            <span>{topic}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDifficultTopic(topic)}
                              className="text-rose-400 hover:text-white cursor-pointer"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Tomorrow's Focus Plan & Target Chapters
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Complete Organic Chem Chapter 4, 30 practice MCQs..."
                      value={reviewTomorrowPlan}
                      onChange={(e) => setReviewTomorrowPlan(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#121522] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] text-slate-500">
                  Automatically preserved to IndexedDB and synced with Firebase RTDB.
                </span>

                <div className="flex items-center gap-2">
                  {todayReview && (
                    <button
                      type="button"
                      onClick={() => setIsReviewEditing(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={isSavingReview}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingReview ? 'Saving...' : "Save Today's Review"}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
