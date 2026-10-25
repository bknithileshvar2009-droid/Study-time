/**
 * Central Study Time Tracker Context
 * Coordinates timer state machine, storage persistence, stats, and cloud sync.
 */

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  StudySession,
  UserSettings,
  StudyStats,
  DailySummary,
  ViewTab,
} from '../types';
import { storageService } from '../services/db';
import { firebaseService, CloudSyncStatus } from '../services/firebase';
import { soundService } from '../services/audio';
import {
  calculateCurrentElapsed,
  getLocalDateString,
  getDailyAllocations,
  formatDateDisplay,
} from '../utils/timeFormat';

interface StudyContextType {
  // Navigation
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;

  // Active Session & Timer
  activeSession: StudySession | null;
  timerElapsedMs: number;
  isTimerRunning: boolean;
  isTimerPaused: boolean;
  startStudy: (subject?: string, notes?: string) => Promise<StudySession>;
  pauseStudy: () => Promise<void>;
  resumeStudy: () => Promise<void>;
  stopStudy: () => Promise<StudySession | null>;
  discardActiveSession: () => Promise<void>;

  // History & Management
  sessions: StudySession[];
  isLoading: boolean;
  editSession: (session: StudySession) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  clearAllHistory: () => Promise<void>;
  importData: (importedSessions: StudySession[], settings?: UserSettings, mode?: 'merge' | 'replace') => Promise<void>;

  // Settings
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;

  // Stats
  stats: StudyStats;
  todaySessions: StudySession[];
  dailySummaries: DailySummary[];

  // Cloud Sync
  cloudStatus: CloudSyncStatus;
  syncWithCloud: () => Promise<boolean>;
  loginAnonymously: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  logoutUser: () => Promise<void>;

  // Notification / Toast
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

export const StudyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [timerElapsedMs, setTimerElapsedMs] = useState<number>(0);
  const [settings, setSettings] = useState<UserSettings>({
    studentName: 'Student',
    dailyGoalHours: 4,
    defaultSubject: 'General Study',
    subjectPresets: ['General Study', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science'],
    soundEnabled: true,
    autoSaveCloud: true,
    themeAccent: 'crimson-gold',
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>({
    isConfigured: true,
    user: null,
    isSyncing: false,
    lastSyncedAt: null,
    syncError: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  });

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3800);
  }, []);

  // Subscribe to Firebase Cloud status
  useEffect(() => {
    const unsubscribe = firebaseService.subscribeStatus((newStatus) => {
      setCloudStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  // Initial Load from Storage (IndexedDB + local fallback)
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setIsLoading(true);
        // Load Settings
        const savedSettings = await storageService.getSettings();
        if (isMounted) setSettings(savedSettings);

        // Load Sessions
        const savedSessions = await storageService.getAllSessions();
        if (isMounted) setSessions(savedSessions);

        // Load Active Session
        const currentActive = await storageService.getActiveSession();
        if (isMounted && currentActive) {
          // Verify session validity
          if (currentActive.status === 'running' || currentActive.status === 'paused') {
            setActiveSession(currentActive);
            const elapsed = calculateCurrentElapsed(currentActive, Date.now());
            setTimerElapsedMs(elapsed);
          } else {
            // Stale active session
            await storageService.saveActiveSession(null);
          }
        }
      } catch (err) {
        console.error('Initialization storage load error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Synchronize when a Firebase user logs in
  useEffect(() => {
    if (!cloudStatus.user) return;
    async function syncFromCloudOnLogin() {
      try {
        const cloudSessions = await firebaseService.fetchSessionsFromCloud();
        if (cloudSessions && cloudSessions.length > 0) {
          // Merge with local sessions, deduplicating by id
          setSessions((prev) => {
            const map = new Map<string, StudySession>();
            cloudSessions.forEach((s) => map.set(s.id, s));
            prev.forEach((s) => {
              if (!map.has(s.id)) {
                map.set(s.id, s);
              }
            });
            const merged = Array.from(map.values()).sort((a, b) => b.startTime - a.startTime);
            // Save to IndexedDB
            merged.forEach((s) => storageService.saveSession(s));
            return merged;
          });
          showToast(`Cloud synced: ${cloudSessions.length} sessions restored`);
        } else if (sessions.length > 0) {
          // Cloud is empty, push local sessions to cloud
          await firebaseService.syncAllToCloud(sessions, settings);
        }

        const cloudSettings = await firebaseService.fetchSettingsFromCloud();
        if (cloudSettings) {
          setSettings(cloudSettings);
          await storageService.saveSettings(cloudSettings);
        }
      } catch (err) {
        console.warn('Initial cloud sync error:', err);
      }
    }
    syncFromCloudOnLogin();
  }, [cloudStatus.user]);

  // Timer Ticking Engine (Updates once per second when running)
  useEffect(() => {
    if (activeSession && activeSession.status === 'running') {
      // Immediate recalculation
      setTimerElapsedMs(calculateCurrentElapsed(activeSession, Date.now()));

      timerIntervalRef.current = setInterval(() => {
        setTimerElapsedMs(calculateCurrentElapsed(activeSession, Date.now()));
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (activeSession && activeSession.status === 'paused') {
        setTimerElapsedMs(activeSession.accumulatedActiveMs);
      } else if (!activeSession) {
        setTimerElapsedMs(0);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [activeSession]);

  /* ---------------- TIMER ACTIONS ---------------- */

  const startStudy = useCallback(
    async (subject?: string, notes?: string): Promise<StudySession> => {
      // Guard: prevent duplicate start if already running
      if (activeSession && activeSession.status === 'running') {
        return activeSession;
      }

      const now = Date.now();
      const uniqueId = `session_${now}_${Math.random().toString(36).substring(2, 8)}`;
      const chosenSubject = subject && subject.trim() ? subject.trim() : settings.defaultSubject;

      const newSession: StudySession = {
        id: uniqueId,
        subject: chosenSubject,
        notes: notes ? notes.trim() : '',
        status: 'running',
        startTime: now,
        endTime: null,
        pauseIntervals: [],
        accumulatedActiveMs: 0,
        lastResumeTime: now,
        date: getLocalDateString(now),
        createdAt: now,
        updatedAt: now,
      };

      setActiveSession(newSession);
      setTimerElapsedMs(0);

      // Save immediately to persistent storage
      await storageService.saveActiveSession(newSession);

      if (settings.soundEnabled) {
        soundService.playStart();
      }

      // Sync active state to cloud if available
      if (cloudStatus.user && settings.autoSaveCloud) {
        firebaseService.saveSessionToCloud(newSession).catch(() => {});
      }

      return newSession;
    },
    [activeSession, settings, cloudStatus.user]
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
      pauseIntervals: [
        ...activeSession.pauseIntervals,
        { pausedAt: now, resumedAt: null },
      ],
      updatedAt: now,
    };

    setActiveSession(updatedSession);
    setTimerElapsedMs(updatedAccumulated);

    await storageService.saveActiveSession(updatedSession);

    if (settings.soundEnabled) {
      soundService.playPause();
    }

    if (cloudStatus.user && settings.autoSaveCloud) {
      firebaseService.saveSessionToCloud(updatedSession).catch(() => {});
    }
  }, [activeSession, settings, cloudStatus.user]);

  const resumeStudy = useCallback(async () => {
    if (!activeSession || activeSession.status !== 'paused') return;

    const now = Date.now();
    const pauseIntervals = [...activeSession.pauseIntervals];
    if (pauseIntervals.length > 0) {
      const lastPause = { ...pauseIntervals[pauseIntervals.length - 1] };
      if (lastPause.resumedAt === null) {
        lastPause.resumedAt = now;
        pauseIntervals[pauseIntervals.length - 1] = lastPause;
      }
    }

    const updatedSession: StudySession = {
      ...activeSession,
      status: 'running',
      pauseIntervals,
      lastResumeTime: now,
      updatedAt: now,
    };

    setActiveSession(updatedSession);
    setTimerElapsedMs(calculateCurrentElapsed(updatedSession, now));

    await storageService.saveActiveSession(updatedSession);

    if (settings.soundEnabled) {
      soundService.playResume();
    }

    if (cloudStatus.user && settings.autoSaveCloud) {
      firebaseService.saveSessionToCloud(updatedSession).catch(() => {});
    }
  }, [activeSession, settings, cloudStatus.user]);

  const stopStudy = useCallback(async (): Promise<StudySession | null> => {
    if (!activeSession) return null;

    const now = Date.now();
    let finalAccumulated = activeSession.accumulatedActiveMs;

    const pauseIntervals = [...activeSession.pauseIntervals];
    if (activeSession.status === 'running') {
      finalAccumulated += Math.max(0, now - activeSession.lastResumeTime);
    } else if (activeSession.status === 'paused' && pauseIntervals.length > 0) {
      const lastPause = { ...pauseIntervals[pauseIntervals.length - 1] };
      if (lastPause.resumedAt === null) {
        lastPause.resumedAt = now;
        pauseIntervals[pauseIntervals.length - 1] = lastPause;
      }
    }

    const completedSession: StudySession = {
      ...activeSession,
      status: 'completed',
      endTime: now,
      accumulatedActiveMs: finalAccumulated,
      pauseIntervals,
      updatedAt: now,
    };

    // Clear active session
    setActiveSession(null);
    setTimerElapsedMs(0);
    await storageService.saveActiveSession(null);

    // Save to historical sessions
    await storageService.saveSession(completedSession);
    setSessions((prev) => [completedSession, ...prev.filter((s) => s.id !== completedSession.id)]);

    if (settings.soundEnabled) {
      soundService.playFinish();
    }

    // Cloud sync
    if (cloudStatus.user && settings.autoSaveCloud) {
      firebaseService.saveSessionToCloud(completedSession).catch(() => {});
    }

    showToast(`Session saved! Studied for ${Math.floor(finalAccumulated / 60000)}m`);
    return completedSession;
  }, [activeSession, settings, cloudStatus.user, showToast]);

  const discardActiveSession = useCallback(async () => {
    if (!activeSession) return;
    setActiveSession(null);
    setTimerElapsedMs(0);
    await storageService.saveActiveSession(null);
    showToast('Active study session discarded');
  }, [activeSession, showToast]);

  /* ---------------- SESSIONS MANAGEMENT ---------------- */

  const editSession = useCallback(
    async (updatedSession: StudySession) => {
      const updated = { ...updatedSession, updatedAt: Date.now() };
      await storageService.saveSession(updated);
      setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));

      if (cloudStatus.user && settings.autoSaveCloud) {
        firebaseService.saveSessionToCloud(updated).catch(() => {});
      }
      showToast('Session updated successfully');
    },
    [cloudStatus.user, settings.autoSaveCloud, showToast]
  );

  const deleteSession = useCallback(
    async (id: string) => {
      await storageService.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));

      if (cloudStatus.user) {
        firebaseService.deleteSessionFromCloud(id).catch(() => {});
      }
      showToast('Session deleted');
    },
    [cloudStatus.user, showToast]
  );

  const clearAllHistory = useCallback(async () => {
    await storageService.clearAllSessions();
    setSessions([]);
    if (cloudStatus.user) {
      await firebaseService.syncAllToCloud([], settings);
    }
    showToast('All study history cleared');
  }, [cloudStatus.user, settings, showToast]);

  const importData = useCallback(
    async (
      importedSessions: StudySession[],
      newSettings?: UserSettings,
      mode: 'merge' | 'replace' = 'merge'
    ) => {
      let finalSessions: StudySession[] = [];
      if (mode === 'replace') {
        finalSessions = [...importedSessions];
        await storageService.clearAllSessions();
      } else {
        const map = new Map<string, StudySession>();
        sessions.forEach((s) => map.set(s.id, s));
        importedSessions.forEach((s) => map.set(s.id, s));
        finalSessions = Array.from(map.values());
      }

      finalSessions.sort((a, b) => b.startTime - a.startTime);

      for (const s of finalSessions) {
        await storageService.saveSession(s);
      }
      setSessions(finalSessions);

      if (newSettings) {
        await storageService.saveSettings(newSettings);
        setSettings(newSettings);
      }

      if (cloudStatus.user) {
        await firebaseService.syncAllToCloud(finalSessions, newSettings || settings);
      }

      showToast(`Imported ${importedSessions.length} sessions (${mode})`);
    },
    [sessions, settings, cloudStatus.user, showToast]
  );

  /* ---------------- SETTINGS ---------------- */

  const updateSettings = useCallback(
    async (newSettings: Partial<UserSettings>) => {
      const merged: UserSettings = { ...settings, ...newSettings };
      setSettings(merged);
      await storageService.saveSettings(merged);

      if (cloudStatus.user) {
        firebaseService.saveSettingsToCloud(merged).catch(() => {});
      }
      showToast('Settings saved');
    },
    [settings, cloudStatus.user, showToast]
  );

  /* ---------------- CLOUD ACTIONS ---------------- */

  const syncWithCloud = useCallback(async (): Promise<boolean> => {
    if (!cloudStatus.user) {
      showToast('Please sign in or use 1-click cloud sync first');
      return false;
    }
    const success = await firebaseService.syncAllToCloud(sessions, settings);
    if (success) {
      showToast('All study data synced with Firebase Cloud');
    } else {
      showToast('Failed to sync data to cloud');
    }
    return success;
  }, [cloudStatus.user, sessions, settings, showToast]);

  const loginAnonymously = useCallback(async () => {
    try {
      await firebaseService.loginAnonymously();
      showToast('Connected to Cloud via 1-click anonymous sync!');
    } catch {
      showToast('Failed to connect to cloud');
    }
  }, [showToast]);

  const loginWithEmail = useCallback(
    async (email: string, pass: string) => {
      try {
        await firebaseService.loginWithEmail(email, pass);
        showToast(`Welcome back, ${email}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Login failed';
        showToast(msg);
      }
    },
    [showToast]
  );

  const registerWithEmail = useCallback(
    async (email: string, pass: string) => {
      try {
        await firebaseService.registerWithEmail(email, pass);
        showToast(`Account created for ${email}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Registration failed';
        showToast(msg);
      }
    },
    [showToast]
  );

  const logoutUser = useCallback(async () => {
    try {
      await firebaseService.logout();
      showToast('Logged out of Cloud sync');
    } catch {
      showToast('Logout failed');
    }
  }, [showToast]);

  /* ---------------- COMPUTED STATS ---------------- */

  const todayStr = useMemo(() => getLocalDateString(Date.now()), []);

  // Filter completed and running sessions
  const validSessions = useMemo(
    () => sessions.filter((s) => s.status === 'completed' || s.status === 'running'),
    [sessions]
  );

  // Group by local calendar dates handling midnight crossings
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
      const sessionDate = s.date || getLocalDateString(s.startTime);
      return sessionDate === todayStr;
    });
  }, [sessions, todayStr]);

  const stats = useMemo<StudyStats>(() => {
    const now = Date.now();
    const todaySummary = dailySummaries.find((d) => d.date === todayStr);
    const todayTotalMs = todaySummary ? todaySummary.totalMs : 0;
    const todaySessionsCount = todaySessions.length;

    // Calculate Week (Last 7 days) and Month (Last 30 days)
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    let weekTotalMs = 0;
    let monthTotalMs = 0;
    let allTimeTotalMs = 0;

    validSessions.forEach((s) => {
      allTimeTotalMs += s.accumulatedActiveMs;
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
    };
  }, [dailySummaries, todayStr, todaySessions, validSessions]);

  return (
    <StudyContext.Provider
      value={{
        activeTab,
        setActiveTab,
        activeSession,
        timerElapsedMs,
        isTimerRunning: activeSession?.status === 'running',
        isTimerPaused: activeSession?.status === 'paused',
        startStudy,
        pauseStudy,
        resumeStudy,
        stopStudy,
        discardActiveSession,
        sessions,
        isLoading,
        editSession,
        deleteSession,
        clearAllHistory,
        importData,
        settings,
        updateSettings,
        stats,
        todaySessions,
        dailySummaries,
        cloudStatus,
        syncWithCloud,
        loginAnonymously,
        loginWithEmail,
        registerWithEmail,
        logoutUser,
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
