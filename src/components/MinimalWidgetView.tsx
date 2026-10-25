import React, { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import { formatDurationHMS, formatDurationHuman, getLocalDateString } from '../utils/timeFormat';
import {
  Play,
  Square,
  Pause,
  History as HistoryIcon,
  Maximize2,
  ArrowLeft,
  Clock,
  BookOpen,
  Target,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

export const MinimalWidgetView: React.FC = () => {
  const {
    activeSession,
    timerElapsedMs,
    isTimerRunning,
    isTimerPaused,
    startStudy,
    pauseStudy,
    resumeStudy,
    stopStudy,
    sessions,
    dailySummaries,
    cloudStatus,
    cloudSaveStatus,
    settings,
    updateSettings,
    showToast,
  } = useStudy();

  const [widgetView, setWidgetView] = useState<'timer' | 'history'>('timer');

  // Calculate Daily Goal Progress
  const todayStr = getLocalDateString(Date.now());
  const todaySummary = dailySummaries.find((d) => d.date === todayStr);
  const baseTodayMs = todaySummary ? todaySummary.totalMs : 0;
  const activeMs = activeSession ? timerElapsedMs : 0;
  const totalTodayMs = baseTodayMs + activeMs;

  const goalHours = settings.dailyGoalHours || 4;
  const goalMs = goalHours * 3600 * 1000;
  const progressRatio = Math.min(1, Math.max(0, totalTodayMs / goalMs));
  const progressPercent = Math.min(100, Math.round(progressRatio * 100));
  const totalTodayHoursFormatted = (totalTodayMs / (1000 * 60 * 60)).toFixed(1);

  // SVG Ring Constants
  const circleRadius = 86;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  // Handle Start
  const handleStart = async () => {
    if (activeSession && activeSession.status === 'running') return;
    try {
      await startStudy({
        subject: 'General Study',
        timerMode: 'stopwatch',
      });
      showToast('Started study session');
    } catch (err) {
      console.error('Failed to start study session:', err);
    }
  };

  // Handle Stop
  const handleStop = async () => {
    if (!activeSession) return;
    try {
      const saved = await stopStudy();
      if (saved) {
        showToast(`Saved session: ${formatDurationHuman(saved.accumulatedActiveMs)}`);
      }
    } catch (err) {
      console.error('Failed to stop study session:', err);
    }
  };

  // Switch back to Full Dashboard Mode
  const handleExitWidgetMode = async () => {
    await updateSettings({ widgetMode: false });
    showToast('Switched to Full Dashboard Mode');
  };

  return (
    <div className="w-full min-h-screen bg-[#07080c] text-[#f1f2f6] flex items-center justify-center p-3 sm:p-6 font-sans select-none">
      <div className="w-full max-w-md bg-[#0c0e15] border border-amber-500/25 rounded-2xl shadow-2xl shadow-black/80 p-5 sm:p-6 flex flex-col relative overflow-hidden backdrop-blur-xl">
        
        {/* Subtle Decorative Glow Accents */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Bar: Title + Exit to Full Dashboard */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500/20 to-rose-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-xs tracking-wider text-white">
                  STUDY TIME TRACKER
                </span>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded">
                  WIDGET
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                {settings.studentName || 'BK NITHILESHVAR'}
              </p>
            </div>
          </div>

          <button
            onClick={handleExitWidgetMode}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-[11px] font-medium text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Switch back to full dashboard"
          >
            <Maximize2 className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Full App</span>
          </button>
        </div>

        {/* VIEW 1: MINIMAL DIGITAL TIMER & CONTROLS */}
        {widgetView === 'timer' && (
          <div className="flex flex-col items-center justify-center space-y-5 py-1">
            
            {/* Status indicator */}
            <div className="flex items-center gap-2 text-xs font-medium">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isTimerRunning
                    ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50'
                    : isTimerPaused
                    ? 'bg-amber-400'
                    : 'bg-slate-600'
                }`}
              />
              <span className="text-slate-400 font-mono tracking-wide uppercase text-[11px]">
                {isTimerRunning
                  ? 'Recording Active Study'
                  : isTimerPaused
                  ? 'Session Paused'
                  : 'Ready to Study'}
              </span>
            </div>

            {/* Clear Digital Study Timer with Progress Ring */}
            <div className="relative w-full py-6 px-4 rounded-2xl bg-black/60 border border-slate-800/90 shadow-inner flex flex-col items-center justify-center overflow-hidden">
              {/* Circular Progress Ring Container */}
              <div className="relative w-52 h-52 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                  {/* Background Track */}
                  <circle
                    cx="100"
                    cy="100"
                    r={circleRadius}
                    className="stroke-slate-800/80"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  {/* Progress Arc */}
                  <circle
                    cx="100"
                    cy="100"
                    r={circleRadius}
                    className={progressPercent >= 100 ? 'stroke-emerald-400' : 'stroke-amber-400'}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    style={{
                      transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.5s ease',
                      filter: progressPercent >= 100
                        ? 'drop-shadow(0px 0px 8px rgba(52, 211, 153, 0.5))'
                        : 'drop-shadow(0px 0px 8px rgba(251, 191, 36, 0.4))',
                    }}
                  />
                </svg>

                {/* Inner Content inside Ring */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
                  <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-amber-300 drop-shadow-md">
                    {formatDurationHMS(timerElapsedMs)}
                  </div>

                  {/* Active / General Subject Badge */}
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-semibold">
                      <BookOpen className="w-3 h-3" />
                      {activeSession?.subject || 'General Study'}
                    </span>
                  </div>

                  {/* Daily Goal Progress Indicator */}
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-800">
                    <Target className={`w-3 h-3 ${progressPercent >= 100 ? 'text-emerald-400' : 'text-amber-400'}`} />
                    <span>
                      <strong className={progressPercent >= 100 ? 'text-emerald-300' : 'text-amber-300'}>
                        {progressPercent}%
                      </strong>{' '}
                      of {goalHours}h Goal ({totalTodayHoursFormatted}h)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Core Controls: Start, Stop, Pause/Resume, History */}
            <div className="w-full space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* START / PAUSE / RESUME */}
                {!activeSession ? (
                  <button
                    onClick={handleStart}
                    className="col-span-2 py-3 px-4 rounded-xl font-bold text-xs tracking-wider uppercase text-black bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>Start Study</span>
                  </button>
                ) : (
                  <>
                    {/* Pause or Resume */}
                    <button
                      onClick={isTimerRunning ? pauseStudy : resumeStudy}
                      className="py-3 px-4 rounded-xl font-bold text-xs tracking-wider uppercase text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                    >
                      {isTimerRunning ? (
                        <>
                          <Pause className="w-4 h-4 text-amber-400" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                          <span>Resume</span>
                        </>
                      )}
                    </button>

                    {/* STOP AND SAVE */}
                    <button
                      onClick={handleStop}
                      disabled={cloudSaveStatus === 'saving'}
                      className={`py-3 px-4 rounded-xl font-bold text-xs tracking-wider uppercase text-white transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${
                        cloudSaveStatus === 'saving' ? 'bg-amber-600' : 
                        cloudSaveStatus === 'error' ? 'bg-rose-700' : 'bg-rose-600 hover:bg-rose-500'
                      }`}
                    >
                      {cloudSaveStatus === 'saving' ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : cloudSaveStatus === 'error' ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Retry Save</span>
                        </>
                      ) : (
                        <>
                          <Square className="w-3.5 h-3.5 fill-white" />
                          <span>Stop & Save</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>

              {/* HISTORY BUTTON */}
              <button
                onClick={() => setWidgetView('history')}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <HistoryIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>View Study History ({sessions.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: STUDY SESSION HISTORY */}
        {widgetView === 'history' && (
          <div className="flex flex-col space-y-4 py-1">
            {/* Top Back Nav */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <button
                onClick={() => setWidgetView('timer')}
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Timer</span>
              </button>
              <span className="text-[11px] text-slate-400 font-mono">
                {sessions.length} Saved Records
              </span>
            </div>

            {/* Scrollable list of authentic saved sessions */}
            <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {sessions.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  <p>No study sessions saved yet.</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Start a study session to record your time.
                  </p>
                </div>
              ) : (
                sessions.slice(0, 25).map((session) => {
                  const startTimeStr = new Date(session.startTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const endTimeStr = session.endTime
                    ? new Date(session.endTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'In progress';

                  return (
                    <div
                      key={session.id}
                      className="p-3 rounded-xl bg-black/40 border border-slate-800/80 hover:border-slate-700 transition-colors text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-amber-300 font-mono">
                          {session.date}
                        </span>
                        <span className="font-bold text-white font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {formatDurationHuman(session.accumulatedActiveMs)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-slate-500" />
                          <span className="text-slate-300 font-medium">
                            {session.subject || 'General Study'}
                          </span>
                        </span>
                        <span className="font-mono text-[10px]">
                          {startTimeStr} → {endTimeStr}
                        </span>
                      </div>

                      {session.notes && (
                        <p className="text-[11px] text-slate-400 italic line-clamp-1 pt-0.5">
                          "{session.notes}"
                        </p>
                      )}

                      {session.tags && session.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {session.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[9px] font-mono text-slate-400 bg-slate-900/60 px-1.5 py-0.2 rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
