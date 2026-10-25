import React, { useState, useMemo } from 'react';
import { useStudy } from '../context/StudyContext';
import { ReportDateFilter, StudySession, DailySummary } from '../types';
import {
  formatDurationHMS,
  formatDurationHuman,
  formatDateDisplay,
  formatTimeOfDay,
  getLocalDateString,
  getDailyAllocations,
} from '../utils/timeFormat';
import { generateStudyReportPDF } from '../services/pdfReport';
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
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { sessions, settings, showToast } = useStudy();

  const [filter, setFilter] = useState<ReportDateFilter>('last7');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Compute matching sessions based on selected filter
  const { matchingSessions, filterLabel } = useMemo(() => {
    const now = Date.now();
    const todayStr = getLocalDateString(now);
    let label = 'All History';

    const filtered = sessions.filter((s) => {
      const sessionDate = s.date || getLocalDateString(s.startTime);

      if (filter === 'today') {
        label = `Today (${formatDateDisplay(todayStr)})`;
        return sessionDate === todayStr;
      }
      if (filter === 'last7') {
        label = 'Last 7 Days';
        const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;
        return s.startTime >= sevenDaysAgo;
      }
      if (filter === 'last14') {
        label = 'Last 14 Days';
        const fourteenDaysAgo = now - 14 * 24 * 3600 * 1000;
        return s.startTime >= fourteenDaysAgo;
      }
      if (filter === 'last30') {
        label = 'Last 30 Days';
        const thirtyDaysAgo = now - 30 * 24 * 3600 * 1000;
        return s.startTime >= thirtyDaysAgo;
      }
      if (filter === 'thisMonth') {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
        label = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        return s.startTime >= startOfMonth;
      }
      if (filter === 'custom') {
        label = `Custom (${customStart || 'Start'} to ${customEnd || 'Present'})`;
        if (customStart && sessionDate < customStart) return false;
        if (customEnd && sessionDate > customEnd) return false;
        return true;
      }

      // 'all'
      label = 'All Available History';
      return true;
    });

    // Chronological order ascending for reports
    const sorted = [...filtered].sort((a, b) => a.startTime - b.startTime);
    return { matchingSessions: sorted, filterLabel: label };
  }, [sessions, filter, customStart, customEnd]);

  // Aggregate totals
  const totalRecordedMs = useMemo(() => {
    return matchingSessions.reduce((acc, s) => acc + s.accumulatedActiveMs, 0);
  }, [matchingSessions]);

  // Daily summaries for the report preview
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

  // Export PDF Handler
  const handleExportPDF = () => {
    if (matchingSessions.length === 0) {
      showToast('No sessions recorded in this date range to export');
      return;
    }

    setIsGenerating(true);
    try {
      const doc = generateStudyReportPDF({
        studentName: settings.studentName,
        dateRangeLabel: filterLabel,
        sessions: matchingSessions,
      });

      const safeName = (settings.studentName || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Study_Report_${safeName}_${filter}_${getLocalDateString()}.pdf`;
      doc.save(filename);
      showToast('PDF Report downloaded successfully!');
    } catch (err) {
      console.error('PDF generation error:', err);
      showToast('Failed to generate PDF. Check console.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Browser Print Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Screen-Only Header & Controls */}
      <div className="no-print space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-amber-400">
              Official Reporting
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight font-display">
              Study Reports & PDF Generator
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Generate printer-friendly, auditable PDF reports of study durations and subject breakdowns.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handlePrint}
              disabled={matchingSessions.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              PRINT REPORT
            </button>

            <button
              onClick={handleExportPDF}
              disabled={isGenerating || matchingSessions.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 cursor-pointer"
            >
              <FileDown className="w-4 h-4 fill-black" />
              {isGenerating ? 'GENERATING PDF...' : 'DOWNLOAD PDF REPORT'}
            </button>
          </div>
        </div>

        {/* Date Range Selector Pill Bar */}
        <div className="p-4 rounded-2xl bg-[#0b0d15] border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-amber-400" /> Select Date Range
            </span>
            <span className="text-xs text-amber-300 font-medium">
              Active Scope: {filterLabel}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: 'last7', label: 'Last 7 Days' },
                { id: 'last14', label: 'Last 14 Days' },
                { id: 'last30', label: 'Last 30 Days' },
                { id: 'thisMonth', label: 'This Month' },
                { id: 'all', label: 'All History' },
                { id: 'custom', label: 'Custom Range...' },
              ] as { id: ReportDateFilter; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setFilter(opt.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  filter === opt.id
                    ? 'bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/40 shadow-sm font-semibold'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {filter === 'custom' && (
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

        {/* Report Summary Cards (Screen) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#0a0c13] border border-slate-800/80">
            <div className="text-xs text-slate-400">Total Study Time in Range</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
              {formatDurationHuman(totalRecordedMs)}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              {formatDurationHMS(totalRecordedMs)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0a0c13] border border-slate-800/80">
            <div className="text-xs text-slate-400">Total Sessions</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
              {matchingSessions.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Across {dailySummaries.length} active study days
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0a0c13] border border-slate-800/80">
            <div className="text-xs text-slate-400">Student Profile</div>
            <div className="text-xl sm:text-2xl font-bold text-amber-300 mt-1 truncate">
              {settings.studentName || 'Student'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Name displayed on official PDF header
            </div>
          </div>
        </div>
      </div>

      {/* Printable Report Document (Visible on screen as Preview, and rendered during window.print()) */}
      <div className="print-page bg-[#0d0f17] print:bg-white text-slate-200 print:text-black border border-slate-800 print:border-none rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        {/* Document Header */}
        <div className="border-b border-slate-800 print:border-slate-300 pb-4 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 print:text-slate-600 block">
              Official Academic Record
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white print:text-black tracking-wide font-display">
              STUDY TIME TRACKER — STUDY REPORT
            </h1>
            <div className="text-xs text-slate-400 print:text-slate-600 mt-1 flex flex-wrap gap-x-4">
              <span><strong>Student:</strong> {settings.studentName || 'Student'}</span>
              <span><strong>Date Range:</strong> {filterLabel}</span>
            </div>
          </div>

          <div className="text-right text-xs text-slate-400 print:text-slate-600 self-start sm:self-auto">
            <div><strong>Generated:</strong> {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            <div className="text-[11px] text-slate-500">Chronos Study Precision Engine</div>
          </div>
        </div>

        {/* Total Summary Strip in Printable Format */}
        <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-slate-900/60 print:bg-slate-100 border border-slate-800 print:border-slate-300">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Total Study Time</div>
            <div className="text-lg font-bold font-mono text-amber-300 print:text-black mt-0.5">
              {formatDurationHuman(totalRecordedMs)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Recorded Sessions</div>
            <div className="text-lg font-bold font-mono text-white print:text-black mt-0.5">
              {matchingSessions.length}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Active Study Days</div>
            <div className="text-lg font-bold font-mono text-white print:text-black mt-0.5">
              {dailySummaries.length}
            </div>
          </div>
        </div>

        {/* Section 1: Daily Summaries */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-white print:text-black tracking-wide uppercase flex items-center gap-2">
            <span>1. Daily Summaries</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-800 print:border-slate-300">
              <thead className="bg-slate-900 print:bg-slate-200 text-slate-300 print:text-black border-b border-slate-800 print:border-slate-300">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Date & Weekday</th>
                  <th className="py-2.5 px-3 font-semibold">Daily Study Duration</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Sessions</th>
                  <th className="py-2.5 px-3 font-semibold">Subject Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 print:divide-slate-300">
                {dailySummaries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 px-3 text-center text-slate-500 italic">
                      No study sessions recorded in this date range.
                    </td>
                  </tr>
                ) : (
                  dailySummaries.map((day) => {
                    const subjects = Object.entries(day.subjectBreakdown)
                      .map(([sub, ms]) => `${sub}: ${formatDurationHuman(ms)}`)
                      .join('; ');

                    return (
                      <tr key={day.date} className="hover:bg-slate-900/30 print:hover:bg-transparent">
                        <td className="py-2 px-3 font-medium text-slate-200 print:text-black whitespace-nowrap">
                          {day.displayDate}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-amber-300 print:text-black whitespace-nowrap">
                          {formatDurationHMS(day.totalMs)} ({(day.totalMs / 3600000).toFixed(2)}h)
                        </td>
                        <td className="py-2 px-3 text-center font-mono">
                          {day.sessionCount}
                        </td>
                        <td className="py-2 px-3 text-slate-400 print:text-slate-700">
                          {subjects || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Session Details */}
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-bold text-white print:text-black tracking-wide uppercase flex items-center gap-2">
            <span>2. Session Details</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-800 print:border-slate-300">
              <thead className="bg-slate-900 print:bg-slate-200 text-slate-300 print:text-black border-b border-slate-800 print:border-slate-300">
                <tr>
                  <th className="py-2 px-2.5 font-semibold">Date</th>
                  <th className="py-2 px-2.5 font-semibold">Start Time</th>
                  <th className="py-2 px-2.5 font-semibold">Finish Time</th>
                  <th className="py-2 px-2.5 font-semibold">Duration</th>
                  <th className="py-2 px-2.5 font-semibold">Subject</th>
                  <th className="py-2 px-2.5 font-semibold text-center">Status</th>
                  <th className="py-2 px-2.5 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 print:divide-slate-300">
                {matchingSessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 px-3 text-center text-slate-500 italic">
                      No individual session records found.
                    </td>
                  </tr>
                ) : (
                  matchingSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-slate-900/30 print:hover:bg-transparent">
                      <td className="py-2 px-2.5 whitespace-nowrap text-slate-300 print:text-black">
                        {session.date || getLocalDateString(session.startTime)}
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap font-mono text-slate-400 print:text-black">
                        {formatTimeOfDay(session.startTime)}
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap font-mono text-slate-400 print:text-black">
                        {session.endTime ? formatTimeOfDay(session.endTime) : (session.status === 'running' ? 'Active' : 'Unfinished')}
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap font-mono font-bold text-amber-300 print:text-black">
                        {formatDurationHMS(session.accumulatedActiveMs)}
                      </td>
                      <td className="py-2 px-2.5 font-medium text-slate-200 print:text-black">
                        {session.subject || 'General Study'}
                      </td>
                      <td className="py-2 px-2.5 text-center uppercase font-bold text-[10px] text-emerald-400 print:text-black">
                        {session.status}
                      </td>
                      <td className="py-2 px-2.5 text-slate-400 print:text-slate-700 italic max-w-xs truncate">
                        {session.notes ? session.notes : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 print:border-slate-300 text-[10px] text-slate-500 print:text-slate-600 flex justify-between items-center">
          <span>End of Report • Chronos Study Time Tracker</span>
          <span>Verified Timestamp Audit</span>
        </div>
      </div>
    </div>
  );
};
