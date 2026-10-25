import React, { useMemo, useState } from 'react';
import { useStudy } from '../context/StudyContext';
import {
  formatDurationHMS,
  formatDurationHuman,
  getLocalDateString,
} from '../utils/timeFormat';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Clock,
  Calendar,
  Flame,
  Award,
  BookOpen,
  Zap,
  Activity,
  Layers,
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const {
    sessions,
    stats,
    subjects,
    totalHoursStudied,
    totalHoursFormatted,
    totalStudyTimeHMS,
  } = useStudy();

  const [timeRange, setTimeRange] = useState<'7days' | '30days' | 'all'>('7days');

  // Today reference
  const todayStr = getLocalDateString();

  // 1. Last 7 Days Daily Breakdown
  const last7DaysData = useMemo(() => {
    const list: { dateStr: string; dayLabel: string; totalHours: number; totalMs: number; sessionCount: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });

      let totalMs = 0;
      let count = 0;
      for (const s of sessions) {
        if (s.date === dateStr) {
          totalMs += s.accumulatedActiveMs;
          count += 1;
        }
      }

      list.push({
        dateStr,
        dayLabel,
        totalHours: parseFloat((totalMs / (3600 * 1000)).toFixed(2)),
        totalMs,
        sessionCount: count,
      });
    }

    const maxHours = Math.max(1, ...list.map((d) => d.totalHours));
    return { list, maxHours };
  }, [sessions]);

  // 2. Subject Distribution Breakdown
  const subjectDistribution = useMemo(() => {
    const map: Record<string, { totalMs: number; count: number; color: string }> = {};
    let grandTotalMs = 0;

    for (const s of sessions) {
      grandTotalMs += s.accumulatedActiveMs;
      if (!map[s.subject]) {
        const color = subjects.find((sub) => sub.name === s.subject)?.color || '#f59e0b';
        map[s.subject] = { totalMs: 0, count: 0, color };
      }
      map[s.subject].totalMs += s.accumulatedActiveMs;
      map[s.subject].count += 1;
    }

    const array = Object.entries(map).map(([name, data]) => ({
      name,
      totalMs: data.totalMs,
      hours: (data.totalMs / (3600 * 1000)).toFixed(1),
      count: data.count,
      color: data.color,
      percent: grandTotalMs > 0 ? Math.round((data.totalMs / grandTotalMs) * 100) : 0,
    }));

    // Sort descending by study time
    array.sort((a, b) => b.totalMs - a.totalMs);
    return { array, grandTotalMs };
  }, [sessions, subjects]);

  // 3. Time-of-Day vs Day-of-Week Heatmap matrix
  const timeOfDayHeatmap = useMemo(() => {
    // 7 days (0: Sun to 6: Sat) x 4 slots (Morning: 6-12, Afternoon: 12-17, Evening: 17-22, Night: 22-6)
    const slots = ['Morning (06-12)', 'Afternoon (12-17)', 'Evening (17-22)', 'Night (22-06)'];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const matrix: number[][] = Array(7).fill(0).map(() => Array(4).fill(0));

    for (const s of sessions) {
      const d = new Date(s.startTime);
      const dayIdx = d.getDay();
      const hour = d.getHours();
      let slotIdx = 3; // Night
      if (hour >= 6 && hour < 12) slotIdx = 0;
      else if (hour >= 12 && hour < 17) slotIdx = 1;
      else if (hour >= 17 && hour < 22) slotIdx = 2;

      matrix[dayIdx][slotIdx] += s.accumulatedActiveMs;
    }

    let maxMs = 1;
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 4; c++) {
        if (matrix[r][c] > maxMs) maxMs = matrix[r][c];
      }
    }

    return { days, slots, matrix, maxMs };
  }, [sessions]);

  // 4. Timer Mode Distribution
  const modeDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      stopwatch: 0,
      countdown: 0,
      pomodoro: 0,
      manual: 0,
    };
    for (const s of sessions) {
      if (s.isManualEntry) {
        counts.manual += s.accumulatedActiveMs;
      } else if (counts[s.timerMode] !== undefined) {
        counts[s.timerMode] += s.accumulatedActiveMs;
      } else {
        counts.stopwatch += s.accumulatedActiveMs;
      }
    }
    return counts;
  }, [sessions]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d0f17] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight text-white flex items-center gap-2">
              Deep Study Analytics
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono">
                {totalHoursFormatted} total
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Comprehensive performance visualizations computed directly from saved study sessions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#111420] border border-slate-800 rounded-xl p-1 text-xs">
          <button
            onClick={() => setTimeRange('7days')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              timeRange === '7days' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange('30days')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              timeRange === '30days' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              timeRange === 'all' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0a0c12] border border-slate-800/80 shadow-md">
          <div className="text-[11px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Total Recorded
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            {totalHoursFormatted}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">{totalStudyTimeHMS}</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0a0c12] border border-slate-800/80 shadow-md">
          <div className="text-[11px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Sessions Logged
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
            {stats.totalSessionsCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            avg {formatDurationHuman(stats.averageSessionMs)} / session
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0a0c12] border border-slate-800/80 shadow-md">
          <div className="text-[11px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            Study Streak
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400">
            {stats.currentStreakDays} days
          </div>
          <div className="text-[10px] text-slate-500 mt-1">best record: {stats.bestStreakDays} days</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0a0c12] border border-slate-800/80 shadow-md">
          <div className="text-[11px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            Longest Focus
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            {formatDurationHuman(stats.longestSessionMs)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">single continuous session</div>
        </div>
      </div>

      {/* Primary Chart & Subject Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7 Days Bar Chart */}
        <div className="lg:col-span-2 bg-[#0a0c12] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                7-Day Study Volume
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Exact hours completed on each consecutive day.
              </p>
            </div>
            <span className="text-xs font-mono text-amber-400 font-bold">
              {formatDurationHuman(stats.weekTotalMs)} this week
            </span>
          </div>

          {/* SVG Bar Chart */}
          <div className="h-64 flex items-end justify-between gap-3 sm:gap-6 pt-4 pb-2 px-2 border-b border-slate-800">
            {last7DaysData.list.map((item, idx) => {
              const heightPercent =
                last7DaysData.maxHours > 0
                  ? Math.round((item.totalHours / last7DaysData.maxHours) * 100)
                  : 0;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                  {/* Top value hover tag */}
                  <span className="text-[10px] font-mono font-bold text-amber-300 mb-2 opacity-80 group-hover:opacity-100">
                    {item.totalHours > 0 ? `${item.totalHours}h` : '0'}
                  </span>

                  {/* Visual Bar */}
                  <div className="w-full max-w-[48px] bg-slate-900 rounded-t-xl h-full flex items-end p-1">
                    <div
                      className="w-full bg-gradient-to-t from-rose-600 via-amber-500 to-amber-300 rounded-t-lg transition-all duration-500 group-hover:brightness-125 shadow-lg shadow-amber-950/20"
                      style={{
                        height: `${Math.max(4, heightPercent)}%`,
                      }}
                    />
                  </div>

                  {/* Day label */}
                  <span className="mt-3 text-[11px] font-semibold text-slate-400 group-hover:text-amber-400 transition-colors">
                    {item.dayLabel}
                  </span>
                  <span className="text-[9px] font-mono text-slate-600">
                    {item.dateStr.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subject Breakdown Card */}
        <div className="bg-[#0a0c12] border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-rose-400" />
                Subject Distribution
              </h2>
              <span className="text-[10px] text-slate-500 uppercase font-mono">
                {subjectDistribution.array.length} active
              </span>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {subjectDistribution.array.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center italic">
                  No sessions recorded yet.
                </p>
              ) : (
                subjectDistribution.array.map((item) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-semibold text-slate-200">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-amber-400 font-bold">{item.hours}h</span>
                        <span className="text-[10px] text-slate-500">({item.percent}%)</span>
                      </div>
                    </div>
                    {/* Bar */}
                    <div className="w-full bg-slate-800/60 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percent}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Mode distribution pill footer */}
          <div className="pt-4 mt-4 border-t border-slate-800/80">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-2">
              Focus Modalities
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2 rounded-lg bg-[#111420] border border-slate-800">
                <span className="text-slate-400 block text-[9px] uppercase">Stopwatch</span>
                <span className="font-bold text-slate-200">
                  {formatDurationHuman(modeDistribution.stopwatch || 0)}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-[#111420] border border-slate-800">
                <span className="text-slate-400 block text-[9px] uppercase">Pomodoro</span>
                <span className="font-bold text-amber-400">
                  {formatDurationHuman(modeDistribution.pomodoro || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap: Day of Week vs Time of Day */}
      <div className="bg-[#0a0c12] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            Study Habit Heatmap (Day of Week vs Time of Day)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Identify your peak productive hours and concentration cycles throughout the week.
          </p>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            {/* Header row */}
            <div className="grid grid-cols-5 gap-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-800">
              <span className="text-left pl-2">Day</span>
              {timeOfDayHeatmap.slots.map((s, idx) => (
                <span key={idx}>{s}</span>
              ))}
            </div>

            {/* Matrix rows */}
            <div className="space-y-1.5 mt-2">
              {timeOfDayHeatmap.days.map((dayName, dIdx) => (
                <div key={dIdx} className="grid grid-cols-5 gap-2 items-center text-xs">
                  <span className="font-bold text-slate-300 pl-2">{dayName}</span>
                  {timeOfDayHeatmap.slots.map((_, sIdx) => {
                    const ms = timeOfDayHeatmap.matrix[dIdx][sIdx];
                    const intensity = ms > 0 ? Math.min(1, ms / timeOfDayHeatmap.maxMs) : 0;

                    let bg = 'bg-[#10131d] text-slate-600 border border-slate-800/40';
                    if (intensity > 0.7) {
                      bg = 'bg-amber-500/50 border border-amber-400 text-amber-100 font-bold';
                    } else if (intensity > 0.35) {
                      bg = 'bg-amber-500/25 border border-amber-500/40 text-amber-300 font-semibold';
                    } else if (intensity > 0) {
                      bg = 'bg-slate-800/80 border border-slate-700 text-slate-300';
                    }

                    return (
                      <div
                        key={sIdx}
                        className={`py-2 px-2 rounded-xl text-center font-mono text-[11px] transition-all hover:scale-[1.02] ${bg}`}
                      >
                        {ms > 0 ? `${(ms / (3600 * 1000)).toFixed(1)}h` : '—'}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
