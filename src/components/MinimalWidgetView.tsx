import React, { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import { formatDurationHMS, formatDurationHuman } from '../utils/timeFormat';
import {
  Play,
  Square,
  Pause,
  History as HistoryIcon,
  Maximize2,
  ArrowLeft,
  Clock,
  BookOpen,
  Calendar,
  CheckCircle2,
  Tag as TagIcon,
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
    settings,
    updateSettings,
    showToast,
  } = useStudy();

  const [widgetView, setWidgetView] = useState<'timer' | 'history'>('timer');
  const [selectedSubject, setSelectedSubject] = useState<string>(
    settings.defaultSubject || 'Physics'
  );

  // Handle Start
  const handleStart = async () => {
    if (activeSession && activeSession.status === 'running') return;
    try {
      await startStudy({
        subject: selectedSubject,
        timerMode: 'stopwatch',
      });
      showToast(`Started study session: ${selectedSubject}`);
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
          <div className="flex flex-col items-center justify-center space-y-6 py-2">
            
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

            {/* Clear Digital Study Timer */}
            <div className="w-full py-6 px-4 rounded-2xl bg-black/60 border border-slate-800/90 shadow-inner flex flex-col items-center justify-center">
              <div className="font-mono text-4xl sm:text-5xl font-extrabold tracking-tight text-amber-300 drop-shadow-md">
                {formatDurationHMS(timerElapsedMs)}
              </div>

              {/* Subject selector / active subject */}
              <div className="mt-3 flex items-center gap-1.5">
                {activeSession ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-semibold">
                    <BookOpen className="w-3 h-3" />
                    {activeSession.subject || 'General Study'}
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Subject:</span>
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="px-2.5 py-1 bg-[#141824] border border-slate-700 rounded-lg text-xs font-medium text-slate-200 focus:outline-none focus:border-amber-500/60"
                    >
                      {settings.subjectPresets.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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
                      className="py-3 px-4 rounded-xl font-bold text-xs tracking-wider uppercase text-white bg-rose-600 hover:bg-rose-500 transition-all shadow-lg shadow-rose-900/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                    >
                      <Square className="w-3.5 h-3.5 fill-white" />
                      <span>Stop & Save</span>
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
