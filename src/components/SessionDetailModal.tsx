import React from 'react';
import { StudySession } from '../types';
import {
  formatDurationHMS,
  formatDateDisplay,
  formatTimeOfDay,
  calculatePausedDuration,
  getDailyAllocations,
} from '../utils/timeFormat';
import { X, Clock, Calendar, BookOpen, PauseCircle, PlayCircle, FileText, CheckCircle2 } from 'lucide-react';
import { TagBadge } from './TagBadge';

interface SessionDetailModalProps {
  session: StudySession | null;
  onClose: () => void;
  onEdit?: (session: StudySession) => void;
  onDelete?: (id: string) => void;
}

export const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
  session,
  onClose,
  onEdit,
  onDelete,
}) => {
  if (!session) return null;

  const totalPaused = calculatePausedDuration(session);
  const dailyAlloc = getDailyAllocations(session);
  const dayKeys = Object.keys(dailyAlloc);
  const spansMidnight = dayKeys.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[#0d0f16] border border-amber-500/20 rounded-2xl p-6 shadow-2xl text-[#f1f2f6]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-amber-400/90">
              Session Inspector
            </span>
            <h2 className="text-xl font-bold text-white tracking-wide">
              {session.subject || 'General Study'}
            </h2>
          </div>
        </div>

        {/* Status & Key Metrics */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Study Duration
            </div>
            <div className="text-lg font-bold font-mono text-white mt-1">
              {formatDurationHMS(session.accumulatedActiveMs)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <PauseCircle className="w-3.5 h-3.5 text-amber-500" /> Paused Duration
            </div>
            <div className="text-lg font-bold font-mono text-slate-300 mt-1">
              {formatDurationHMS(totalPaused)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 col-span-2 sm:col-span-1">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Status
            </div>
            <div className="mt-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                  session.status === 'completed'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : session.status === 'running'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}
              >
                {session.status}
              </span>
            </div>
          </div>
        </div>

        {/* Timestamps Breakdown */}
        <div className="mt-5 space-y-2 text-sm bg-slate-900/50 p-4 rounded-xl border border-slate-800/80">
          <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
            <span className="text-slate-400 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" /> Session Date
            </span>
            <span className="font-medium text-slate-200">
              {formatDateDisplay(session.date || session.startTime)}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
            <span className="text-slate-400 flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-emerald-500" /> Start Timestamp
            </span>
            <span className="font-mono text-slate-200">
              {formatTimeOfDay(session.startTime)}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
            <span className="text-slate-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-rose-500" /> Finish Timestamp
            </span>
            <span className="font-mono text-slate-200">
              {session.endTime ? formatTimeOfDay(session.endTime) : (session.status === 'running' ? 'Still In Progress' : 'Unfinished')}
            </span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-slate-400">Pause Events Count</span>
            <span className="font-mono text-slate-300">
              {session.pauseIntervals.length} pauses
            </span>
          </div>
        </div>

        {/* Midnight Crossing Breakdown if applicable */}
        {spansMidnight && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
            <span className="font-semibold text-amber-400 block mb-1">
              Midnight Crossing Detected:
            </span>
            <div className="space-y-1 text-slate-300">
              {Object.entries(dailyAlloc).map(([day, ms]) => (
                <div key={day} className="flex justify-between font-mono">
                  <span>{formatDateDisplay(day)}:</span>
                  <span className="font-bold text-amber-300">{formatDurationHMS(ms)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {session.tags && session.tags.length > 0 && (
          <div className="mt-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5">
              {session.tags.map((t) => (
                <TagBadge key={t} tag={t} size="sm" />
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="mt-5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" /> Study Notes
          </label>
          <div className="p-3 bg-black/40 border border-slate-800 rounded-xl text-sm text-slate-300 min-h-[60px] whitespace-pre-wrap">
            {session.notes && session.notes.trim() ? (
              session.notes
            ) : (
              <span className="text-slate-500 italic">No notes recorded for this session.</span>
            )}
          </div>
        </div>

        {/* Unique Session ID */}
        <div className="mt-4 text-[11px] font-mono text-slate-500 truncate">
          ID: {session.id}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
          <div>
            {onDelete && (
              <button
                onClick={() => {
                  onDelete(session.id);
                  onClose();
                }}
                className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors border border-red-500/20"
              >
                Delete Session
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(session);
                }}
                className="px-4 py-2 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors border border-amber-500/30"
              >
                Edit Session
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
