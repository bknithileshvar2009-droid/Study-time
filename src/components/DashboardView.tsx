import React, { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import {
  formatDurationHMS,
  formatDurationHuman,
  formatTimeOfDay,
  formatDateDisplay,
} from '../utils/timeFormat';
import { StudySession } from '../types';
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
  Sparkles,
  BookOpen,
  Target,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';

interface DashboardViewProps {
  onInspectSession: (session: StudySession) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onInspectSession }) => {
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
    sessions,
    todaySessions,
    settings,
    setActiveTab,
  } = useStudy();

  const [selectedSubject, setSelectedSubject] = useState<string>(settings.defaultSubject);
  const [quickNotes, setQuickNotes] = useState<string>('');
  const [isStarting, setIsStarting] = useState(false);

  // Today progress against daily goal
  const dailyGoalMs = (settings.dailyGoalHours || 4) * 3600 * 1000;
  const progressPercent = Math.min(100, Math.round((stats.todayTotalMs / dailyGoalMs) * 100));

  // Recent completed or active sessions (top 5)
  const recentSessions = sessions.slice(0, 5);

  const handleStart = async () => {
    if (isTimerRunning || isStarting) return;
    setIsStarting(true);
    try {
      await startStudy(selectedSubject, quickNotes);
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
      {/* Welcome & Goal Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#12141d] via-[#10121a] to-[#150f14] border border-amber-500/20 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-rose-600/10 via-amber-500/10 to-transparent blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-widest text-amber-400">
                Command Center
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-xs text-slate-400">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
              Welcome back, {settings.studentName || 'Scholar'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Track focused study hours, maintain discipline, and achieve peak cognitive performance.
            </p>
          </div>

          {/* Goal Progress Ring / Bar */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-black/40 border border-slate-800/80 min-w-[260px]">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Target className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 font-medium">Daily Goal: {settings.dailyGoalHours}h</span>
                <span className="font-bold text-amber-300 font-mono">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-rose-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {formatDurationHuman(stats.todayTotalMs)} studied today
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Timer & Live Controls Card */}
      <div className="p-6 rounded-2xl bg-[#0c0e15] border border-amber-500/20 shadow-xl">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Timer Display */}
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
                Timer State: <span className="text-amber-400 font-mono">{timerStateLabel}</span>
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
                : 'Ready to begin your study session.'}
            </div>
          </div>

          {/* Controls & Subject Selector */}
          <div className="w-full lg:w-auto flex flex-col items-stretch sm:items-center lg:items-end gap-3">
            {!activeSession ? (
              <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="px-3.5 py-2.5 bg-black/60 border border-slate-800 rounded-xl text-xs font-medium text-slate-200 focus:outline-none focus:border-amber-500/60"
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
                  className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm text-black bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/25 active:scale-98 cursor-pointer"
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

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <button
                onClick={() => setActiveTab('timer')}
                className="hover:text-amber-300 underline transition-colors"
              >
                Open Fullscreen Timer View →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5 Core Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Today's Total Study Time */}
        <div className="p-4 rounded-xl bg-[#0b0d14] border border-slate-800/90 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Today's Study Time</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-white">
            {formatDurationHMS(stats.todayTotalMs)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {formatDurationHuman(stats.todayTotalMs)}
          </div>
        </div>

        {/* Metric 2: Today's Completed Sessions */}
        <div className="p-4 rounded-xl bg-[#0b0d14] border border-slate-800/90 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Today's Sessions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-white">
            {stats.todaySessionsCount} <span className="text-sm font-normal text-slate-400">sessions</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across {todaySessions.length} recorded blocks
          </div>
        </div>

        {/* Metric 3: Current Session Duration */}
        <div className="p-4 rounded-xl bg-[#0b0d14] border border-slate-800/90 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Current Session</span>
            <TrendingUp className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-amber-300">
            {formatDurationHMS(timerElapsedMs)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Status: <span className="font-semibold text-slate-300">{timerStateLabel}</span>
          </div>
        </div>

        {/* Metric 4: Total Recorded Study Time (All History) */}
        <div className="p-4 rounded-xl bg-[#0b0d14] border border-slate-800/90 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Recorded Time</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-white">
            {(stats.allTimeTotalMs / 3600000).toFixed(1)} <span className="text-sm font-normal text-slate-400">hours</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats.totalSessionsCount} total sessions recorded
          </div>
        </div>
      </div>

      {/* Shortcuts & Recent Study Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Study Sessions (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#0a0c13] border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white tracking-wide">
                Recent Study Sessions
              </h2>
            </div>
            <button
              onClick={() => setActiveTab('history')}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              View Full History <ChevronRight className="w-3.5 h-3.5" />
            </button>
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
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 group-hover:border-amber-500/40 transition-colors">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                        {session.subject || 'General Study'}
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
              Quick Shortcuts
            </h3>

            {/* Shortcut 1: Study History */}
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
                    Filter by date, search subjects & notes
                  </div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
            </button>

            {/* Shortcut 2: Export Reports */}
            <button
              onClick={() => setActiveTab('reports')}
              className="w-full p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-rose-500/30 text-left transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <FileBarChart className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-rose-300">
                    Export Reports & PDF
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Print or download comprehensive PDF
                  </div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400" />
            </button>
          </div>

          {/* Quick Weekly Summary Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0c0e16] to-[#12141f] border border-slate-800/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              7-Day Study Total
            </span>
            <div className="mt-1 text-2xl font-bold font-mono text-white">
              {formatDurationHuman(stats.weekTotalMs)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Monthly Total (30d): <span className="font-mono text-slate-300 font-semibold">{formatDurationHuman(stats.monthTotalMs)}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
