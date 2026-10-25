import React, { useState, useMemo } from 'react';
import { useStudy } from '../context/StudyContext';
import { StudySession } from '../types';
import {
  formatDurationHMS,
  formatDurationHuman,
  formatTimeOfDay,
  getLocalDateString,
} from '../utils/timeFormat';
import { TagBadge } from './TagBadge';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Filter,
} from 'lucide-react';

interface CalendarViewProps {
  onInspectSession?: (session: StudySession) => void;
  onOpenManualEntry?: (initialDate?: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  onInspectSession,
  onOpenManualEntry,
}) => {
  const { sessions, subjects, setActiveTab } = useStudy();

  const todayStr = getLocalDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Month navigation state: current year and month (0-indexed)
  const today = new Date();
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth()); // 0-11
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(todayStr);
  };

  // Group sessions by date and calculate day stats
  const dateMap = useMemo(() => {
    const map = new Map<string, { totalMs: number; count: number; sessions: StudySession[] }>();
    
    for (const session of sessions) {
      if (subjectFilter !== 'all' && session.subject !== subjectFilter) {
        continue;
      }
      const existing = map.get(session.date) || { totalMs: 0, count: 0, sessions: [] };
      existing.totalMs += session.accumulatedActiveMs;
      existing.count += 1;
      existing.sessions.push(session);
      map.set(session.date, existing);
    }
    return map;
  }, [sessions, subjectFilter]);

  // Calendar matrix calculations
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      totalMs: number;
      sessionCount: number;
    }[] = [];

    // Prev month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevM = viewMonth === 0 ? 12 : viewMonth;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const data = dateMap.get(dateStr);
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        totalMs: data?.totalMs || 0,
        sessionCount: data?.count || 0,
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const data = dateMap.get(dateStr);
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: true,
        totalMs: data?.totalMs || 0,
        sessionCount: data?.count || 0,
      });
    }

    // Next month padding to fill complete grid of 35 or 42 cells
    const remaining = 42 - days.length;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const nextM = viewMonth === 11 ? 1 : viewMonth + 2;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const data = dateMap.get(dateStr);
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        totalMs: data?.totalMs || 0,
        sessionCount: data?.count || 0,
      });
    }

    return days;
  }, [viewYear, viewMonth, dateMap]);

  // Selected date's sessions
  const selectedDayData = dateMap.get(selectedDate);
  const selectedDaySessions = selectedDayData?.sessions || [];
  const selectedDayTotalMs = selectedDayData?.totalMs || 0;

  // Month total
  const monthTotalMs = useMemo(() => {
    let sum = 0;
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    dateMap.forEach((val, dateKey) => {
      if (dateKey.startsWith(prefix)) {
        sum += val.totalMs;
      }
    });
    return sum;
  }, [viewYear, viewMonth, dateMap]);

  // Subject color lookup
  const getSubjectColor = (subjName: string) => {
    return subjects.find((s) => s.name === subjName)?.color || '#f59e0b';
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d0f17] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight text-white flex items-center gap-2">
              Study Calendar
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono">
                {formatDurationHuman(monthTotalMs)} this month
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Interactive timeline of daily study sessions and subject consistency.
            </p>
          </div>
        </div>

        {/* Navigation & Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Subject Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111420] border border-slate-800 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="bg-transparent border-none text-xs focus:ring-0 text-slate-200 outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#111420]">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name} className="bg-[#111420]">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Month selector */}
          <div className="flex items-center bg-[#111420] border border-slate-800 rounded-xl overflow-hidden p-0.5">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-semibold text-slate-200 font-mono min-w-[130px] text-center">
              {monthNames[viewMonth]} {viewYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-200 transition-colors"
          >
            Today
          </button>

          {onOpenManualEntry && (
            <button
              onClick={() => onOpenManualEntry(selectedDate)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-bold rounded-xl shadow-md transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Session</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid & Day Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-[#0a0c12] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
          <div className="grid grid-cols-7 gap-1 mb-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span className="text-rose-400/80">Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span className="text-amber-400/80">Sat</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((day, idx) => {
              const isSelected = day.dateStr === selectedDate;
              const isToday = day.dateStr === todayStr;
              const hasActivity = day.totalMs > 0;
              const hours = (day.totalMs / (3600 * 1000)).toFixed(1);

              let heatBg = 'bg-[#111420]/40 text-slate-500';
              if (day.isCurrentMonth) {
                if (day.totalMs >= 6 * 3600 * 1000) {
                  heatBg = 'bg-amber-500/25 border-amber-500/50 text-amber-200';
                } else if (day.totalMs >= 3 * 3600 * 1000) {
                  heatBg = 'bg-amber-500/15 border-amber-500/30 text-amber-300';
                } else if (day.totalMs > 0) {
                  heatBg = 'bg-slate-800/60 border-slate-700/60 text-slate-300';
                } else {
                  heatBg = 'bg-[#10131d]/70 border-slate-800/50 text-slate-400';
                }
              } else {
                heatBg = 'bg-black/20 border-transparent text-slate-600 opacity-40';
              }

              return (
                <button
                  key={`${day.dateStr}-${idx}`}
                  onClick={() => setSelectedDate(day.dateStr)}
                  className={`min-h-[72px] sm:min-h-[82px] p-2 rounded-xl border flex flex-col justify-between text-left transition-all relative group ${heatBg} ${
                    isSelected
                      ? 'ring-2 ring-amber-400 border-amber-400 z-10 shadow-lg shadow-amber-950/40'
                      : 'hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-bold font-mono ${
                        isToday
                          ? 'w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center font-black'
                          : day.isCurrentMonth
                          ? 'text-slate-200'
                          : 'text-slate-500'
                      }`}
                    >
                      {day.dayNumber}
                    </span>

                    {hasActivity && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400" />
                    )}
                  </div>

                  {hasActivity ? (
                    <div className="mt-1">
                      <div className="text-[11px] font-mono font-bold text-amber-300">
                        {hours}h
                      </div>
                      <div className="text-[9px] text-slate-400 truncate">
                        {day.sessionCount} {day.sessionCount === 1 ? 'session' : 'sessions'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      Rest day
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Intensity Legend */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">Daily Study Intensity</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#10131d] border border-slate-800" />
                <span>0 hrs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-800 border border-slate-700" />
                <span>&lt; 3 hrs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40" />
                <span>3 - 6 hrs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500/35 border border-amber-500" />
                <span>6+ hrs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Day Panel */}
        <div className="bg-[#0a0c12] border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  {selectedDate === todayStr ? "TODAY'S TIMELINE" : 'SELECTED DATE'}
                </span>
                <h3 className="text-base font-bold text-white font-mono mt-0.5">
                  {selectedDate}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Total Focus</span>
                <span className="text-sm font-bold font-mono text-amber-300">
                  {formatDurationHMS(selectedDayTotalMs)}
                </span>
              </div>
            </div>

            {/* Sessions list */}
            <div className="mt-4 space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
              {selectedDaySessions.length === 0 ? (
                <div className="py-12 text-center">
                  <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium">
                    No sessions logged for this day.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Press Log Session to add past study time.
                  </p>
                </div>
              ) : (
                selectedDaySessions.map((s) => {
                  const color = getSubjectColor(s.subject);
                  return (
                    <div
                      key={s.id}
                      onClick={() => onInspectSession?.(s)}
                      className="p-3 rounded-xl bg-[#111420] border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300 transition-colors">
                            {s.subject}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          {formatDurationHMS(s.accumulatedActiveMs)}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span>{formatTimeOfDay(s.startTime)}</span>
                        {s.endTime && <span>→ {formatTimeOfDay(s.endTime)}</span>}
                        {s.isManualEntry && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[9px] text-slate-300">
                            Manual
                          </span>
                        )}
                      </div>

                      {s.chapter && (
                        <div className="mt-1.5 text-[11px] text-slate-300">
                          <span className="text-slate-500">Ch:</span> {s.chapter}
                          {s.topic && <span className="text-slate-500"> • {s.topic}</span>}
                        </div>
                      )}

                      {s.notes && (
                        <p className="mt-1 text-[11px] text-slate-400 italic line-clamp-2">
                          "{s.notes}"
                        </p>
                      )}

                      {s.tags && s.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {s.tags.map((t) => (
                            <TagBadge key={t} tag={t} size="sm" />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800/80">
            <button
              onClick={() => {
                setActiveTab('timer');
              }}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Go to Study Timer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
