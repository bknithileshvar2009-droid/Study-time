/**
 * Master Study Time Tracker Context
 * Coordinates all 13 modules, timer state machines, persistence, and analytics.
 */

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  StudySession,
  UserSettings,
  SubjectItem,
  ChapterItem,
  StudyGoal,
  DailyReview,
  BackupSnapshot,
  StudyStats,
  DailySummary,
  ViewTab,
  TimerMode,
  PomodoroPhase,
} from '../types';
import { storageService, DEFAULT_SUBJECTS, DEFAULT_SETTINGS } from '../services/db';
import { autoFirebaseService, AutoCloudStatus } from '../services/firebase';
import { soundService } from '../services/audio';
import { notificationService } from '../services/notifications';
import {
  calculateCurrentElapsed,
  getLocalDateString,
  getDailyAllocations,
  formatDateDisplay,
  formatDurationHMS,
  formatDurationHuman,
} from '../utils/timeFormat';

interface StartStudyParams {
  subject?: string;
  course?: string;
  chapter?: string;
  topic?: string;
  notes?: string;
  tags?: string[];
  timerMode?: TimerMode;
  targetDurationMinutes?: number;
  pomodoroPhase?: PomodoroPhase;
}

interface StudyContextType {
  // Navigation
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;

  // Active Session & Multi-Mode Timer
  activeSession: StudySession | null;
  timerElapsedMs: number;
  remainingCountdownMs: number;
  isTimerRunning: boolean;
  isTimerPaused: boolean;
  activeTimerMode: TimerMode;
  activePomodoroPhase: PomodoroPhase;
  pomodoroCycleCount: number;
  startStudy: (params?: StartStudyParams) => Promise<StudySession>;
  updateActiveSessionMetadata: (params: { notes?: string; tags?: string[]; chapter?: string; topic?: string }) => Promise<void>;
  pauseStudy: () => Promise<void>;
  resumeStudy: () => Promise<void>;
  stopStudy: () => Promise<StudySession | null>;
  discardActiveSession: () => Promise<void>;
  switchPomodoroPhase: (phase: PomodoroPhase) => Promise<void>;

  // Idle Detection
  idleDetected: boolean;
  idleDurationMs: number;
  handleKeepIdleTime: () => void;
  handleTrimIdleTime: () => void;

  // Manual Session Entry
  addManualSession: (sessionData: {
    date: string;
    startTimeStr: string;
    finishTimeStr?: string;
    activeMinutes: number;
    pausedMinutes?: number;
    subject: string;
    chapter?: string;
    topic?: string;
    notes?: string;
    tags?: string[];
  }) => Promise<StudySession>;

  // Sessions CRUD & Batch Actions
  sessions: StudySession[];
  isLoading: boolean;
  editSession: (session: StudySession) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  deleteMultipleSessions: (ids: string[]) => Promise<void>;
  clearAllHistory: () => Promise<void>;

  // Subjects, Chapters & Topics
  subjects: SubjectItem[];
  addSubject: (name: string, color?: string, course?: string) => Promise<SubjectItem>;
  updateSubject: (subject: SubjectItem) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  addChapter: (subjectId: string, chapterName: string) => Promise<void>;
  addTopic: (subjectId: string, chapterId: string, topicName: string) => Promise<void>;
  toggleChapterCompletion: (subjectId: string, chapterId: string) => Promise<void>;

  // Goals
  goals: StudyGoal[];
  addGoal: (goal: Omit<StudyGoal, 'id' | 'createdAt'>) => Promise<StudyGoal>;
  updateGoal: (goal: StudyGoal) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;

  // Daily Reviews
  dailyReviews: DailyReview[];
  saveDailyReview: (review: Omit<DailyReview, 'id' | 'createdAt' | 'updatedAt'>) => Promise<DailyReview>;
  deleteDailyReview: (date: string) => Promise<void>;

  // Backup Snapshots & Restore
  snapshots: BackupSnapshot[];
  createSnapshot: (label?: string) => Promise<BackupSnapshot>;
  restoreSnapshot: (snapshotId: string, mode?: 'replace' | 'merge') => Promise<void>;
  deleteSnapshot: (snapshotId: string) => Promise<void>;
  importFullData: (jsonData: any, mode?: 'replace' | 'merge') => Promise<{ addedSessions: number }>;
  exportFullDataJSON: () => string;

  // Settings
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;

  // Analytics & Aggregates
  stats: StudyStats;
  totalHoursStudied: number;
  totalHoursFormatted: string;
  totalStudyTimeHMS: string;
  todaySessions: StudySession[];
  dailySummaries: DailySummary[];

  // Cloud Sync
  cloudStatus: AutoCloudStatus;
  triggerManualCloudSync: () => Promise<boolean>;

  // Toast
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

export const StudyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>(DEFAULT_SUBJECTS);
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [dailyReviews, setDailyReviews] = useState<DailyReview[]>([]);
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [timerElapsedMs, setTimerElapsedMs] = useState<number>(0);
  const [remainingCountdownMs, setRemainingCountdownMs] = useState<number>(0);
  const [activeTimerMode, setActiveTimerMode] = useState<TimerMode>('stopwatch');
  const [activePomodoroPhase, setActivePomodoroPhase] = useState<PomodoroPhase>('work');
  const [pomodoroCycleCount, setPomodoroCycleCount] = useState<number>(1);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Idle detection state
  const [idleDetected, setIdleDetected] = useState<boolean>(false);
  const [idleDurationMs, setIdleDurationMs] = useState<number>(0);
  const lastInteractionRef = useRef<number>(Date.now());
  const idleCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [cloudStatus, setCloudStatus] = useState<AutoCloudStatus>({
    isConnected: true,
    isSyncing: false,
    lastSyncedAt: null,
    syncError: null,
    totalSyncedSessions: 0,
    userId: null,
    userEmail: null,
    isAnonymous: true,
    projectId: 'heroic-synapse-93kqt',
  });

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3800);
  }, []);

  // Listen to user interaction for idle tracking
  useEffect(() => {
    const recordActivity = () => {
      lastInteractionRef.current = Date.now();
      if (idleDetected) {
        // Leave idleDetected true until user chooses to keep or trim
      }
    };

    window.addEventListener('mousemove', recordActivity, { passive: true });
    window.addEventListener('keydown', recordActivity, { passive: true });
    window.addEventListener('click', recordActivity, { passive: true });
    window.addEventListener('touchstart', recordActivity, { passive: true });

    return () => {
      window.removeEventListener('mousemove', recordActivity);
      window.removeEventListener('keydown', recordActivity);
      window.removeEventListener('click', recordActivity);
      window.removeEventListener('touchstart', recordActivity);
    };
  }, [idleDetected]);

  // Periodic idle checker
  useEffect(() => {
    if (activeSession && activeSession.status === 'running' && settings.idleDetectionMin > 0) {
      const thresholdMs = settings.idleDetectionMin * 60 * 1000;
      idleCheckIntervalRef.current = setInterval(() => {
        const inactiveMs = Date.now() - lastInteractionRef.current;
        if (inactiveMs >= thresholdMs && !idleDetected) {
          setIdleDetected(true);
          setIdleDurationMs(inactiveMs);
          notificationService.playIdleWarning();
        }
      }, 5000);
    } else {
      if (idleCheckIntervalRef.current) {
        clearInterval(idleCheckIntervalRef.current);
        idleCheckIntervalRef.current = null;
      }
      setIdleDetected(false);
    }

    return () => {
      if (idleCheckIntervalRef.current) {
        clearInterval(idleCheckIntervalRef.current);
        idleCheckIntervalRef.current = null;
      }
    };
  }, [activeSession, settings.idleDetectionMin, idleDetected]);

  const handleKeepIdleTime = useCallback(() => {
    lastInteractionRef.current = Date.now();
    setIdleDetected(false);
    setIdleDurationMs(0);
    showToast('Inactivity kept in study time');
  }, [showToast]);

  const handleTrimIdleTime = useCallback(async () => {
    if (!activeSession) return;
    const trimMs = idleDurationMs;
    const updatedAccumulated = Math.max(0, activeSession.accumulatedActiveMs - trimMs);
    const updated: StudySession = {
      ...activeSession,
      accumulatedActiveMs: updatedAccumulated,
      lastResumeTime: Date.now(),
      updatedAt: Date.now(),
    };
    setActiveSession(updated);
    await storageService.saveActiveSession(updated);
    lastInteractionRef.current = Date.now();
    setIdleDetected(false);
    setIdleDurationMs(0);
    showToast(`Deducted ${Math.round(trimMs / 60000)}m of idle time`);
  }, [activeSession, idleDurationMs, showToast]);

  // Subscribe to cloud sync status
  useEffect(() => {
    const unsubscribe = autoFirebaseService.subscribeStatus((newStatus) => {
      setCloudStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  // Initial Load from Storage
  useEffect(() => {
    let isMounted = true;
    async function initAllData() {
      try {
        setIsLoading(true);

        const [
          savedSettings,
          savedSessions,
          savedSubjects,
          savedGoals,
          savedReviews,
          savedSnapshots,
          currentActive,
        ] = await Promise.all([
          storageService.getSettings(),
          storageService.getAllSessions(),
          storageService.getAllSubjects(),
          storageService.getAllGoals(),
          storageService.getAllReviews(),
          storageService.getAllSnapshots(),
          storageService.getActiveSession(),
        ]);

        if (isMounted) {
          setSettings(savedSettings);
          setSessions(savedSessions);
          setSubjects(savedSubjects.length > 0 ? savedSubjects : DEFAULT_SUBJECTS);
          setGoals(savedGoals);
          setDailyReviews(savedReviews);
          setSnapshots(savedSnapshots);

          if (currentActive && (currentActive.status === 'running' || currentActive.status === 'paused')) {
            setActiveSession(currentActive);
            setActiveTimerMode(currentActive.timerMode || 'stopwatch');
            const elapsed = calculateCurrentElapsed(currentActive, Date.now());
            setTimerElapsedMs(elapsed);

            if (currentActive.targetDurationMs) {
              setRemainingCountdownMs(Math.max(0, currentActive.targetDurationMs - elapsed));
            }
          }
        }

        // Automatic background sync with Firebase RTDB: load every single entity
        try {
          const cloudPayload = await autoFirebaseService.loadAllDataFromFirebase();
          if (isMounted) {
            // 1. Sessions
            if (cloudPayload.sessions && cloudPayload.sessions.length > 0) {
              const map = new Map<string, StudySession>();
              cloudPayload.sessions.forEach((s) => map.set(s.id, s));
              savedSessions.forEach((s) => {
                if (!map.has(s.id)) map.set(s.id, s);
              });
              const merged = Array.from(map.values()).sort((a, b) => b.startTime - a.startTime);
              setSessions(merged);
              merged.forEach((s) => storageService.saveSession(s));
            }

            // 2. Subjects
            if (cloudPayload.subjects && cloudPayload.subjects.length > 0) {
              setSubjects(cloudPayload.subjects);
              cloudPayload.subjects.forEach((subj) => storageService.saveSubject(subj));
            } else if (savedSubjects.length > 0) {
              autoFirebaseService.autoSaveSubjects(savedSubjects).catch(() => {});
            }

            // 3. Goals
            if (cloudPayload.goals && cloudPayload.goals.length > 0) {
              setGoals(cloudPayload.goals);
              cloudPayload.goals.forEach((g) => storageService.saveGoal(g));
            } else if (savedGoals.length > 0) {
              autoFirebaseService.autoSaveGoals(savedGoals).catch(() => {});
            }

            // 4. Daily Reviews
            if (cloudPayload.dailyReviews && cloudPayload.dailyReviews.length > 0) {
              setDailyReviews(cloudPayload.dailyReviews);
              cloudPayload.dailyReviews.forEach((r) => storageService.saveReview(r));
            } else if (savedReviews.length > 0) {
              autoFirebaseService.autoSaveDailyReviews(savedReviews).catch(() => {});
            }

            // 5. Settings
            if (cloudPayload.settings) {
              setSettings(cloudPayload.settings);
              storageService.saveSettings(cloudPayload.settings);
            } else if (savedSettings) {
              autoFirebaseService.autoSaveSettings(savedSettings).catch(() => {});
            }

            // Sync merged state
            await autoFirebaseService.autoSyncAll(
              sessions.length > 0 ? sessions : savedSessions,
              savedSettings,
              savedSubjects,
              savedGoals,
              savedReviews
            );
          }
        } catch (err) {
          console.warn('Initial cloud load notice:', err);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initAllData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Timer Ticking Engine (Every second)
  useEffect(() => {
    if (activeSession && activeSession.status === 'running') {
      const updateTicks = () => {
        const now = Date.now();
        const elapsed = calculateCurrentElapsed(activeSession, now);
        setTimerElapsedMs(elapsed);

        if (activeSession.targetDurationMs && activeSession.targetDurationMs > 0) {
          const rem = Math.max(0, activeSession.targetDurationMs - elapsed);
          setRemainingCountdownMs(rem);

          // Check if target reached
          if (rem <= 0) {
            if (activeSession.timerMode === 'pomodoro') {
              if (activePomodoroPhase === 'work') {
                notificationService.playWorkEndAlarm();
                notificationService.sendNotification(
                  'Pomodoro Focus Complete!',
                  'Great job! Take a well-deserved break.'
                );
              } else {
                notificationService.playBreakEndAlarm();
                notificationService.sendNotification(
                  'Break Over!',
                  'Ready to start your next study block?'
                );
              }
            } else if (activeSession.timerMode === 'countdown') {
              notificationService.playWorkEndAlarm();
              notificationService.sendNotification(
                'Countdown Complete!',
                `Target of ${Math.round(activeSession.targetDurationMs / 60000)}m reached.`
              );
            }
          }
        }
      };

      updateTicks();
      timerIntervalRef.current = setInterval(updateTicks, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (activeSession && activeSession.status === 'paused') {
        setTimerElapsedMs(activeSession.accumulatedActiveMs);
      } else if (!activeSession) {
        setTimerElapsedMs(0);
        setRemainingCountdownMs(0);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [activeSession, activePomodoroPhase]);

  /* ---------------- TIMER CONTROLS ---------------- */

  const startStudy = useCallback(
    async (params?: StartStudyParams): Promise<StudySession> => {
      if (activeSession && activeSession.status === 'running') {
        return activeSession;
      }

      const now = Date.now();
      const uniqueId = `session_${now}_${Math.random().toString(36).substring(2, 8)}`;
      const chosenSubject = params?.subject?.trim() || settings.defaultSubject;
      const mode = params?.timerMode || activeTimerMode;
      const phase = params?.pomodoroPhase || (mode === 'pomodoro' ? 'work' : undefined);

      let targetMs: number | undefined = undefined;
      if (mode === 'countdown' && params?.targetDurationMinutes) {
        targetMs = params.targetDurationMinutes * 60 * 1000;
      } else if (mode === 'pomodoro') {
        const mins =
          phase === 'work'
            ? settings.pomodoroWorkMin
            : phase === 'shortBreak'
            ? settings.pomodoroShortBreakMin
            : settings.pomodoroLongBreakMin;
        targetMs = mins * 60 * 1000;
      }

      const cleanTags = params?.tags
        ? Array.from(new Set(params.tags.map((t) => t.replace(/^#/, '').trim().toLowerCase()).filter(Boolean)))
        : [];

      const newSession: StudySession = {
        id: uniqueId,
        subject: chosenSubject,
        course: params?.course || '',
        chapter: params?.chapter || '',
        topic: params?.topic || '',
        tags: cleanTags,
        notes: params?.notes?.trim() || '',
        status: 'running',
        timerMode: mode,
        pomodoroPhase: phase,
        targetDurationMs: targetMs,
        startTime: now,
        endTime: null,
        pauseIntervals: [],
        accumulatedActiveMs: 0,
        accumulatedBreakMs: 0,
        lastResumeTime: now,
        date: getLocalDateString(now),
        createdAt: now,
        updatedAt: now,
        isManualEntry: false,
      };

      setActiveSession(newSession);
      setActiveTimerMode(mode);
      if (phase) setActivePomodoroPhase(phase);
      setTimerElapsedMs(0);
      if (targetMs) setRemainingCountdownMs(targetMs);

      await storageService.saveActiveSession(newSession);

      if (settings.soundEnabled) soundService.playStart();
      autoFirebaseService.autoSaveSession(newSession).catch(() => {});

      return newSession;
    },
    [activeSession, activeTimerMode, settings]
  );

  const updateActiveSessionMetadata = useCallback(
    async (params: { notes?: string; tags?: string[]; chapter?: string; topic?: string }) => {
      if (!activeSession) return;
      const updated: StudySession = {
        ...activeSession,
        ...(params.notes !== undefined && { notes: params.notes }),
        ...(params.tags !== undefined && {
          tags: Array.from(new Set(params.tags.map((t) => t.replace(/^#/, '').toLowerCase()))),
        }),
        ...(params.chapter !== undefined && { chapter: params.chapter }),
        ...(params.topic !== undefined && { topic: params.topic }),
        updatedAt: Date.now(),
      };
      setActiveSession(updated);
      await storageService.saveActiveSession(updated);
      autoFirebaseService.autoSaveSession(updated).catch(() => {});
    },
    [activeSession]
  );

  const pauseStudy = useCallback(async () => {
    if (!activeSession || activeSession.status !== 'running') return;
    const now = Date.now();
    const additionalActive = Math.max(0, now - activeSession.lastResumeTime);
    const updatedAccumulated = activeSession.accumulatedActiveMs + additionalActive;

    const updatedSession: StudySession = {
      ...activeSession,
      status: 'paused',
      accumulatedActiveMs: updatedAccumulated,
      pauseIntervals: [...activeSession.pauseIntervals, { pausedAt: now, resumedAt: null }],
      updatedAt: now,
    };

    setActiveSession(updatedSession);
    setTimerElapsedMs(updatedAccumulated);
    await storageService.saveActiveSession(updatedSession);

    if (settings.soundEnabled) soundService.playPause();
    autoFirebaseService.autoSaveSession(updatedSession).catch(() => {});
  }, [activeSession, settings]);

  const resumeStudy = useCallback(async () => {
    if (!activeSession || activeSession.status !== 'paused') return;
    const now = Date.now();
    const intervals = [...activeSession.pauseIntervals];
    if (intervals.length > 0) {
      const last = { ...intervals[intervals.length - 1] };
      if (last.resumedAt === null) {
        last.resumedAt = now;
        intervals[intervals.length - 1] = last;
      }
    }

    const updatedSession: StudySession = {
      ...activeSession,
      status: 'running',
      pauseIntervals: intervals,
      lastResumeTime: now,
      updatedAt: now,
    };

    setActiveSession(updatedSession);
    setTimerElapsedMs(calculateCurrentElapsed(updatedSession, now));
    await storageService.saveActiveSession(updatedSession);

    if (settings.soundEnabled) soundService.playResume();
    autoFirebaseService.autoSaveSession(updatedSession).catch(() => {});
  }, [activeSession, settings]);

  const stopStudy = useCallback(async (): Promise<StudySession | null> => {
    if (!activeSession) return null;
    const now = Date.now();
    let finalAccumulated = activeSession.accumulatedActiveMs;
    const intervals = [...activeSession.pauseIntervals];

    if (activeSession.status === 'running') {
      finalAccumulated += Math.max(0, now - activeSession.lastResumeTime);
    } else if (activeSession.status === 'paused' && intervals.length > 0) {
      const last = { ...intervals[intervals.length - 1] };
      if (last.resumedAt === null) {
        last.resumedAt = now;
        intervals[intervals.length - 1] = last;
      }
    }

    const completedSession: StudySession = {
      ...activeSession,
      status: 'completed',
      endTime: now,
      accumulatedActiveMs: finalAccumulated,
      pauseIntervals: intervals,
      updatedAt: now,
    };

    setActiveSession(null);
    setTimerElapsedMs(0);
    setRemainingCountdownMs(0);
    await storageService.saveActiveSession(null);

    await storageService.saveSession(completedSession);
    setSessions((prev) => [completedSession, ...prev.filter((s) => s.id !== completedSession.id)]);

    if (settings.soundEnabled) soundService.playFinish();
    autoFirebaseService.autoSaveSession(completedSession).catch(() => {});

    showToast(`Session saved: ${formatDurationHuman(finalAccumulated)} studied`);
    return completedSession;
  }, [activeSession, settings, showToast]);

  const discardActiveSession = useCallback(async () => {
    if (!activeSession) return;
    setActiveSession(null);
    setTimerElapsedMs(0);
    setRemainingCountdownMs(0);
    await storageService.saveActiveSession(null);
    showToast('Active study session discarded');
  }, [activeSession, showToast]);

  const switchPomodoroPhase = useCallback(
    async (nextPhase: PomodoroPhase) => {
      if (activeSession) {
        await stopStudy();
      }
      setActivePomodoroPhase(nextPhase);
      if (nextPhase === 'work') {
        setPomodoroCycleCount((c) => c + 1);
      }
      await startStudy({
        timerMode: 'pomodoro',
        pomodoroPhase: nextPhase,
      });
    },
    [activeSession, stopStudy, startStudy]
  );

  /* ---------------- MANUAL SESSION ENTRY ---------------- */

  const addManualSession = useCallback(
    async (data: {
      date: string;
      startTimeStr: string;
      finishTimeStr?: string;
      activeMinutes: number;
      pausedMinutes?: number;
      subject: string;
      chapter?: string;
      topic?: string;
      notes?: string;
      tags?: string[];
    }): Promise<StudySession> => {
      const now = Date.now();
      const uniqueId = `manual_${now}_${Math.random().toString(36).substring(2, 8)}`;

      // Parse date and time
      const [year, month, day] = data.date.split('-').map(Number);
      const [hours, minutes] = data.startTimeStr.split(':').map(Number);
      const startDateTime = new Date(year, month - 1, day, hours, minutes, 0).getTime();

      const activeMs = Math.max(0, data.activeMinutes * 60 * 1000);
      const pausedMs = Math.max(0, (data.pausedMinutes || 0) * 60 * 1000);
      const finishTimeMs = startDateTime + activeMs + pausedMs;

      const pauseIntervals =
        pausedMs > 0
          ? [
              {
                pausedAt: startDateTime + activeMs / 2,
                resumedAt: startDateTime + activeMs / 2 + pausedMs,
              },
            ]
          : [];

      const cleanTags = data.tags
        ? Array.from(new Set(data.tags.map((t) => t.replace(/^#/, '').toLowerCase())))
        : [];

      const manualSession: StudySession = {
        id: uniqueId,
        subject: data.subject.trim() || 'General Study',
        chapter: data.chapter?.trim() || '',
        topic: data.topic?.trim() || '',
        tags: cleanTags,
        notes: data.notes?.trim() || '',
        status: 'completed',
        timerMode: 'custom',
        startTime: startDateTime,
        endTime: finishTimeMs,
        pauseIntervals,
        accumulatedActiveMs: activeMs,
        lastResumeTime: startDateTime,
        date: data.date,
        createdAt: now,
        updatedAt: now,
        isManualEntry: true,
      };

      await storageService.saveSession(manualSession);
      setSessions((prev) => [manualSession, ...prev].sort((a, b) => b.startTime - a.startTime));
      autoFirebaseService.autoSaveSession(manualSession).catch(() => {});
      showToast(`Manual study session logged: ${formatDurationHuman(activeMs)}`);

      return manualSession;
    },
    [showToast]
  );

  /* ---------------- SESSIONS CRUD ---------------- */

  const editSession = useCallback(
    async (updatedSession: StudySession) => {
      const updated = { ...updatedSession, updatedAt: Date.now() };
      await storageService.saveSession(updated);
      setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      autoFirebaseService.autoSaveSession(updated).catch(() => {});
      showToast('Session record updated');
    },
    [showToast]
  );

  const deleteSession = useCallback(
    async (id: string) => {
      await storageService.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      autoFirebaseService.autoDeleteSession(id).catch(() => {});
      showToast('Session deleted');
    },
    [showToast]
  );

  const deleteMultipleSessions = useCallback(
    async (ids: string[]) => {
      for (const id of ids) {
        await storageService.deleteSession(id);
        autoFirebaseService.autoDeleteSession(id).catch(() => {});
      }
      setSessions((prev) => prev.filter((s) => !ids.includes(s.id)));
      showToast(`Deleted ${ids.length} sessions`);
    },
    [showToast]
  );

  const clearAllHistory = useCallback(async () => {
    await storageService.clearAllSessions();
    setSessions([]);
    await autoFirebaseService.autoSyncAll([], settings);
    showToast('All study history deleted');
  }, [settings, showToast]);

  /* ---------------- SUBJECTS & CHAPTERS ---------------- */

  const addSubject = useCallback(
    async (name: string, color?: string, course?: string): Promise<SubjectItem> => {
      const uniqueId = `subj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newSubject: SubjectItem = {
        id: uniqueId,
        name: name.trim(),
        color: color || '#38bdf8',
        course: course?.trim() || '',
        chapters: [],
        createdAt: Date.now(),
      };

      await storageService.saveSubject(newSubject);
      setSubjects((prev) => [...prev, newSubject]);
      showToast(`Added subject: ${name}`);
      return newSubject;
    },
    [showToast]
  );

  const updateSubject = useCallback(
    async (subject: SubjectItem) => {
      await storageService.saveSubject(subject);
      setSubjects((prev) => prev.map((s) => (s.id === subject.id ? subject : s)));
      showToast('Subject updated');
    },
    [showToast]
  );

  const deleteSubject = useCallback(
    async (id: string) => {
      await storageService.deleteSubject(id);
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      showToast('Subject removed');
    },
    [showToast]
  );

  const addChapter = useCallback(
    async (subjectId: string, chapterName: string) => {
      const target = subjects.find((s) => s.id === subjectId);
      if (!target) return;
      const chapterId = `ch_${Date.now()}`;
      const newChapter: ChapterItem = {
        id: chapterId,
        name: chapterName.trim(),
        topics: [],
        isCompleted: false,
      };
      const updated = {
        ...target,
        chapters: [...target.chapters, newChapter],
      };
      await updateSubject(updated);
      showToast(`Chapter "${chapterName}" added to ${target.name}`);
    },
    [subjects, updateSubject, showToast]
  );

  const addTopic = useCallback(
    async (subjectId: string, chapterId: string, topicName: string) => {
      const target = subjects.find((s) => s.id === subjectId);
      if (!target) return;
      const updatedChapters = target.chapters.map((ch) => {
        if (ch.id === chapterId) {
          return { ...ch, topics: [...ch.topics, topicName.trim()] };
        }
        return ch;
      });
      await updateSubject({ ...target, chapters: updatedChapters });
      showToast(`Topic added`);
    },
    [subjects, updateSubject, showToast]
  );

  const toggleChapterCompletion = useCallback(
    async (subjectId: string, chapterId: string) => {
      const target = subjects.find((s) => s.id === subjectId);
      if (!target) return;
      const updatedChapters = target.chapters.map((ch) => {
        if (ch.id === chapterId) {
          return { ...ch, isCompleted: !ch.isCompleted };
        }
        return ch;
      });
      await updateSubject({ ...target, chapters: updatedChapters });
    },
    [subjects, updateSubject]
  );

  /* ---------------- GOALS ---------------- */

  const addGoal = useCallback(
    async (goalData: Omit<StudyGoal, 'id' | 'createdAt'>): Promise<StudyGoal> => {
      const uniqueId = `goal_${Date.now()}`;
      const newGoal: StudyGoal = {
        ...goalData,
        id: uniqueId,
        createdAt: Date.now(),
      };
      await storageService.saveGoal(newGoal);
      setGoals((prev) => [...prev, newGoal]);
      showToast(`Study Goal "${newGoal.title}" created`);
      return newGoal;
    },
    [showToast]
  );

  const updateGoal = useCallback(
    async (goal: StudyGoal) => {
      await storageService.saveGoal(goal);
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g)));
      showToast('Goal updated');
    },
    [showToast]
  );

  const deleteGoal = useCallback(
    async (id: string) => {
      await storageService.deleteGoal(id);
      setGoals((prev) => prev.filter((g) => g.id !== id));
      showToast('Goal removed');
    },
    [showToast]
  );

  /* ---------------- DAILY REVIEWS ---------------- */

  const saveDailyReview = useCallback(
    async (reviewData: Omit<DailyReview, 'id' | 'createdAt' | 'updatedAt'>): Promise<DailyReview> => {
      const now = Date.now();
      const existing = dailyReviews.find((r) => r.date === reviewData.date);
      const review: DailyReview = {
        ...reviewData,
        id: existing ? existing.id : `review_${reviewData.date}`,
        createdAt: existing ? existing.createdAt : now,
        updatedAt: now,
      };

      await storageService.saveReview(review);
      setDailyReviews((prev) => {
        const filtered = prev.filter((r) => r.date !== review.date);
        return [review, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
      });
      showToast(`Daily reflection saved for ${review.date}`);
      return review;
    },
    [dailyReviews, showToast]
  );

  const deleteDailyReview = useCallback(
    async (date: string) => {
      await storageService.deleteReview(date);
      setDailyReviews((prev) => prev.filter((r) => r.date !== date));
      showToast('Daily review deleted');
    },
    [showToast]
  );

  /* ---------------- BACKUP, SNAPSHOTS & RESTORE ---------------- */

  const createSnapshot = useCallback(
    async (label?: string): Promise<BackupSnapshot> => {
      const now = Date.now();
      const snapId = `snap_${now}`;
      const totalHrs = Number(
        (sessions.reduce((acc, s) => acc + s.accumulatedActiveMs, 0) / 3600000).toFixed(2)
      );
      const fullData = {
        app: 'BK NITHILESHVAR — STUDY TIME TRACKER',
        version: '2.0',
        createdAt: now,
        studentName: settings.studentName,
        settings,
        sessions,
        subjects,
        goals,
        dailyReviews,
      };

      const newSnap: BackupSnapshot = {
        id: snapId,
        timestamp: now,
        label: label || `Snapshot ${new Date(now).toLocaleDateString()} ${new Date(now).toLocaleTimeString()}`,
        sessionsCount: sessions.length,
        totalHours: totalHrs,
        dataJson: JSON.stringify(fullData),
      };

      await storageService.saveSnapshot(newSnap);
      setSnapshots((prev) => [newSnap, ...prev]);

      // Retain max configured snapshots
      if (snapshots.length >= settings.maxAutoSnapshots) {
        const excess = snapshots.slice(settings.maxAutoSnapshots - 1);
        for (const item of excess) {
          await storageService.deleteSnapshot(item.id);
        }
      }

      showToast(`Backup snapshot created (${sessions.length} sessions)`);
      return newSnap;
    },
    [sessions, settings, subjects, goals, dailyReviews, snapshots, showToast]
  );

  const restoreSnapshot = useCallback(
    async (snapshotId: string, mode: 'replace' | 'merge' = 'replace') => {
      const snap = snapshots.find((s) => s.id === snapshotId);
      if (!snap) return;
      try {
        const parsed = JSON.parse(snap.dataJson);
        await importFullData(parsed, mode);
        showToast('Snapshot restored successfully');
      } catch {
        showToast('Failed to parse snapshot data');
      }
    },
    [snapshots, showToast]
  );

  const deleteSnapshot = useCallback(
    async (snapshotId: string) => {
      await storageService.deleteSnapshot(snapshotId);
      setSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));
      showToast('Snapshot deleted');
    },
    [showToast]
  );

  const exportFullDataJSON = useCallback((): string => {
    const data = {
      app: 'BK NITHILESHVAR — STUDY TIME TRACKER',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      studentName: settings.studentName,
      settings,
      sessions,
      subjects,
      goals,
      dailyReviews,
    };
    return JSON.stringify(data, null, 2);
  }, [settings, sessions, subjects, goals, dailyReviews]);

  const importFullData = useCallback(
    async (jsonData: any, mode: 'replace' | 'merge' = 'merge') => {
      const incomingSessions: StudySession[] = Array.isArray(jsonData.sessions) ? jsonData.sessions : [];
      let finalSessions: StudySession[] = [];

      if (mode === 'replace') {
        finalSessions = [...incomingSessions];
        await storageService.clearAllSessions();
      } else {
        const map = new Map<string, StudySession>();
        sessions.forEach((s) => map.set(s.id, s));
        incomingSessions.forEach((s) => map.set(s.id, s));
        finalSessions = Array.from(map.values());
      }
      finalSessions.sort((a, b) => b.startTime - a.startTime);

      for (const s of finalSessions) {
        await storageService.saveSession(s);
      }
      setSessions(finalSessions);

      // Subjects
      if (Array.isArray(jsonData.subjects) && jsonData.subjects.length > 0) {
        setSubjects(jsonData.subjects);
        for (const subj of jsonData.subjects) {
          await storageService.saveSubject(subj);
        }
      }

      // Goals
      if (Array.isArray(jsonData.goals)) {
        setGoals(jsonData.goals);
        for (const g of jsonData.goals) {
          await storageService.saveGoal(g);
        }
      }

      // Daily Reviews
      if (Array.isArray(jsonData.dailyReviews)) {
        setDailyReviews(jsonData.dailyReviews);
        for (const r of jsonData.dailyReviews) {
          await storageService.saveReview(r);
        }
      }

      // Settings
      if (jsonData.settings) {
        const mergedSettings = { ...settings, ...jsonData.settings };
        setSettings(mergedSettings);
        await storageService.saveSettings(mergedSettings);
      }

      // Mirror to cloud
      autoFirebaseService.autoSyncAll(finalSessions, jsonData.settings || settings).catch(() => {});

      showToast(`Import completed: ${incomingSessions.length} sessions loaded (${mode})`);
      return { addedSessions: incomingSessions.length };
    },
    [sessions, settings, showToast]
  );

  /* ---------------- SETTINGS ---------------- */

  const updateSettings = useCallback(
    async (newSettings: Partial<UserSettings>) => {
      const merged: UserSettings = { ...settings, ...newSettings };
      setSettings(merged);
      await storageService.saveSettings(merged);
      autoFirebaseService.autoSyncAll(sessions, merged).catch(() => {});
      showToast('Settings saved');
    },
    [settings, sessions, showToast]
  );

  const triggerManualCloudSync = useCallback(async (): Promise<boolean> => {
    const success = await autoFirebaseService.autoSyncAll(sessions, settings);
    if (success) {
      showToast('Firebase Realtime Database synced');
    } else {
      showToast('Sync recorded to local cache');
    }
    return success;
  }, [sessions, settings, showToast]);

  /* ---------------- DERIVED ANALYTICS & STATS ---------------- */

  const todayStr = useMemo(() => getLocalDateString(Date.now()), []);

  const validSessions = useMemo(
    () => sessions.filter((s) => s.status === 'completed' || s.status === 'running'),
    [sessions]
  );

  const dailySummaries = useMemo<DailySummary[]>(() => {
    const map: Record<string, DailySummary> = {};

    validSessions.forEach((session) => {
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

    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [validSessions]);

  const todaySessions = useMemo(() => {
    return sessions.filter((s) => {
      const sDate = s.date || getLocalDateString(s.startTime);
      return sDate === todayStr;
    });
  }, [sessions, todayStr]);

  // Streak calculation from genuine activity dates
  const { currentStreakDays, bestStreakDays } = useMemo(() => {
    if (dailySummaries.length === 0) {
      return { currentStreakDays: 0, bestStreakDays: 0 };
    }

    // Set of active dates YYYY-MM-DD
    const activeDates = new Set<string>(dailySummaries.filter((d) => d.totalMs > 0).map((d) => d.date));
    if (activeDates.size === 0) return { currentStreakDays: 0, bestStreakDays: 0 };

    let current = 0;
    let best = 0;
    let temp = 0;

    const checkDate = new Date();
    // Check if studied today
    const todayKey = getLocalDateString(checkDate.getTime());
    let iterDate = new Date();

    if (!activeDates.has(todayKey)) {
      // Check if studied yesterday to keep current streak alive
      iterDate.setDate(iterDate.getDate() - 1);
      const yestKey = getLocalDateString(iterDate.getTime());
      if (!activeDates.has(yestKey)) {
        current = 0;
      } else {
        while (activeDates.has(getLocalDateString(iterDate.getTime()))) {
          current++;
          iterDate.setDate(iterDate.getDate() - 1);
        }
      }
    } else {
      while (activeDates.has(getLocalDateString(iterDate.getTime()))) {
        current++;
        iterDate.setDate(iterDate.getDate() - 1);
      }
    }

    // Calculate best streak across all chronological active dates
    const sortedDates = Array.from(activeDates).sort();
    temp = 1;
    best = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 3600 * 24));

      if (diffDays === 1) {
        temp++;
        if (temp > best) best = temp;
      } else if (diffDays > 1) {
        temp = 1;
      }
    }

    if (current > best) best = current;

    return { currentStreakDays: current, bestStreakDays: best };
  }, [dailySummaries]);

  const stats = useMemo<StudyStats>(() => {
    const now = Date.now();
    const todaySummary = dailySummaries.find((d) => d.date === todayStr);
    const todayTotalMs = todaySummary ? todaySummary.totalMs : 0;
    const todaySessionsCount = todaySessions.length;

    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    let weekTotalMs = 0;
    let monthTotalMs = 0;
    let allTimeTotalMs = 0;
    let longestSessionMs = 0;

    validSessions.forEach((s) => {
      allTimeTotalMs += s.accumulatedActiveMs;
      if (s.accumulatedActiveMs > longestSessionMs) {
        longestSessionMs = s.accumulatedActiveMs;
      }
      if (s.startTime >= sevenDaysAgo) {
        weekTotalMs += s.accumulatedActiveMs;
      }
      if (s.startTime >= thirtyDaysAgo) {
        monthTotalMs += s.accumulatedActiveMs;
      }
    });

    const totalSessionsCount = validSessions.length;
    const averageSessionMs = totalSessionsCount > 0 ? Math.round(allTimeTotalMs / totalSessionsCount) : 0;

    return {
      todayTotalMs,
      todaySessionsCount,
      weekTotalMs,
      monthTotalMs,
      allTimeTotalMs,
      totalSessionsCount,
      averageSessionMs,
      longestSessionMs,
      currentStreakDays,
      bestStreakDays,
    };
  }, [dailySummaries, todayStr, todaySessions, validSessions, currentStreakDays, bestStreakDays]);

  const totalHoursStudied = useMemo(() => {
    return Number((stats.allTimeTotalMs / (1000 * 3600)).toFixed(2));
  }, [stats.allTimeTotalMs]);

  const totalHoursFormatted = useMemo(() => {
    return `${totalHoursStudied} hrs`;
  }, [totalHoursStudied]);

  const totalStudyTimeHMS = useMemo(() => {
    return formatDurationHMS(stats.allTimeTotalMs);
  }, [stats.allTimeTotalMs]);

  return (
    <StudyContext.Provider
      value={{
        activeTab,
        setActiveTab,
        activeSession,
        timerElapsedMs,
        remainingCountdownMs,
        isTimerRunning: activeSession?.status === 'running',
        isTimerPaused: activeSession?.status === 'paused',
        activeTimerMode,
        activePomodoroPhase,
        pomodoroCycleCount,
        startStudy,
        updateActiveSessionMetadata,
        pauseStudy,
        resumeStudy,
        stopStudy,
        discardActiveSession,
        switchPomodoroPhase,
        idleDetected,
        idleDurationMs,
        handleKeepIdleTime,
        handleTrimIdleTime,
        addManualSession,
        sessions,
        isLoading,
        editSession,
        deleteSession,
        deleteMultipleSessions,
        clearAllHistory,
        subjects,
        addSubject,
        updateSubject,
        deleteSubject,
        addChapter,
        addTopic,
        toggleChapterCompletion,
        goals,
        addGoal,
        updateGoal,
        deleteGoal,
        dailyReviews,
        saveDailyReview,
        deleteDailyReview,
        snapshots,
        createSnapshot,
        restoreSnapshot,
        deleteSnapshot,
        importFullData,
        exportFullDataJSON,
        settings,
        updateSettings,
        stats,
        totalHoursStudied,
        totalHoursFormatted,
        totalStudyTimeHMS,
        todaySessions,
        dailySummaries,
        cloudStatus,
        triggerManualCloudSync,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </StudyContext.Provider>
  );
};

export const useStudy = () => {
  const context = useContext(StudyContext);
  if (!context) {
    throw new Error('useStudy must be used within a StudyProvider');
  }
  return context;
};
