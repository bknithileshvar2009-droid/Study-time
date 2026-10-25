/**
 * Master Data Models for BK NITHILESHVAR — STUDY TIME TRACKER
 */

export interface PauseRecord {
  pausedAt: number; // Unix timestamp in ms
  resumedAt: number | null; // Unix timestamp in ms, null if currently paused
}

export type SessionStatus = 'running' | 'paused' | 'completed' | 'discarded';

export type TimerMode = 'stopwatch' | 'countdown' | 'pomodoro' | 'custom';

export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

export interface StudySession {
  id: string;
  userId?: string;
  subject: string;
  course?: string;
  chapter?: string;
  topic?: string;
  tags: string[];
  notes?: string;
  status: SessionStatus;
  timerMode: TimerMode;
  startTime: number; // Unix timestamp in ms
  endTime?: number | null; // Unix timestamp in ms
  pauseIntervals: PauseRecord[];
  accumulatedActiveMs: number;
  accumulatedBreakMs?: number;
  lastResumeTime: number;
  date: string; // Local date YYYY-MM-DD
  createdAt: number;
  updatedAt: number;
  isManualEntry?: boolean;
  targetDurationMs?: number; // Target for countdown or pomodoro
  pomodoroPhase?: PomodoroPhase;
}

export interface ChapterItem {
  id: string;
  name: string;
  topics: string[];
  isCompleted?: boolean;
}

export interface SubjectItem {
  id: string;
  name: string;
  color: string;
  course?: string;
  chapters: ChapterItem[];
  createdAt: number;
}

export interface StudyGoal {
  id: string;
  title: string;
  type: 'daily' | 'weekly' | 'monthly' | 'subject' | 'chapter';
  targetHours: number;
  subject?: string;
  chapter?: string;
  startDate: string;
  endDate?: string;
  createdAt: number;
}

export interface DailyReview {
  id: string;
  date: string; // YYYY-MM-DD
  rating: number; // 1-5 stars
  reflection: string;
  completedTopics: string[];
  difficultTopics: string[];
  tomorrowPlan: string;
  createdAt: number;
  updatedAt: number;
}

export interface BackupSnapshot {
  id: string;
  timestamp: number;
  label: string;
  sessionsCount: number;
  totalHours: number;
  dataJson: string;
}

export interface ReminderSetting {
  dailyReminderEnabled: boolean;
  dailyReminderTime: string; // HH:mm
  pomodoroSound: boolean;
  breakAlertSound: boolean;
  idleAlertSound: boolean;
  browserNotificationsEnabled: boolean;
}

export interface UserSettings {
  studentName: string;
  dailyGoalHours: number;
  weeklyGoalHours: number;
  monthlyGoalHours: number;
  defaultSubject: string;
  defaultTimerMode: TimerMode;
  pomodoroWorkMin: number;
  pomodoroShortBreakMin: number;
  pomodoroLongBreakMin: number;
  pomodoroSessionsBeforeLongBreak: number;
  idleDetectionMin: number; // 0 to disable, or minutes e.g. 15
  weekStart: 'monday' | 'sunday';
  subjectPresets: string[];
  tagPresets: string[];
  soundEnabled: boolean;
  autoBackupEnabled: boolean;
  autoBackupFrequencyHours: number;
  maxAutoSnapshots: number;
  autoSaveCloud: boolean;
  themeAccent: 'crimson-gold' | 'pure-gold' | 'crimson-noir';
  widgetMode: boolean;
}

export interface DailySummary {
  date: string; // YYYY-MM-DD
  displayDate: string; // e.g. "Monday, Oct 25, 2026"
  totalMs: number;
  sessionCount: number;
  subjectBreakdown: Record<string, number>;
}

export interface StudyStats {
  todayTotalMs: number;
  todaySessionsCount: number;
  weekTotalMs: number;
  monthTotalMs: number;
  allTimeTotalMs: number;
  totalSessionsCount: number;
  averageSessionMs: number;
  longestSessionMs: number;
  currentStreakDays: number;
  bestStreakDays: number;
}

export type ViewTab =
  | 'dashboard'
  | 'timer'
  | 'history'
  | 'calendar'
  | 'subjects'
  | 'goals'
  | 'analytics'
  | 'review'
  | 'reports'
  | 'backup'
  | 'reminders'
  | 'settings'
  | 'diagnostics';

export type ReportDateFilter =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last14'
  | 'last30'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'all'
  | 'custom';
