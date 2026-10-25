/**
 * Study Time Tracker Data Types
 */

export interface PauseRecord {
  pausedAt: number; // Unix timestamp in ms
  resumedAt: number | null; // Unix timestamp in ms, null if currently paused
}

export type SessionStatus = 'running' | 'paused' | 'completed' | 'discarded';

export interface StudySession {
  id: string;
  userId?: string;
  subject: string;
  notes?: string;
  status: SessionStatus;
  startTime: number; // Unix timestamp in ms
  endTime?: number | null; // Unix timestamp in ms, null if not completed
  pauseIntervals: PauseRecord[];
  accumulatedActiveMs: number; // Total active study time accrued excluding pauses
  lastResumeTime: number; // Timestamp when session last started or resumed
  date: string; // Local date YYYY-MM-DD
  createdAt: number;
  updatedAt: number;
}

export interface UserSettings {
  studentName: string;
  dailyGoalHours: number;
  defaultSubject: string;
  subjectPresets: string[];
  soundEnabled: boolean;
  autoSaveCloud: boolean;
  themeAccent: 'crimson-gold' | 'pure-gold' | 'crimson-noir';
}

export interface DailySummary {
  date: string; // YYYY-MM-DD
  displayDate: string; // e.g. "Monday, Oct 25, 2026"
  totalMs: number;
  sessionCount: number;
  subjectBreakdown: Record<string, number>; // subject -> ms
}

export interface StudyStats {
  todayTotalMs: number;
  todaySessionsCount: number;
  weekTotalMs: number;
  monthTotalMs: number;
  allTimeTotalMs: number;
  totalSessionsCount: number;
  averageSessionMs: number;
}

export type ViewTab = 'dashboard' | 'timer' | 'history' | 'reports' | 'settings';

export type ReportDateFilter = 
  | 'today' 
  | 'last7' 
  | 'last14' 
  | 'last30' 
  | 'thisMonth' 
  | 'all' 
  | 'custom';
