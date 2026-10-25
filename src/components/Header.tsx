import React from 'react';
import { useStudy } from '../context/StudyContext';
import { formatDurationHMS } from '../utils/timeFormat';
import {
  Timer,
  Play,
  Pause,
  Cloud,
  CheckCircle2,
  RefreshCw,
  User,
  Menu,
  X,
  Clock,
  Award,
  AppWindow,
  LogIn,
  LogOut,
} from 'lucide-react';

interface HeaderProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  onOpenManualEntry?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ mobileMenuOpen, setMobileMenuOpen, onOpenManualEntry }) => {
  const {
    activeSession,
    timerElapsedMs,
    isTimerRunning,
    isTimerPaused,
    resumeStudy,
    pauseStudy,
    setActiveTab,
    cloudStatus,
    settings,
    totalHoursFormatted,
    triggerManualCloudSync,
    updateSettings,
    showToast,
    loginWithGoogle,
    logout,
  } = useStudy();

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#07080c]/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 flex items-center justify-between no-print">
      {/* Left: Mobile Toggle & Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 via-rose-600 to-amber-600 p-[1px] shadow-lg shadow-rose-950/30">
            <div className="w-full h-full bg-[#090a0f] rounded-[7px] flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-sm tracking-widest text-white">
                CHRONOS
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/30 rounded">
                STUDY
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono tracking-tight hidden sm:block">
              Precision Time Tracker
            </p>
          </div>
        </div>
      </div>

      {/* Center / Right: Total Hours Badge + Active Mini Timer + Auto Cloud Badge */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Prominent All-Time Study Hours Badge */}
        <div
          onClick={() => setActiveTab('history')}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-rose-500/10 border border-amber-500/30 cursor-pointer hover:border-amber-400/60 transition-all"
          title="All-Time Total Study Hours Till Now"
        >
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <div className="text-xs">
            <span className="text-slate-400 hidden md:inline">Total Till Now: </span>
            <span className="font-mono font-bold text-amber-300">{totalHoursFormatted}</span>
          </div>
        </div>

        {/* Live Mini Timer if active */}
        {activeSession && (
          <div
            onClick={() => setActiveTab('timer')}
            className="flex items-center gap-2.5 px-3 py-1.5 bg-black/60 border border-amber-500/30 rounded-xl cursor-pointer hover:border-amber-400/60 transition-all shadow-inner shadow-amber-950/20"
          >
            <div
              className={`w-2 h-2 rounded-full ${
                isTimerRunning
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 max-w-[80px] sm:max-w-[110px] truncate">
                {activeSession.subject || 'Study'}
              </span>
              <span className="font-mono text-xs sm:text-sm font-bold text-amber-300">
                {formatDurationHMS(timerElapsedMs)}
              </span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isTimerRunning) pauseStudy();
                else if (isTimerPaused) resumeStudy();
              }}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
              title={isTimerRunning ? 'Pause Study' : 'Resume Study'}
            >
              {isTimerRunning ? (
                <Pause className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
              )}
            </button>
          </div>
        )}

        {/* Automatic Cloud Sync Live Status (No Login System) */}
        <button
          onClick={() => triggerManualCloudSync()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border bg-emerald-950/30 border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/50 transition-colors"
          title="Firebase RTDB Connected — Automatically saving and loading data"
        >
          {cloudStatus.isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          ) : (
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span className="hidden lg:inline text-[11px]">
            {cloudStatus.isSyncing ? 'Syncing...' : 'Firebase Auto-Synced'}
          </span>
        </button>

        {/* Minimal Widget Mode Toggle Button */}
        <button
          onClick={async () => {
            await updateSettings({ widgetMode: true });
            showToast('Switched to Minimal Widget Mode');
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300 transition-all cursor-pointer"
          title="Switch to Minimal Widget Mode (ideal for embedding in APES AI)"
        >
          <AppWindow className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline text-[11px]">Widget Mode</span>
        </button>

        {/* Student Profile & Auth Shortcut */}
        <div className="flex items-center gap-1.5 bg-slate-900/40 border border-slate-800/80 rounded-xl p-0.5">
          <button
            onClick={() => setActiveTab('settings')}
            className="flex items-center gap-2 pl-2 sm:pl-3 pr-2 py-1.5 rounded-lg hover:bg-slate-800/60 text-xs text-slate-300 transition-colors"
            title="Account & Settings"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500/20 to-rose-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
              <User className="w-3.5 h-3.5" />
            </div>
            <span className="font-medium text-slate-200 hidden sm:inline max-w-[100px] truncate">
              {cloudStatus.userEmail || settings.studentName || 'Guest'}
            </span>
          </button>

          <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />

          {cloudStatus.isAnonymous ? (
            <button
              onClick={() => loginWithGoogle()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
              title="Sign in with Google to Sync Across Devices"
            >
              <LogIn className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => logout()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
