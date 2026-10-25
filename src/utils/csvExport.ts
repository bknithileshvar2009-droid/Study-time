/**
 * Standard RFC-4180 compliant CSV Export Generator
 */

import { StudySession, DailySummary, SubjectItem } from '../types';
import {
  formatDurationHMS,
  formatDurationHuman,
  formatDateDisplay,
  formatTimeOfDay,
  calculatePausedDuration,
  getLocalDateString,
} from './timeFormat';

function escapeCSV(field: string | number | null | undefined): string {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportSessionsToCSV(sessions: StudySession[], studentName: string): string {
  const headers = [
    'Session ID',
    'Date',
    'Weekday',
    'Subject',
    'Course',
    'Chapter',
    'Topic',
    'Tags',
    'Timer Mode',
    'Status',
    'Start Time',
    'Finish Time',
    'Active Duration (HH:MM:SS)',
    'Active Duration (Hours)',
    'Paused Duration (HH:MM:SS)',
    'Manual Entry',
    'Notes',
    'Student Name',
  ];

  const rows = sessions.map((s) => {
    const sDate = s.date || getLocalDateString(s.startTime);
    const [y, m, d] = sDate.split('-').map(Number);
    const weekday = new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long' });
    const pausedMs = calculatePausedDuration(s);
    const activeHrs = (s.accumulatedActiveMs / 3600000).toFixed(2);
    const tagsStr = s.tags ? s.tags.map((t) => `#${t.replace(/^#/, '')}`).join(' ') : '';

    return [
      escapeCSV(s.id),
      escapeCSV(sDate),
      escapeCSV(weekday),
      escapeCSV(s.subject || 'General Study'),
      escapeCSV(s.course || ''),
      escapeCSV(s.chapter || ''),
      escapeCSV(s.topic || ''),
      escapeCSV(tagsStr),
      escapeCSV(s.timerMode || 'stopwatch'),
      escapeCSV(s.status),
      escapeCSV(formatTimeOfDay(s.startTime)),
      escapeCSV(s.endTime ? formatTimeOfDay(s.endTime) : (s.status === 'running' ? 'Active' : 'Unfinished')),
      escapeCSV(formatDurationHMS(s.accumulatedActiveMs)),
      escapeCSV(activeHrs),
      escapeCSV(formatDurationHMS(pausedMs)),
      escapeCSV(s.isManualEntry ? 'Yes' : 'No'),
      escapeCSV(s.notes || ''),
      escapeCSV(studentName),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

export function exportDailySummariesToCSV(summaries: DailySummary[], studentName: string): string {
  const headers = [
    'Date',
    'Weekday',
    'Total Active Time (HH:MM:SS)',
    'Total Hours',
    'Session Count',
    'Subject Breakdown',
    'Student Name',
  ];

  const rows = summaries.map((day) => {
    const [y, m, d] = day.date.split('-').map(Number);
    const weekday = new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long' });
    const subjects = Object.entries(day.subjectBreakdown)
      .map(([k, ms]) => `${k}: ${formatDurationHuman(ms)}`)
      .join('; ');

    return [
      escapeCSV(day.date),
      escapeCSV(weekday),
      escapeCSV(formatDurationHMS(day.totalMs)),
      escapeCSV((day.totalMs / 3600000).toFixed(2)),
      escapeCSV(day.sessionCount),
      escapeCSV(subjects),
      escapeCSV(studentName),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

export function exportSubjectSummariesToCSV(
  subjects: { name: string; sessions: number; totalMs: number; percentage: number }[],
  studentName: string
): string {
  const headers = [
    'Subject / Course',
    'Sessions Count',
    'Total Active Time (HH:MM:SS)',
    'Total Hours',
    'Percentage Share (%)',
    'Student Name',
  ];

  const rows = subjects.map((sub) => {
    return [
      escapeCSV(sub.name),
      escapeCSV(sub.sessions),
      escapeCSV(formatDurationHMS(sub.totalMs)),
      escapeCSV((sub.totalMs / 3600000).toFixed(2)),
      escapeCSV(sub.percentage.toFixed(2)),
      escapeCSV(studentName),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

export function triggerCSVDownload(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
