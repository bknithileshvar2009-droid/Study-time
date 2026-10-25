import React, { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import {
  formatDurationHMS,
  formatDurationHuman,
  formatTimeOfDay,
  calculatePausedDuration,
} from '../utils/timeFormat';
import { ConfirmModal } from './ConfirmModal';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  BookOpen,
  FileText,
  Clock,
  Sparkles,
  Maximize2,
  Minimize2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

export const TimerView: React.FC = () => {
  const {
    activeSession,
    timerElapsedMs,
    isTimerRunning,
    isTimerPaused,
    startStudy,
    pauseStudy,
    resumeStudy,
    stopStudy,
    discardActiveSession,
    settings,
  } = useStudy();

  const [subjectInput, setSubjectInput] = useState<string>(settings.defaultSubject);
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Sync active session notes if present
  React.useEffect(() => {
    if (activeSession) {
      setSubjectInput(activeSession.subject || settings.defaultSubject);
      setSessionNotes(activeSession.notes || '');
    }
  }, [activeSession, settings.defaultSubject]);

  const handleStart = async () => {
    if (isProcessing || isTimerRunning) return;
    setIsProcessing(true);
    try {
      await startStudy(subjectInput, sessionNotes);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePause = async () => {
    if (isProcessing || !isTimerRunning) return;
    setIsProcessing(true);
    try {
      await pauseStudy();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResume = async () => {
    if (isProcessing || !isTimerPaused) return;
    setIsProcessing(true);
    try {
      await resumeStudy();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStop = async () => {
    if (isProcessing || !activeSession) return;
    setIsProcessing(true);
    try {
      // Save current notes before stopping
      if (activeSession) {
        activeSession.notes = sessionNotes;
      }
      await stopStudy();
      setSessionNotes('');
    } finally {
      setIsProcessing(false);
    }
  };

  const pausedMs = activeSession ? calculatePausedDuration(activeSession) : 0;

  return (
    <div className={`space-y-6 ${isZenMode ? 'fixed inset-0 z-50 bg-[#07080c] p-6 flex flex-col justify-center items-center' : 'animate-in fade-in duration-300'}`}>
      {/* Top Header / Zen Switch */}
      <div className="flex items-center justify-between w-full max-w-4xl mx-auto">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-amber-400">
            Study Timer Engine
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight font-display">
            {isTimerRunning ? 'Active Focus Session' : isTimerPaused ? 'Session Paused' : 'Ready to Study'}
          </h2>
        </div>

        <button
          onClick={() => setIsZenMode(!isZenMode)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white transition-colors"
        >
          {isZenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span>{isZenMode ? 'Exit Zen Mode' : 'Distraction-Free Zen'}</span>
        </button>
      </div>

      {/* Primary Timer Monolith */}
      <div className="w-full max-w-4xl mx-auto rounded-3xl bg-gradient-to-b from-[#0e111a] via-[#090b10] to-[#06070a] border border-amber-500/25 p-8 sm:p-12 shadow-2xl relative overflow-hidden text-center">
        {/* Ambient background glow */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${
            isTimerRunning
              ? 'opacity-25 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-600 via-rose-950 to-transparent'
              : isTimerPaused
              ? 'opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-700 via-slate-900 to-transparent'
              : 'opacity-0'
          }`}
        />

        {/* Status Badge */}
        <div className="relative z-10 flex items-center justify-center gap-2 mb-6">
          <span
            className={`w-3 h-3 rounded-full ${
              isTimerRunning
                ? 'bg-emerald-400 ring-4 ring-emerald-500/20 animate-pulse'
                : isTimerPaused
                ? 'bg-amber-400 ring-4 ring-amber-500/20'
                : 'bg-slate-600'
            }`}
          />
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-300">
            {activeSession
              ? isTimerRunning
                ? 'RUNNING'
                : 'PAUSED'
              : 'IDLE'}
          </span>
          {activeSession && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
              {activeSession.subject}
            </span>
          )}
        </div>

        {/* Digital Clock Display */}
        <div className="relative z-10 my-4">
          <div className="font-mono text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight text-white drop-shadow-2xl select-none">
            {formatDurationHMS(timerElapsedMs)}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-3 font-mono">
            {formatDurationHuman(timerElapsedMs)} active study
          </p>
        </div>

        {/* Session Stats (Start Time & Paused Duration) */}
        {activeSession && (
          <div className="relative z-10 flex items-center justify-center gap-6 mt-6 pt-6 border-t border-slate-800/80 text-xs text-slate-400">
            <div>
              <span className="text-slate-500">Started: </span>
              <span className="font-mono text-slate-200">
                {formatTimeOfDay(activeSession.startTime)}
              </span>
            </div>
            <span>•</span>
            <div>
              <span className="text-slate-500">Paused Time: </span>
              <span className="font-mono text-amber-300">
                {formatDurationHMS(pausedMs)}
              </span>
            </div>
          </div>
        )}

        {/* Timer Control Buttons */}
        <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-4">
          {!activeSession ? (
            <button
              onClick={handleStart}
              disabled={isProcessing}
              className="flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-base text-black bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all shadow-xl shadow-amber-500/25 active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-5 h-5 fill-black" />
              START STUDY SESSION
            </button>
          ) : (
            <>
              {isTimerRunning && (
                <button
                  onClick={handlePause}
                  disabled={isProcessing}
                  className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-bold text-sm text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 transition-all active:scale-98 cursor-pointer"
                >
                  <Pause className="w-4 h-4 text-amber-400" />
                  PAUSE
                </button>
              )}

              {isTimerPaused && (
                <button
                  onClick={handleResume}
                  disabled={isProcessing}
                  className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-bold text-sm text-black bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 transition-all shadow-lg shadow-emerald-500/20 active:scale-98 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-black text-black" />
                  RESUME
                </button>
              )}

              <button
                onClick={handleStop}
                disabled={isProcessing}
                className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-xl shadow-red-950/40 transition-all active:scale-98 cursor-pointer"
              >
                <Square className="w-4 h-4 fill-white" />
                STOP & SAVE
              </button>

              <button
                onClick={() => setIsDiscardModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-3.5 rounded-2xl text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-800 transition-colors"
                title="Discard active session without saving"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Discard
              </button>
            </>
          )}
        </div>
      </div>

      {/* Subject & Live Notes Drawer */}
      <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Subject Card */}
        <div className="p-5 rounded-2xl bg-[#0a0c13] border border-slate-800/90 space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            Subject / Study Label
          </label>
          <input
            type="text"
            value={subjectInput}
            onChange={(e) => {
              setSubjectInput(e.target.value);
              if (activeSession) {
                activeSession.subject = e.target.value.trim() || 'General Study';
              }
            }}
            placeholder="e.g. Physics, Chemistry, Calculus"
            list="subject-presets-timer"
            className="w-full px-3.5 py-2.5 bg-black/60 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/60"
          />
          <datalist id="subject-presets-timer">
            {settings.subjectPresets.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>

          {/* Quick preset buttons */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {settings.subjectPresets.slice(0, 5).map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setSubjectInput(preset);
                  if (activeSession) {
                    activeSession.subject = preset;
                  }
                }}
                className={`text-[10px] font-medium px-2 py-1 rounded-lg border transition-colors ${
                  subjectInput === preset
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Live Session Notes */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-[#0a0c13] border border-slate-800/90 space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            Session Notes & Reflections (Saved Automatically)
          </label>
          <textarea
            rows={3}
            value={sessionNotes}
            onChange={(e) => {
              setSessionNotes(e.target.value);
              if (activeSession) {
                activeSession.notes = e.target.value;
              }
            }}
            placeholder="Record concepts covered, problem sets solved, or areas needing revision..."
            className="w-full px-3.5 py-2.5 bg-black/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60 resize-none"
          />
          <span className="text-[11px] text-slate-500 block">
            Notes will be permanently linked to this session upon stopping.
          </span>
        </div>
      </div>

      {/* Discard Confirmation Modal */}
      <ConfirmModal
        isOpen={isDiscardModalOpen}
        title="Discard Active Session?"
        message="Are you sure you want to discard this in-progress study session? This action cannot be undone and no study hours will be recorded for it."
        confirmLabel="Yes, Discard Session"
        cancelLabel="Keep Studying"
        isDestructive={true}
        onConfirm={async () => {
          setIsDiscardModalOpen(false);
          await discardActiveSession();
        }}
        onCancel={() => setIsDiscardModalOpen(false)}
      />
    </div>
  );
};
