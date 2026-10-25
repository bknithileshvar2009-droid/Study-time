/**
 * Premium Standalone Study Time Tracker — Production PDF Report Engine
 * Generates official, printer-friendly A4 reports with exact identity,
 * repeating headers/footers, daily summaries, session details, and subject breakdowns.
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
  calculatePausedDuration,
} from '../utils/timeFormat';

export interface PDFExportOptions {
  studentName?: string;
  reportOption: 'today' | 'last7' | 'last14' | 'last30' | 'thisMonth' | 'all' | 'custom';
  dateRangeLabel: string;
  startDateStr?: string;
  endDateStr?: string;
  sessions: StudySession[];
}

export interface PDFExportResult {
  doc: jsPDF;
  filename: string;
  sessionCount: number;
  totalDurationMs: number;
}

/**
 * Generates the official sanitized filename
 */
export function generateReportFilename(
  studentName: string,
  reportOption: string,
  startDateStr?: string,
  endDateStr?: string
): string {
  const safeName = (studentName || 'BK_NITHILESHVAR').replace(/[^a-zA-Z0-9_-]/g, '_');
  const todayStr = getLocalDateString();

  if (reportOption === 'today') {
    return `${safeName}_Study_Report_Today_${todayStr}.pdf`;
  }
  if (reportOption === 'all') {
    return `${safeName}_Study_Report_All_History_${todayStr}.pdf`;
  }
  if (startDateStr && endDateStr) {
    return `${safeName}_Study_Report_${startDateStr}_to_${endDateStr}.pdf`;
  }
  return `${safeName}_Study_Report_${reportOption}_${todayStr}.pdf`;
}

/**
 * Builds the complete production-grade PDF document
 */
export function buildProductionStudyReport(options: PDFExportOptions): PDFExportResult {
  const studentName = (options.studentName && options.studentName.trim()) 
    ? options.studentName.trim() 
    : 'BK NITHILESHVAR';

  // Sort chronological ascending
  const sessions = [...options.sessions].sort((a, b) => a.startTime - b.startTime);

  // 1. Calculate Reconciled Totals
  const totalRecordedMs = sessions.reduce((acc, s) => acc + s.accumulatedActiveMs, 0);
  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const otherSessions = sessions.filter((s) => s.status !== 'completed');

  // Distinct dates with recorded activity
  const distinctDatesSet = new Set<string>();

  // 2. Daily Summaries Map (with midnight splitting)
  const dailySummariesMap: Record<string, DailySummary> = {};

  sessions.forEach((session) => {
    const dailyAlloc = getDailyAllocations(session);
    for (const [dayKey, ms] of Object.entries(dailyAlloc)) {
      distinctDatesSet.add(dayKey);
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

  // Distinct active days count
  const activeDaysCount = distinctDatesSet.size;

  // Average study time per active day
  const avgStudyPerDayMs = activeDaysCount > 0 ? Math.round(totalRecordedMs / activeDaysCount) : 0;

  // Average duration per completed session
  const avgCompletedSessionMs =
    completedSessions.length > 0
      ? Math.round(
          completedSessions.reduce((acc, s) => acc + s.accumulatedActiveMs, 0) /
            completedSessions.length
        )
      : 0;

  // 3. Subject-wise Breakdown
  const subjectTotalsMap: Record<string, { sessions: number; totalMs: number }> = {};
  sessions.forEach((s) => {
    const subj = s.subject || 'General Study';
    if (!subjectTotalsMap[subj]) {
      subjectTotalsMap[subj] = { sessions: 0, totalMs: 0 };
    }
    subjectTotalsMap[subj].sessions += 1;
    subjectTotalsMap[subj].totalMs += s.accumulatedActiveMs;
  });

  const subjectBreakdownList = Object.entries(subjectTotalsMap)
    .map(([subject, data]) => {
      const percentage = totalRecordedMs > 0 ? (data.totalMs / totalRecordedMs) * 100 : 0;
      return {
        subject,
        sessions: data.sessions,
        totalMs: data.totalMs,
        percentage,
      };
    })
    .sort((a, b) => b.totalMs - a.totalMs);

  // 4. Initialize A4 jsPDF Document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  let currentY = 16;

  // -------------------------------------------------------------
  // FIRST PAGE COVER HEADER
  // -------------------------------------------------------------

  // Top Accent Slate Block
  doc.setFillColor(15, 23, 42); // #0f172a Deep Slate
  doc.rect(margin, currentY, contentWidth, 32, 'F');

  // Subtle Gold Accent Vertical Stripe
  doc.setFillColor(217, 119, 6); // #d97706 Warm Gold / Amber
  doc.rect(margin, currentY, 3.5, 32, 'F');

  // Application Tag
  doc.setTextColor(217, 119, 6); // Gold
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('STUDY TIME TRACKER', margin + 7, currentY + 7);

  // Primary Report Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13.5);
  doc.setFont('helvetica', 'bold');
  doc.text('PERSONAL STUDY TIME & PERFORMANCE RECORD', margin + 7, currentY + 15);

  // Subtitle
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('OFFICIAL STUDY SESSION HISTORY & AUDIT LOG', margin + 7, currentY + 21);

  // Prominent Student Name Badge
  doc.setTextColor(254, 240, 138); // Soft Gold
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Student: ${studentName}`, margin + 7, currentY + 28);

  // Right-aligned report generation metadata
  const genDate = new Date();
  const genDateFormatted = genDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const genTimeFormatted = genDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  doc.setTextColor(203, 213, 225);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${genDateFormatted}`, pageWidth - margin - 5, currentY + 12, { align: 'right' });
  doc.text(`Time: ${genTimeFormatted}`, pageWidth - margin - 5, currentY + 17, { align: 'right' });
  doc.text(`Period: ${options.dateRangeLabel}`, pageWidth - margin - 5, currentY + 23, { align: 'right' });

  currentY += 37;

  // -------------------------------------------------------------
  // EXECUTIVE KPI SUMMARY CARDS (Compact 4-grid)
  // -------------------------------------------------------------
  const cardGap = 3.5;
  const cardWidth = (contentWidth - cardGap * 3) / 4;
  const cardHeight = 16.5;

  const summaryCards = [
    {
      title: 'TOTAL ACTIVE TIME',
      val1: formatDurationHMS(totalRecordedMs),
      val2: `${(totalRecordedMs / 3600000).toFixed(2)} hrs recorded`,
    },
    {
      title: 'TOTAL SESSIONS',
      val1: `${sessions.length}`,
      val2: `${completedSessions.length} completed`,
    },
    {
      title: 'ACTIVE STUDY DAYS',
      val1: `${activeDaysCount} days`,
      val2: `${formatDurationHuman(avgStudyPerDayMs)} / day avg`,
    },
    {
      title: 'AVG SESSION DURATION',
      val1: formatDurationHuman(avgCompletedSessionMs),
      val2: completedSessions.length > 0 ? 'completed sessions' : 'N/A',
    },
  ];

  summaryCards.forEach((c, i) => {
    const cardX = margin + i * (cardWidth + cardGap);
    doc.setFillColor(248, 250, 252); // #f8fafc
    doc.setDrawColor(226, 232, 240); // #e2e8f0
    doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    // Title
    doc.setTextColor(100, 116, 139); // #64748b
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(c.title, cardX + 3, currentY + 4.5);

    // Primary Value
    doc.setTextColor(15, 23, 42); // #0f172a
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text(c.val1, cardX + 3, currentY + 10.5);

    // Subtext
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(c.val2, cardX + 3, currentY + 14.5);
  });

  currentY += cardHeight + 7;

  // -------------------------------------------------------------
  // SECTION 1: DAILY STUDY SUMMARY TABLE
  // -------------------------------------------------------------
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Daily Study Summary', margin, currentY);

  // Subtle gold accent bar under heading
  doc.setFillColor(217, 119, 6);
  doc.rect(margin, currentY + 1.2, 28, 0.6, 'F');
  currentY += 4.5;

  const dailyTableBody = dailySummaries.map((day) => {
    // Format weekday
    const [y, m, d] = day.date.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const weekdayStr = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

    const subjectsStr = Object.entries(day.subjectBreakdown)
      .map(([name, ms]) => `${name}: ${formatDurationHuman(ms)}`)
      .join(', ');

    return [
      day.date,
      weekdayStr,
      day.sessionCount.toString(),
      `${formatDurationHMS(day.totalMs)} (${(day.totalMs / 3600000).toFixed(2)} hrs)`,
      subjectsStr || 'General Study',
    ];
  });

  if (dailyTableBody.length === 0) {
    dailyTableBody.push([
      'No recorded activity in selected date range',
      '—',
      '0',
      '00:00:00 (0.00 hrs)',
      '—',
    ]);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Date', 'Weekday', 'Sessions', 'Active Study Time', 'Subjects & Breakdown']],
    body: dailyTableBody,
    theme: 'grid',
    margin: { left: margin, right: margin, top: 22, bottom: 20 },
    pageBreak: 'auto',
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 24, fontStyle: 'bold' },
      1: { cellWidth: 26 },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 38, fontStyle: 'bold' },
      4: { cellWidth: 'auto' },
    },
  });

  // Calculate position after Table 1
  let nextY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY + 30;
  nextY += 7;

  // -------------------------------------------------------------
  // SECTION 2: SUBJECT-WISE BREAKDOWN TABLE
  // -------------------------------------------------------------
  if (subjectBreakdownList.length > 0 && sessions.length > 0) {
    // Check if we need page break before Section 2
    if (nextY > pageHeight - 45) {
      doc.addPage();
      nextY = 24;
    }

    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Subject-Wise Breakdown', margin, nextY);

    doc.setFillColor(217, 119, 6);
    doc.rect(margin, nextY + 1.2, 28, 0.6, 'F');
    nextY += 4.5;

    const subjectTableBody = subjectBreakdownList.map((item) => [
      item.subject,
      item.sessions.toString(),
      `${formatDurationHMS(item.totalMs)} (${(item.totalMs / 3600000).toFixed(2)} hrs)`,
      `${item.percentage.toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: nextY,
      head: [['Subject / Study Label', 'Sessions Count', 'Total Active Study Time', 'Percentage (% of Period)']],
      body: subjectTableBody,
      theme: 'grid',
      margin: { left: margin, right: margin, top: 22, bottom: 20 },
      pageBreak: 'auto',
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 2,
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [30, 41, 59],
        cellPadding: 2,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 26, halign: 'center' },
        2: { cellWidth: 50, fontStyle: 'bold' },
        3: { cellWidth: 'auto', halign: 'center' },
      },
    });

    nextY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? nextY + 25;
    nextY += 7;
  }

  // -------------------------------------------------------------
  // SECTION 3: DETAILED STUDY SESSION REGISTER TABLE
  // -------------------------------------------------------------
  if (nextY > pageHeight - 45) {
    doc.addPage();
    nextY = 24;
  }

  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('3. Detailed Study Session Register', margin, nextY);

  doc.setFillColor(217, 119, 6);
  doc.rect(margin, nextY + 1.2, 35, 0.6, 'F');
  nextY += 4.5;

  const sessionTableBody = sessions.map((session, index) => {
    const no = (index + 1).toString();
    const dateStr = session.date || getLocalDateString(session.startTime);
    const label = session.subject || 'General Study';
    const startTimeStr = formatTimeOfDay(session.startTime);
    const finishTimeStr = session.endTime 
      ? formatTimeOfDay(session.endTime) 
      : (session.status === 'running' ? 'Active / Running' : 'Interrupted / Unfinished');
    const pausedMs = calculatePausedDuration(session);
    const pausedTimeStr = pausedMs > 0 ? formatDurationHMS(pausedMs) : '00:00:00';
    const activeDurationStr = formatDurationHMS(session.accumulatedActiveMs);
    const statusStr = session.status.toUpperCase();

    // Notes & Tags
    let metaDetails = '';
    if (session.tags && session.tags.length > 0) {
      metaDetails += session.tags.map((t) => `#${t.replace(/^#/, '')}`).join(' ');
    }
    if (session.notes && session.notes.trim()) {
      if (metaDetails) metaDetails += ' — ';
      metaDetails += session.notes.trim();
    }
    if (!metaDetails) metaDetails = '—';

    return [
      no,
      dateStr,
      label,
      startTimeStr,
      finishTimeStr,
      pausedTimeStr,
      activeDurationStr,
      statusStr,
      metaDetails,
    ];
  });

  if (sessionTableBody.length === 0) {
    sessionTableBody.push(['—', '—', 'No sessions recorded', '—', '—', '—', '—', '—', '—']);
  }

  autoTable(doc, {
    startY: nextY,
    head: [['No.', 'Date', 'Study Label', 'Start Time', 'Finish Time', 'Paused Time', 'Active Duration', 'Status', 'Notes & Tags']],
    body: sessionTableBody,
    theme: 'grid',
    margin: { left: margin, right: margin, top: 22, bottom: 20 },
    pageBreak: 'auto',
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: 1.8,
    },
    bodyStyles: {
      fontSize: 6.8,
      textColor: [30, 41, 59],
      cellPadding: 1.8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 19 },
      2: { cellWidth: 23, fontStyle: 'bold' },
      3: { cellWidth: 19 },
      4: { cellWidth: 19 },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 20, fontStyle: 'bold' },
      7: { cellWidth: 17, halign: 'center' },
      8: { cellWidth: 'auto' },
    },
  });

  nextY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? nextY + 30;
  nextY += 6;

  // -------------------------------------------------------------
  // SECTION 4: FINAL RECONCILED TOTALS & RECORD INTEGRITY BOX
  // -------------------------------------------------------------
  if (nextY > pageHeight - 38) {
    doc.addPage();
    nextY = 24;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, nextY, contentWidth, 22, 1.5, 1.5, 'FD');

  // Gold accent left stripe
  doc.setFillColor(217, 119, 6);
  doc.rect(margin, nextY, 2.5, 22, 'F');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL RECORD RECONCILIATION & INTEGRITY CERTIFICATE', margin + 6, nextY + 5.5);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `This report reconciles ${sessions.length} recorded session(s) spanning ${activeDaysCount} active study date(s).`,
    margin + 6,
    nextY + 10.5
  );
  doc.text(
    `Total Active Study Duration: ${formatDurationHMS(totalRecordedMs)} (${(totalRecordedMs / 3600000).toFixed(2)} hours). Paused time was strictly deducted.`,
    margin + 6,
    nextY + 15
  );
  doc.text(
    `Certified Student Identity: ${studentName} • Chronos Study Time Tracker Engine`,
    margin + 6,
    nextY + 19.5
  );

  // -------------------------------------------------------------
  // REPEATING RUNNING HEADERS & FOOTERS (Pages 1 to N)
  // -------------------------------------------------------------
  const totalPages = doc.getNumberOfPages();

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);

    // Running Header (only on page 2 and subsequent pages)
    if (pageNum > 1) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`${studentName} — STUDY TIME TRACKER`, margin, 12);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('PERSONAL STUDY TIME & PERFORMANCE RECORD', pageWidth - margin, 12, { align: 'right' });

      // Subtle running header divider
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 14.5, pageWidth - margin, 14.5);
    }

    // Running Footer (on EVERY page)
    const footerY = pageHeight - 9;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, footerY - 2.5, pageWidth - margin, footerY - 2.5);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`${studentName} | Official Study Session History`, margin, footerY);
    doc.text(`Generated: ${genDateFormatted}`, pageWidth / 2, footerY, { align: 'center' });
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
  }

  // Generate Filename
  const filename = generateReportFilename(
    studentName,
    options.reportOption,
    options.startDateStr,
    options.endDateStr
  );

  return {
    doc,
    filename,
    sessionCount: sessions.length,
    totalDurationMs: totalRecordedMs,
  };
}
