/**
 * Client-Side PDF Report Generator using jsPDF and jspdf-autotable
 * 100% Free, zero external API keys, zero paid services.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StudySession, DailySummary } from '../types';
import {
  formatDurationHMS,
  formatDurationHuman,
  formatDateDisplay,
  formatTimeOfDay,
  getLocalDateString,
  getDailyAllocations,
} from '../utils/timeFormat';

export interface PDFReportOptions {
  studentName: string;
  dateRangeLabel: string;
  sessions: StudySession[];
  startDateStr?: string;
  endDateStr?: string;
}

export function generateStudyReportPDF(options: PDFReportOptions): jsPDF {
  const { studentName, dateRangeLabel, sessions } = options;

  // Filter completed and valid sessions, sorted chronologically ascending for the report
  const sortedSessions = [...sessions].sort((a, b) => a.startTime - b.startTime);

  // Compute total accumulated study time
  const totalRecordedMs = sortedSessions.reduce((acc, s) => acc + s.accumulatedActiveMs, 0);

  // Group daily summaries
  const dailySummariesMap: Record<string, DailySummary> = {};

  sortedSessions.forEach((session) => {
    // Allocate to actual calendar dates
    const dailyAlloc = getDailyAllocations(session);
    for (const [dayKey, ms] of Object.entries(dailyAlloc)) {
      if (!dailySummariesMap[dayKey]) {
        dailySummariesMap[dayKey] = {
          date: dayKey,
          displayDate: formatDateDisplay(dayKey),
          totalMs: 0,
          sessionCount: 0,
          subjectBreakdown: {},
        };
      }
      dailySummariesMap[dayKey].totalMs += ms;
      dailySummariesMap[dayKey].sessionCount += 1;
      const subj = session.subject || 'General Study';
      dailySummariesMap[dayKey].subjectBreakdown[subj] =
        (dailySummariesMap[dayKey].subjectBreakdown[subj] || 0) + ms;
    }
  });

  const dailySummaries = Object.values(dailySummariesMap).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // Create jsPDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = 16;

  // Header Banner with elegant dark aesthetic styling in printable shades
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(margin, currentY, pageWidth - margin * 2, 28, 'F');

  // Gold accent bar
  doc.setFillColor(217, 119, 6); // Amber 600
  doc.rect(margin, currentY, 3, 28, 'F');

  // Title text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('STUDY TIME TRACKER — STUDY REPORT', margin + 6, currentY + 10);

  // Student name & date subtitle
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(`Student: ${studentName || 'Student'}`, margin + 6, currentY + 18);
  doc.text(`Date Range: ${dateRangeLabel}`, margin + 6, currentY + 23);

  // Right-aligned report meta
  const now = new Date();
  const genDateStr = `Generated: ${now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })} at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  doc.text(genDateStr, pageWidth - margin - 4, currentY + 18, { align: 'right' });

  currentY += 34;

  // Executive KPI Summary boxes
  const boxWidth = (pageWidth - margin * 2 - 8) / 3;
  const boxHeight = 16;

  // Box 1: Total Study Time
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL RECORDED STUDY TIME', margin + 4, currentY + 5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDurationHuman(totalRecordedMs), margin + 4, currentY + 12);

  // Box 2: Total Sessions
  const box2X = margin + boxWidth + 4;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(box2X, currentY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.text('TOTAL SESSIONS', box2X + 4, currentY + 5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text(`${sortedSessions.length} sessions`, box2X + 4, currentY + 12);

  // Box 3: Daily Average
  const box3X = box2X + boxWidth + 4;
  const daysCount = Math.max(1, dailySummaries.length);
  const avgMsPerDay = Math.round(totalRecordedMs / daysCount);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(box3X, currentY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.text('DAILY AVERAGE (ACTIVE DAYS)', box3X + 4, currentY + 5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text(formatDurationHuman(avgMsPerDay), box3X + 4, currentY + 12);

  currentY += boxHeight + 8;

  // 1. DAILY SUMMARIES TABLE
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Daily Summaries', margin, currentY);
  currentY += 4;

  const dailyTableBody = dailySummaries.map((day) => {
    const subjectsStr = Object.entries(day.subjectBreakdown)
      .map(([name, ms]) => `${name}: ${formatDurationHuman(ms)}`)
      .join('; ');

    return [
      day.displayDate,
      formatDurationHMS(day.totalMs) + ` (${(day.totalMs / (1000 * 3600)).toFixed(2)}h)`,
      day.sessionCount.toString(),
      subjectsStr || '—',
    ];
  });

  if (dailyTableBody.length === 0) {
    dailyTableBody.push(['No study sessions recorded in this period', '00:00:00', '0', '—']);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Date & Weekday', 'Daily Duration', 'Sessions', 'Subject Breakdown']],
    body: dailyTableBody,
    theme: 'grid',
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 38 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 'auto' },
    },
  });

  // 2. DETAILED SESSIONS TABLE
  // Get ending Y of previous table
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY + 30;
  let sessionsStartY = finalY + 8;

  // Check if we need a page break before Section 2 header
  if (sessionsStartY > pageHeight - 35) {
    doc.addPage();
    sessionsStartY = 16;
  }

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Session Details', margin, sessionsStartY);
  sessionsStartY += 4;

  const sessionTableBody = sortedSessions.map((session) => {
    const dateStr = session.date || getLocalDateString(session.startTime);
    const startStr = formatTimeOfDay(session.startTime);
    const endStr = session.endTime ? formatTimeOfDay(session.endTime) : (session.status === 'running' ? 'Active' : 'Unfinished');
    const durStr = formatDurationHMS(session.accumulatedActiveMs);
    const statusText = session.status.toUpperCase();
    const notesStr = session.notes ? session.notes.trim() : '—';

    return [
      dateStr,
      startStr,
      endStr,
      durStr,
      session.subject || 'General Study',
      statusText,
      notesStr,
    ];
  });

  if (sessionTableBody.length === 0) {
    sessionTableBody.push(['No session records found', '—', '—', '—', '—', '—', '—']);
  }

  autoTable(doc, {
    startY: sessionsStartY,
    head: [['Date', 'Start Time', 'Finish Time', 'Duration', 'Subject', 'Status', 'Notes']],
    body: sessionTableBody,
    theme: 'grid',
    margin: { left: margin, right: margin, bottom: 16 },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 2.2,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 22 },
      2: { cellWidth: 22 },
      3: { cellWidth: 20 },
      4: { cellWidth: 26 },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 'auto' },
    },
  });

  // Add Page Numbers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(
      `Chronos Study — Precision Study Time Tracker | Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  return doc;
}
