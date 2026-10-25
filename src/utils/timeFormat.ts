import { StudySession } from '../types';

/**
 * Format duration in milliseconds to HH:MM:SS
 */
export function formatDurationHMS(ms: number): string {
  if (ms < 0 || isNaN(ms)) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Format duration to human readable format (e.g., "2h 45m 12s" or "32m 10s")
 */
export function formatDurationHuman(ms: number): string {
  if (ms < 0 || isNaN(ms)) return '0m 00s';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds.toString().padStart(2, '0')}s`);

  return parts.join(' ');
}

/**
 * Format milliseconds to hours with two decimal places (e.g. "2.75 hrs")
 */
export function formatHoursDecimal(ms: number): string {
  if (ms <= 0 || isNaN(ms)) return '0.00 hrs';
  const hours = ms / (1000 * 60 * 60);
  return `${hours.toFixed(2)} hrs`;
}

/**
 * Get local date string YYYY-MM-DD from timestamp
 */
export function getLocalDateString(timestamp: number = Date.now()): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format timestamp to readable date (e.g., "Mon, Oct 25, 2026")
 */
export function formatDateDisplay(timestampOrDateStr: number | string): string {
  let d: Date;
  if (typeof timestampOrDateStr === 'string' && timestampOrDateStr.includes('-')) {
    const [y, m, day] = timestampOrDateStr.split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(Number(timestampOrDateStr));
  }
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format timestamp to readable time of day (e.g., "09:42:15 AM")
 */
export function formatTimeOfDay(timestamp: number | null | undefined): string {
  if (!timestamp) return '—';
  const d = new Date(timestamp);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Calculate the true current active duration of a session at a given moment
 */
export function calculateCurrentElapsed(session: StudySession, now: number = Date.now()): number {
  if (session.status === 'completed' || session.status === 'discarded') {
    return session.accumulatedActiveMs;
  }
  if (session.status === 'paused') {
    return session.accumulatedActiveMs;
  }
  // status is running
  const currentIntervalMs = Math.max(0, now - session.lastResumeTime);
  return session.accumulatedActiveMs + currentIntervalMs;
}

/**
 * Calculate total paused duration in milliseconds
 */
export function calculatePausedDuration(session: StudySession, now: number = Date.now()): number {
  let totalPaused = 0;
  for (const interval of session.pauseIntervals) {
    const end = interval.resumedAt ?? (session.status === 'paused' ? now : interval.pausedAt);
    totalPaused += Math.max(0, end - interval.pausedAt);
  }
  return totalPaused;
}

/**
 * Split a session accurately across midnight boundaries into local calendar days.
 * Returns an object mapping 'YYYY-MM-DD' -> milliseconds studied on that local day.
 */
export function getDailyAllocations(session: StudySession): Record<string, number> {
  const result: Record<string, number> = {};
  if (session.accumulatedActiveMs <= 0 && session.status !== 'running') {
    return result;
  }

  // Reconstruct active segments [start, end]
  interface Segment {
    start: number;
    end: number;
  }
  const activeSegments: Segment[] = [];
  let currentStart = session.startTime;

  for (const pause of session.pauseIntervals) {
    if (pause.pausedAt > currentStart) {
      activeSegments.push({ start: currentStart, end: pause.pausedAt });
    }
    if (pause.resumedAt) {
      currentStart = pause.resumedAt;
    } else {
      currentStart = -1; // Currently paused
      break;
    }
  }

  if (currentStart > 0) {
    const finish = session.endTime ?? (session.status === 'running' ? Date.now() : currentStart);
    if (finish > currentStart) {
      activeSegments.push({ start: currentStart, end: finish });
    }
  }

  // If no intervals were captured (fallback to simple range)
  if (activeSegments.length === 0 && session.accumulatedActiveMs > 0) {
    const finish = session.endTime ?? Date.now();
    activeSegments.push({
      start: session.startTime,
      end: Math.min(finish, session.startTime + session.accumulatedActiveMs),
    });
  }

  // Slice each segment across midnight
  for (const seg of activeSegments) {
    let segStart = seg.start;
    const segEnd = seg.end;

    while (segStart < segEnd) {
      const startDate = new Date(segStart);
      const nextMidnight = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate() + 1,
        0, 0, 0, 0
      ).getTime();

      const dayKey = getLocalDateString(segStart);
      const chunkEnd = Math.min(segEnd, nextMidnight);
      const duration = chunkEnd - segStart;

      result[dayKey] = (result[dayKey] || 0) + duration;
      segStart = chunkEnd;
    }
  }

  return result;
}
