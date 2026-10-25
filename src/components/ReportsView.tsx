import React, { useState, useMemo } from 'react';
import { useStudy } from '../context/StudyContext';
import { StudySession, DailySummary } from '../types';
import {
  formatDurationHMS,
  formatDurationHuman,
  formatDateDisplay,
  formatTimeOfDay,
  getLocalDateString,
  getDailyAllocations,
  calculatePausedDuration,
} from '../utils/timeFormat';
import { buildProductionStudyReport } from '../services/pdfReport';
import { TagBadge } from './TagBadge';
import {
  FileDown,
  Printer,
  Calendar,
  Clock,
  BookOpen,
  Filter,
  CheckCircle,
  Sparkles,
  FileText,
  AlertCircle,
  Award,
  Layers,
  ArrowRight,
} from 'lucide-react';

type ReportFilterMode = 'today' | 'last7' | 'last14' | 'last30' | 'thisMonth' | 'all' | 'custom';

export const ReportsView: React.FC = () => {
  const { sessions, settings, showToast } = useStudy();

  const [filterMode, setFilterMode] = useState<ReportFilterMode>('last14');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const studentName = settings.studentName || 'BK NITHILESHVAR';

  // Compute date boundaries and matching sessions
  const { matchingSessions, filterLabel, startDateStr, endDateStr } = useMemo(() => {
    const now = Date.now();
    const todayStr = getLocalDateString(now);
    let label = 'All Available History';
    let startStr = '';
    let endStr = todayStr;

    if (filterMode === 'today') {
      label = `Today (${formatDateDisplay(todayStr)})`;
      startStr = todayStr;
      endStr = todayStr;
      const filtered = sessions.filter((s) => {
        const sDate = s.date || getLocalDateString(s.startTime);
        return sDate === todayStr;
      });
      return { matchingSessions: [...filtered].sort((a, b) => a.startTime - b.startTime), filterLabel: label, startDateStr: startStr, endDateStr: endStr };
    }

    if (filterMode === 'last7') {
      const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;
      startStr = getLocalDateString(sevenDaysAgo);
      label = `Last 7 Days (${formatDateDisplay(startStr)} – ${formatDateDisplay(endStr)})`;
      const filtered = sessions.filter((s) => s.startTime >= sevenDaysAgo);
      return { matchingSessions: [...filtered].sort((a, b) => a.startTime - b.startTime), filterLabel: label, startDateStr: startStr, endDateStr: endStr };
    }

    if (filterMode === 'last14') {
      const fourteenDaysAgo = now - 14 * 24 * 3600 * 1000;
      startStr = getLocalDateString(fourteenDaysAgo);
      label = `Last 14 Days (${formatDateDisplay(startStr)} – ${formatDateDisplay(endStr)})`;
      const filtered = sessions.filter((s) => s.startTime >= fourteenDaysAgo);
      return { matchingSessions: [...filtered].sort((a, b) => a.startTime - b.startTime), filterLabel: label, startDateStr: startStr, endDateStr: endStr };
    }

    if (filterMode === 'last30') {
      const thirtyDaysAgo = now - 30 * 24 * 3600 * 1000;
      startStr = getLocalDateString(thirtyDaysAgo);
      label = `Last 30 Days (${formatDateDisplay(startStr)} – ${formatDateDisplay(endStr)})`;
      const filtered = sessions.filter((s) => s.startTime >= thirtyDaysAgo);
      return { matchingSessions: [...filtered].sort((a, b) => a.startTime - b.startTime), filterLabel: label, startDateStr: startStr, endDateStr: endStr };
    }

    if (filterMode === 'thisMonth') {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const startOfMonthMs = new Date(currentYear, currentMonth, 1).getTime();
      startStr = getLocalDateString(startOfMonthMs);
      label = `This Calendar Month (${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`;
      const filtered = sessions.filter((s) => s.startTime >= startOfMonthMs);
      return { matchingSessions: [...filtered].sort((a, b) => a.startTime - b.startTime), filterLabel: label, startDateStr: startStr, endDateStr: endStr };
    }

    if (filterMode === 'custom') {
      label = `Custom Range: ${customStart || 'Start'} to ${customEnd || 'Present'}`;
      const filtered = sessions.filter((s) => {
        const sDate = s.date || getLocalDateString(s.startTime);
        if (customStart && sDate < customStart) return false;
        if (customEnd && sDate > customEnd) return false;
        return true;
      });
      return { matchingSessions: [...filtered].sort((a, b) => a.startTime - b.startTime), filterLabel: label, startDateStr: customStart, endDateStr: customEnd };
    }

    // 'all'
    const sortedAll = [...sessions].sort((a, b) => a.startTime - b.startTime);
    if (sortedAll.length > 0) {
      startStr = sortedAll[0].date || getLocalDateString(sortedAll[0].startTime);
      endStr = sortedAll[sortedAll.length - 1].date || getLocalDateString(sortedAll[sortedAll.length - 1].startTime);
      label = `All Available History (${formatDateDisplay(startStr)} – ${formatDateDisplay(endStr)})`;
    }
    return { matchingSessions: sortedAll, filterLabel: label, startDateStr: startStr, endDateStr: endStr };
  }, [sessions, filterMode, customStart, customEnd]);

  // Aggregate metrics
  const totalRecordedMs = useMemo(() => {
    return matchingSessions.reduce((acc, s) => acc + s.accumulatedActiveMs, 0);
  }, [matchingSessions]);

  const completedSessions = useMemo(() => {
    return matchingSessions.filter((s) => s.status === 'completed');
  }, [matchingSessions]);

  // Daily summaries with midnight allocation
  const dailySummaries = useMemo<DailySummary[]>(() => {
    const map: Record<string, DailySummary> = {};

    matchingSessions.forEach((session) => {
      const dailyAlloc = getDailyAllocations(session);
      for (const [dayKey, ms] of Object.entries(dailyAlloc)) {
        if (!map[dayKey]) {
          map[dayKey] = {
            date: dayKey,
            displayDate: formatDateDisplay(dayKey),
            totalMs: 0,
            sessionCount: 0,
            subjectBreakdown: {},
          };
        }
        map[dayKey].totalMs += ms;
        map[dayKey].sessionCount += 1;
        const subj = session.subject || 'General Study';
        map[dayKey].subjectBreakdown[subj] = (map[dayKey].subjectBreakdown[subj] || 0) + ms;
      }
    });

    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [matchingSessions]);

  const activeDaysCount = dailySummaries.length;
  const avgStudyPerDayMs = activeDaysCount > 0 ? Math.round(totalRecordedMs / activeDaysCount) : 0;
  const avgCompletedSessionMs =
    completedSessions.length > 0
      ? Math.round(
          completedSessions.reduce((acc, s) => acc + s.accumulatedActiveMs, 0) /
            completedSessions.length
        )
      : 0;

  // Subject breakdown list
  const subjectBreakdownList = useMemo(() => {
    const map: Record<string, { sessions: number; totalMs: number }> = {};
    matchingSessions.forEach((s) => {
      const subj = s.subject || 'General Study';
      if (!map[subj]) map[subj] = { sessions: 0, totalMs: 0 };
      map[subj].sessions += 1;
      map[subj].totalMs += s.accumulatedActiveMs;
    });

    return Object.entries(map)
      .map(([subject, data]) => ({
        subject,
        sessions: data.sessions,
        totalMs: data.totalMs,
        percentage: totalRecordedMs > 0 ? (data.totalMs / totalRecordedMs) * 100 : 0,
      }))
      .sort((a, b) => b.totalMs - a.totalMs);
  }, [matchingSessions, totalRecordedMs]);

  // PDF Export Execution
  const handleExportPDF = () => {
    if (matchingSessions.length === 0) {
      showToast('No study records found in selected date range');
      return;
    }

    setIsGenerating(true);
    try {
      const result = buildProductionStudyReport({
        studentName,
        reportOption: filterMode,
        dateRangeLabel: filterLabel,
        startDateStr,
        endDateStr,
        sessions: matchingSessions,
      });

      result.doc.save(result.filename);
      showToast(`PDF Report downloaded: ${result.filename}`);
    } catch (err) {
      console.error('PDF generation error:', err);
      showToast('Failed to generate PDF document');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Controls (Screen Only) */}
      <div className="no-print space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-widest text-amber-400">
                Official Reporting Engine
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-300 font-semibold font-mono">
                Student: {studentName}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight font-display">
              Personal Study Time & Performance Record
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Generate genuine, auditable A4 PDF reports with daily summaries, subject breakdowns, and session registers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handlePrint}
              disabled={matchingSessions.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              title="Print printer-friendly layout"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              PRINT REPORT
            </button>

            <button
              onClick={handleExportPDF}
              disabled={isGenerating || matchingSessions.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 cursor-pointer"
            >
              <FileDown className="w-4 h-4 fill-black" />
              {isGenerating ? 'GENERATING A4 PDF...' : 'DOWNLOAD PDF REPORT'}
            </button>
          </div>
        </div>

        {/* 2. Seven Presets Filter Pill Bar */}
        <div className="p-5 rounded-2xl bg-[#0b0d15] border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              Select Reporting Period
            </span>
            <span className="text-xs text-amber-300 font-mono font-medium">
              Active Scope: {filterLabel}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'today', label: "Today's Report" },
                { id: 'last7', label: 'Last 7 Days' },
                { id: 'last14', label: 'Last 14 Days' },
                { id: 'last30', label: 'Last 30 Days' },
                { id: 'thisMonth', label: 'This Calendar Month' },
                { id: 'all', label: 'All Available History' },
                { id: 'custom', label: 'Custom Range...' },
              ] as { id: ReportFilterMode; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setFilterMode(opt.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  filterMode === opt.id
                    ? 'bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/40 shadow-sm font-semibold'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {filterMode === 'custom' && (
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-3 text-xs">
              <span className="text-slate-400">Start Date:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-1.5 bg-black/60 border border-slate-800 rounded-lg text-white"
              />
              <span className="text-slate-400">End Date:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-1.5 bg-black/60 border border-slate-800 rounded-lg text-white"
              />
            </div>
          )}
        </div>

        {/* 3. Executive KPI Summary Strip (Screen Cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#0a0c13] border border-amber-500/20">
            <div className="text-[11px] text-slate-400 font-medium">Total Recorded Study Time</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-300 mt-1">
              {formatDurationHMS(totalRecordedMs)}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              {(totalRecordedMs / 3600000).toFixed(2)} hours
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0a0c13] border border-slate-800/80">
            <div className="text-[11px] text-slate-400 font-medium">Recorded Sessions</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
              {matchingSessions.length}
            </div>
            <div className="text-[10px] text-emerald-400 mt-0.5">
              {completedSessions.length} completed
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0a0c13] border border-slate-800/80">
            <div className="text-[11px] text-slate-400 font-medium">Active Study Days</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
              {activeDaysCount} <span className="text-sm font-normal text-slate-400">days</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Avg: {formatDurationHuman(avgStudyPerDayMs)} / day
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0a0c13] border border-slate-800/80">
            <div className="text-[11px] text-slate-400 font-medium">Avg Duration / Session</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
              {formatDurationHuman(avgCompletedSessionMs)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Based on completed sessions
            </div>
          </div>
        </div>
      </div>

      {/* 4. Complete Printable Document / On-Screen Preview */}
      <div className="print-page bg-[#0d0f17] print:bg-white text-slate-200 print:text-black border border-slate-800 print:border-none rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        {/* Cover Header */}
        <div className="border-b border-slate-800 print:border-slate-300 pb-5 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-bold tracking-widest text-amber-400 print:text-slate-700">
              STUDY TIME TRACKER
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white print:text-black tracking-wide font-display">
              PERSONAL STUDY TIME & PERFORMANCE RECORD
            </h1>
            <div className="text-xs text-slate-400 print:text-slate-600 font-mono">
              OFFICIAL STUDY SESSION HISTORY & AUDIT LOG
            </div>
            <div className="pt-2 text-sm">
              <strong className="text-amber-300 print:text-black">Student: {studentName}</strong>
            </div>
          </div>

          <div className="text-right text-xs text-slate-400 print:text-slate-600 self-start sm:self-auto space-y-0.5 font-mono">
            <div><strong>Period:</strong> {filterLabel}</div>
            <div><strong>Generated:</strong> {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date().toLocaleTimeString()}</div>
            <div className="text-[11px] text-slate-500">Standalone Study Time Tracker Engine</div>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-900/60 print:bg-slate-100 border border-slate-800 print:border-slate-300">
          <div>
            <div className="text-[9px] uppercase font-bold text-slate-400 print:text-slate-600">Total Active Study Time</div>
            <div className="text-base font-bold font-mono text-amber-300 print:text-black mt-0.5">
              {formatDurationHMS(totalRecordedMs)}
            </div>
            <div className="text-[10px] text-slate-500 print:text-slate-600 font-mono">
              {(totalRecordedMs / 3600000).toFixed(2)} hours
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase font-bold text-slate-400 print:text-slate-600">Total Sessions</div>
            <div className="text-base font-bold font-mono text-white print:text-black mt-0.5">
              {matchingSessions.length} sessions
            </div>
            <div className="text-[10px] text-slate-500 print:text-slate-600">
              {completedSessions.length} completed
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase font-bold text-slate-400 print:text-slate-600">Active Study Days</div>
            <div className="text-base font-bold font-mono text-white print:text-black mt-0.5">
              {activeDaysCount} days
            </div>
            <div className="text-[10px] text-slate-500 print:text-slate-600 font-mono">
              {formatDurationHuman(avgStudyPerDayMs)} / day
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase font-bold text-slate-400 print:text-slate-600">Avg Session Duration</div>
            <div className="text-base font-bold font-mono text-white print:text-black mt-0.5">
              {formatDurationHuman(avgCompletedSessionMs)}
            </div>
            <div className="text-[10px] text-slate-500 print:text-slate-600">
              Completed sessions
            </div>
          </div>
        </div>

        {/* Section 1: Daily Study Summary */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white print:text-black flex items-center gap-2">
            <span>1. Daily Study Summary</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-800 print:border-slate-300">
              <thead className="bg-slate-900 print:bg-slate-200 text-slate-300 print:text-black border-b border-slate-800 print:border-slate-300">
                <tr>
                  <th className="py-2 px-3 font-semibold">Date</th>
                  <th className="py-2 px-3 font-semibold">Weekday</th>
                  <th className="py-2 px-3 font-semibold text-center">Sessions</th>
                  <th className="py-2 px-3 font-semibold">Active Study Time</th>
                  <th className="py-2 px-3 font-semibold">Subjects & Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 print:divide-slate-300">
                {dailySummaries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 px-3 text-center text-slate-500 italic">
                      No study activity recorded in this period.
                    </td>
                  </tr>
                ) : (
                  dailySummaries.map((day) => {
                    const [y, m, d] = day.date.split('-').map(Number);
                    const dateObj = new Date(y, m - 1, d);
                    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                    const subjects = Object.entries(day.subjectBreakdown)
                      .map(([sub, ms]) => `${sub}: ${formatDurationHuman(ms)}`)
                      .join(', ');

                    return (
                      <tr key={day.date} className="hover:bg-slate-900/30 print:hover:bg-transparent">
                        <td className="py-1.5 px-3 font-mono font-semibold text-slate-200 print:text-black whitespace-nowrap">
                          {day.date}
                        </td>
                        <td className="py-1.5 px-3 text-slate-300 print:text-black">
                          {weekday}
                        </td>
                        <td className="py-1.5 px-3 text-center font-mono">
                          {day.sessionCount}
                        </td>
                        <td className="py-1.5 px-3 font-mono font-bold text-amber-300 print:text-black whitespace-nowrap">
                          {formatDurationHMS(day.totalMs)} ({(day.totalMs / 3600000).toFixed(2)}h)
                        </td>
                        <td className="py-1.5 px-3 text-slate-400 print:text-slate-700">
                          {subjects || 'General Study'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Subject-Wise Breakdown */}
        {subjectBreakdownList.length > 0 && (
          <div className="space-y-2 pt-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white print:text-black flex items-center gap-2">
              <span>2. Subject-Wise Breakdown</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-800 print:border-slate-300">
                <thead className="bg-slate-900 print:bg-slate-200 text-slate-300 print:text-black border-b border-slate-800 print:border-slate-300">
                  <tr>
                    <th className="py-2 px-3 font-semibold">Subject / Study Label</th>
                    <th className="py-2 px-3 font-semibold text-center">Sessions Count</th>
                    <th className="py-2 px-3 font-semibold">Total Active Study Time</th>
                    <th className="py-2 px-3 font-semibold text-center">Percentage (% Share)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 print:divide-slate-300">
                  {subjectBreakdownList.map((item) => (
                    <tr key={item.subject} className="hover:bg-slate-900/30 print:hover:bg-transparent">
                      <td className="py-1.5 px-3 font-medium text-slate-200 print:text-black">
                        {item.subject}
                      </td>
                      <td className="py-1.5 px-3 text-center font-mono">
                        {item.sessions}
                      </td>
                      <td className="py-1.5 px-3 font-mono font-bold text-amber-300 print:text-black">
                        {formatDurationHMS(item.totalMs)} ({(item.totalMs / 3600000).toFixed(2)} hrs)
                      </td>
                      <td className="py-1.5 px-3 text-center font-mono font-semibold text-slate-300 print:text-black">
                        {item.percentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 3: Detailed Study Session Register */}
        <div className="space-y-2 pt-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white print:text-black flex items-center gap-2">
            <span>3. Detailed Study Session Register</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-800 print:border-slate-300">
              <thead className="bg-slate-900 print:bg-slate-200 text-slate-300 print:text-black border-b border-slate-800 print:border-slate-300">
                <tr>
                  <th className="py-2 px-2 font-semibold text-center">No.</th>
                  <th className="py-2 px-2.5 font-semibold">Date</th>
                  <th className="py-2 px-2.5 font-semibold">Study Label</th>
                  <th className="py-2 px-2.5 font-semibold">Start Time</th>
                  <th className="py-2 px-2.5 font-semibold">Finish Time</th>
                  <th className="py-2 px-2 font-semibold text-center">Paused</th>
                  <th className="py-2 px-2.5 font-semibold">Active Duration</th>
                  <th className="py-2 px-2 font-semibold text-center">Status</th>
                  <th className="py-2 px-2.5 font-semibold">Notes & Tags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 print:divide-slate-300">
                {matchingSessions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-4 px-3 text-center text-slate-500 italic">
                      No individual study sessions recorded in this period.
                    </td>
                  </tr>
                ) : (
                  matchingSessions.map((session, index) => {
                    const pausedMs = calculatePausedDuration(session);

                    return (
                      <tr key={session.id} className="hover:bg-slate-900/30 print:hover:bg-transparent">
                        <td className="py-1.5 px-2 text-center font-mono text-slate-400 print:text-black">
                          {index + 1}
                        </td>
                        <td className="py-1.5 px-2.5 whitespace-nowrap font-mono text-slate-300 print:text-black">
                          {session.date || getLocalDateString(session.startTime)}
                        </td>
                        <td className="py-1.5 px-2.5 font-medium text-slate-200 print:text-black">
                          {session.subject || 'General Study'}
                        </td>
                        <td className="py-1.5 px-2.5 whitespace-nowrap font-mono text-slate-400 print:text-black">
                          {formatTimeOfDay(session.startTime)}
                        </td>
                        <td className="py-1.5 px-2.5 whitespace-nowrap font-mono text-slate-400 print:text-black">
                          {session.endTime ? formatTimeOfDay(session.endTime) : (session.status === 'running' ? 'Active' : 'Unfinished')}
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono text-slate-400 print:text-black">
                          {pausedMs > 0 ? formatDurationHMS(pausedMs) : '00:00:00'}
                        </td>
                        <td className="py-1.5 px-2.5 whitespace-nowrap font-mono font-bold text-amber-300 print:text-black">
                          {formatDurationHMS(session.accumulatedActiveMs)}
                        </td>
                        <td className="py-1.5 px-2 text-center uppercase font-bold text-[9px] text-emerald-400 print:text-black">
                          {session.status}
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-400 print:text-slate-700 italic max-w-xs">
                          {session.tags && session.tags.length > 0 && (
                            <span className="font-mono text-[10px] text-amber-400/90 print:text-slate-800 mr-1 font-semibold not-italic">
                              {session.tags.map((t) => `#${t.replace(/^#/, '')}`).join(' ')}
                            </span>
                          )}
                          {session.notes ? session.notes : (!session.tags || session.tags.length === 0 ? '—' : '')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Final Reconciled Record Totals Box */}
        <div className="p-4 rounded-xl bg-slate-900/60 print:bg-slate-100 border border-slate-800 print:border-slate-300 text-xs text-slate-300 print:text-black space-y-1">
          <div className="font-bold text-amber-300 print:text-black uppercase tracking-wider text-[11px]">
            Official Record Reconciliation & Integrity Certificate
          </div>
          <div>
            Reconciles {matchingSessions.length} total study session(s) spanning {activeDaysCount} active study date(s).
          </div>
          <div>
            Total Active Study Time: <strong className="font-mono">{formatDurationHMS(totalRecordedMs)} ({(totalRecordedMs / 3600000).toFixed(2)} hours)</strong>. Paused periods were strictly deducted.
          </div>
          <div className="text-[11px] text-slate-400 print:text-slate-600 pt-1">
            Certified Student Identity: <strong>{studentName}</strong> • Standalone Study Time Tracker
          </div>
        </div>

        {/* Document Running Footer */}
        <div className="pt-3 border-t border-slate-800 print:border-slate-300 text-[10px] text-slate-500 print:text-slate-600 flex justify-between items-center">
          <span>Student: {studentName} • Official Study Record</span>
          <span>A4 Document Output</span>
        </div>
      </div>
    </div>
  );
};
