import React, { useState, useMemo } from 'react';
import { useStudy } from '../context/StudyContext';
import { StudySession } from '../types';
import {
  formatDurationHMS,
  formatDurationHuman,
  formatDateDisplay,
  formatTimeOfDay,
  calculatePausedDuration,
  getLocalDateString,
  getDailyAllocations,
} from '../utils/timeFormat';
import { ConfirmModal } from './ConfirmModal';
import { TagBadge } from './TagBadge';
import {
  Search,
  Filter,
  Calendar,
  Clock,
  BookOpen,
  Trash2,
  Edit2,
  Eye,
  ChevronDown,
  Layers,
  Sparkles,
  AlertCircle,
  Tag as TagIcon,
  Award,
} from 'lucide-react';

interface HistoryViewProps {
  onInspectSession: (session: StudySession) => void;
  onEditSession: (session: StudySession) => void;
  onOpenManualEntry?: () => void;
}

type DateFilterOption = 'all' | 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'custom';

export const HistoryView: React.FC<HistoryViewProps> = ({
  onInspectSession,
  onEditSession,
  onOpenManualEntry,
}) => {
  const { sessions, deleteSession, stats, totalHoursFormatted, totalStudyTimeHMS, settings } = useStudy();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  // Available subjects for filter dropdown
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => {
      if (s.subject) set.add(s.subject);
    });
    return Array.from(set).sort();
  }, [sessions]);

  // Available tags across all sessions & presets
  const availableTags = useMemo(() => {
    const set = new Set<string>(settings.tagPresets.map((t) => t.replace(/^#/, '').toLowerCase()));
    sessions.forEach((s) => {
      if (s.tags) {
        s.tags.forEach((t) => set.add(t.replace(/^#/, '').toLowerCase()));
      }
    });
    return Array.from(set).sort();
  }, [sessions, settings.tagPresets]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    const todayStr = getLocalDateString();
    const now = Date.now();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterdayDate.getTime());

    return sessions.filter((s) => {
      // 1. Subject filter
      if (selectedSubject !== 'all' && s.subject !== selectedSubject) {
        return false;
      }

      // 2. Tag filter
      if (selectedTag !== 'all') {
        const cleanTag = selectedTag.replace(/^#/, '').toLowerCase();
        if (!s.tags || !s.tags.some((t) => t.replace(/^#/, '').toLowerCase() === cleanTag)) {
          return false;
        }
      }

      // 3. Search query (subject, notes, or tags)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().replace(/^#/, '');
        const subjectMatch = (s.subject || '').toLowerCase().includes(q);
        const notesMatch = (s.notes || '').toLowerCase().includes(q);
        const tagMatch = s.tags ? s.tags.some((t) => t.toLowerCase().includes(q)) : false;
        if (!subjectMatch && !notesMatch && !tagMatch) return false;
      }

      // 4. Date filter
      const sessionDate = s.date || getLocalDateString(s.startTime);

      if (dateFilter === 'today') {
        return sessionDate === todayStr;
      } else if (dateFilter === 'yesterday') {
        return sessionDate === yesterdayStr;
      } else if (dateFilter === 'last7') {
        const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;
        return s.startTime >= sevenDaysAgo;
      } else if (dateFilter === 'last30') {
        const thirtyDaysAgo = now - 30 * 24 * 3600 * 1000;
        return s.startTime >= thirtyDaysAgo;
      } else if (dateFilter === 'thisMonth') {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
        return s.startTime >= startOfMonth;
      } else if (dateFilter === 'custom') {
        if (customStartDate && sessionDate < customStartDate) return false;
        if (customEndDate && sessionDate > customEndDate) return false;
      }

      return true;
    });
  }, [sessions, selectedSubject, selectedTag, searchQuery, dateFilter, customStartDate, customEndDate]);

  // Group filtered sessions by date
  const groupedByDate = useMemo(() => {
    const groups: { date: string; displayDate: string; totalMs: number; items: StudySession[] }[] = [];
    const map = new Map<string, StudySession[]>();

    filteredSessions.forEach((s) => {
      const d = s.date || getLocalDateString(s.startTime);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(s);
    });

    const sortedDates = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

    sortedDates.forEach((dateStr) => {
      const items = map.get(dateStr)!;
      const totalMs = items.reduce((acc, s) => acc + s.accumulatedActiveMs, 0);
      groups.push({
        date: dateStr,
        displayDate: formatDateDisplay(dateStr),
        totalMs,
        items,
      });
    });

    return groups;
  }, [filteredSessions]);

  // Filtered totals
  const totalFilteredMs = useMemo(() => {
    return filteredSessions.reduce((acc, s) => acc + s.accumulatedActiveMs, 0);
  }, [filteredSessions]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header & Stats Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-amber-400">
            Historical Registry
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight font-display">
            Study Session History
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Full chronological archive with #tagging, search, and accurate duration calculations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400">Filtered: </span>
            <span className="font-mono font-bold text-amber-300">
              {formatDurationHuman(totalFilteredMs)}
            </span>{' '}
            <span className="text-slate-500 font-mono">({filteredSessions.length} sessions)</span>
          </div>

          {onOpenManualEntry && (
            <button
              onClick={onOpenManualEntry}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <span>+ Log Past Session</span>
            </button>
          )}
        </div>
      </div>

      {/* Aggregate KPI Strip - Highlighting Total Hours Till Now */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#121522] to-[#0c0e17] border border-amber-500/40">
          <div className="text-[11px] text-amber-400 font-semibold flex items-center justify-between">
            <span>Total Studied Till Now</span>
            <Award className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-300 mt-0.5">
            {totalHoursFormatted}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            {totalStudyTimeHMS}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0b0d14] border border-slate-800/90">
          <div className="text-[11px] text-slate-400 font-medium">Today's Total</div>
          <div className="text-lg font-bold font-mono text-white mt-0.5">
            {formatDurationHMS(stats.todayTotalMs)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {formatDurationHuman(stats.todayTotalMs)}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0b0d14] border border-slate-800/90">
          <div className="text-[11px] text-slate-400 font-medium">Last 7 Days</div>
          <div className="text-lg font-bold font-mono text-white mt-0.5">
            {formatDurationHuman(stats.weekTotalMs)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Last 30d: {formatDurationHuman(stats.monthTotalMs)}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0b0d14] border border-slate-800/90">
          <div className="text-[11px] text-slate-400 font-medium">Total Saved Sessions</div>
          <div className="text-lg font-bold font-mono text-white mt-0.5">
            {stats.totalSessionsCount}
          </div>
          <div className="text-[10px] text-emerald-400 mt-0.5">
            Auto Firebase Synced
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="p-4 rounded-2xl bg-[#0b0d15] border border-slate-800/80 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subjects, notes, #tags..."
              className="w-full pl-9 pr-3 py-2 bg-black/50 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>

          {/* Subject Filter */}
          <div>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 bg-black/50 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
            >
              <option value="all">All Subjects ({sessions.length})</option>
              {availableSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {/* Tag Filter */}
          <div>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full px-3 py-2 bg-black/50 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
            >
              <option value="all">All Tags (Filter by #tag)</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter Range Preset */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilterOption)}
              className="w-full px-3 py-2 bg-black/50 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
            >
              <option value="all">All Dates</option>
              <option value="today">Today Only</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="custom">Custom Date Range...</option>
            </select>
          </div>
        </div>

        {/* Quick Tag Pills Filter Strip */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
            <TagIcon className="w-3 h-3 text-amber-400" /> Filter by Tag:
          </span>
          <button
            onClick={() => setSelectedTag('all')}
            className={`text-xs px-2.5 py-0.5 rounded-lg border font-mono transition-colors ${
              selectedTag === 'all'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border-slate-800'
            }`}
          >
            All Tags
          </button>
          {availableTags.map((tag) => {
            const isSelected = selectedTag === tag;
            return (
              <button
                key={tag}
                onClick={() => setSelectedTag(isSelected ? 'all' : tag)}
                className={`text-xs px-2.5 py-0.5 rounded-lg border font-mono transition-colors flex items-center gap-1 ${
                  isSelected
                    ? 'bg-amber-500/25 text-amber-300 border-amber-500/50 shadow-sm font-semibold'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border-slate-800'
                }`}
              >
                <span>#</span>
                <span>{tag}</span>
              </button>
            );
          })}

          {(searchQuery || selectedSubject !== 'all' || selectedTag !== 'all' || dateFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedSubject('all');
                setSelectedTag('all');
                setDateFilter('all');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="text-xs px-2.5 py-0.5 rounded-lg bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/20 font-medium ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Custom Date Range Pickers (if chosen) */}
        {dateFilter === 'custom' && (
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-3 text-xs">
            <span className="text-slate-400">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-1.5 bg-black/60 border border-slate-800 rounded-lg text-white"
            />
            <span className="text-slate-400">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-1.5 bg-black/60 border border-slate-800 rounded-lg text-white"
            />
          </div>
        )}
      </div>

      {/* Sessions List grouped by Day */}
      {groupedByDate.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#0a0c13] border border-slate-800/80 space-y-2">
          <Clock className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs text-slate-400">No study sessions match your filter criteria.</p>
          <p className="text-[11px] text-slate-600">Try adjusting your #tags, search query, or date range.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByDate.map((group) => (
            <div
              key={group.date}
              className="rounded-2xl bg-[#0a0c13] border border-slate-800/80 overflow-hidden"
            >
              {/* Group Header (Date & Daily Study Total) */}
              <div className="px-5 py-3.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-white tracking-wide">
                    {group.displayDate}
                  </span>
                  <span className="text-xs text-slate-500">
                    ({group.items.length} {group.items.length === 1 ? 'session' : 'sessions'})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Daily Total:</span>
                  <span className="font-mono text-sm font-bold text-amber-300">
                    {formatDurationHuman(group.totalMs)}
                  </span>
                </div>
              </div>

              {/* Items in this date */}
              <div className="divide-y divide-slate-800/60">
                {group.items.map((session) => {
                  const pausedMs = calculatePausedDuration(session);

                  return (
                    <div
                      key={session.id}
                      className="p-4 hover:bg-slate-900/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                    >
                      {/* Left: Info & Tags */}
                      <div className="flex items-start gap-3.5">
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 group-hover:border-amber-500/30 transition-colors shrink-0 mt-0.5">
                          <BookOpen className="w-4 h-4" />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white">
                              {session.subject || 'General Study'}
                            </span>
                            <span
                              className={`text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded border ${
                                session.status === 'completed'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : session.status === 'running'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}
                            >
                              {session.status}
                            </span>

                            {/* Tags */}
                            {session.tags && session.tags.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap">
                                {session.tags.map((t) => (
                                  <TagBadge
                                    key={t}
                                    tag={t}
                                    size="xs"
                                    onClick={() => setSelectedTag(t.replace(/^#/, ''))}
                                  />
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-3">
                            <span>
                              {formatTimeOfDay(session.startTime)} →{' '}
                              {session.endTime ? formatTimeOfDay(session.endTime) : (session.status === 'running' ? 'Active' : 'Unfinished')}
                            </span>
                            {pausedMs > 0 && (
                              <span className="text-slate-500">
                                (Paused: {formatDurationHMS(pausedMs)})
                              </span>
                            )}
                          </div>

                          {session.notes && (
                            <p className="text-xs text-slate-300 mt-1 max-w-xl line-clamp-2 italic">
                              "{session.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Duration & Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/40">
                        <div className="text-right">
                          <div className="font-mono text-sm sm:text-base font-bold text-white">
                            {formatDurationHMS(session.accumulatedActiveMs)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {(session.accumulatedActiveMs / 3600000).toFixed(2)} hrs
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onInspectSession(session)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                            title="Inspect Timestamps & Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onEditSession(session)}
                            className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit Session & Tags"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setSessionToDelete(session.id)}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Delete Session"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(sessionToDelete)}
        title="Delete Study Session?"
        message="Are you sure you want to delete this recorded session? The study duration will be deducted from your daily, weekly, and all-time totals permanently."
        confirmLabel="Yes, Delete Session"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={() => {
          if (sessionToDelete) {
            deleteSession(sessionToDelete);
            setSessionToDelete(null);
          }
        }}
        onCancel={() => setSessionToDelete(null)}
      />
    </div>
  );
};
