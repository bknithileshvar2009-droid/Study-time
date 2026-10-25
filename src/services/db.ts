/**
 * Production IndexedDB & Local Storage Persistence Layer
 * Versioned schema for Sessions, Subjects, Goals, Daily Reviews, Snapshots, and Settings.
 */

import {
  StudySession,
  UserSettings,
  SubjectItem,
  StudyGoal,
  DailyReview,
  BackupSnapshot,
} from '../types';

const DB_NAME = 'BKNithileshvarStudyDB';
const DB_VERSION = 2;

const SESSIONS_STORE = 'sessions';
const SUBJECTS_STORE = 'subjects';
const GOALS_STORE = 'goals';
const REVIEWS_STORE = 'daily_reviews';
const SNAPSHOTS_STORE = 'backup_snapshots';
const ACTIVE_STORE = 'active_session';
const SETTINGS_STORE = 'settings';

export const DEFAULT_SUBJECTS: SubjectItem[] = [
  {
    id: 'subj_physics',
    name: 'Physics',
    color: '#38bdf8', // Light blue
    chapters: [
      { id: 'ch_phy_1', name: 'Mechanics & Dynamics', topics: ['Kinematics', 'Laws of Motion', 'Gravitation'] },
      { id: 'ch_phy_2', name: 'Electromagnetism', topics: ['Electric Field', 'Magnetism', 'Electromagnetic Induction'] },
      { id: 'ch_phy_3', name: 'Modern Physics', topics: ['Photoelectric Effect', 'Nuclear Physics', 'Semiconductors'] },
    ],
    createdAt: 1700000000000,
  },
  {
    id: 'subj_chemistry',
    name: 'Chemistry',
    color: '#f43f5e', // Rose
    chapters: [
      { id: 'ch_chem_1', name: 'Physical Chemistry', topics: ['Thermodynamics', 'Equilibrium', 'Electrochemistry'] },
      { id: 'ch_chem_2', name: 'Organic Chemistry', topics: ['Reaction Mechanisms', 'Hydrocarbons', 'Biomolecules'] },
      { id: 'ch_chem_3', name: 'Inorganic Chemistry', topics: ['Periodic Table', 'Coordination Compounds', 'Chemical Bonding'] },
    ],
    createdAt: 1700000000000,
  },
  {
    id: 'subj_maths',
    name: 'Mathematics',
    color: '#eab308', // Amber / Gold
    chapters: [
      { id: 'ch_math_1', name: 'Calculus', topics: ['Limits & Continuity', 'Differentiation', 'Integration'] },
      { id: 'ch_math_2', name: 'Algebra & Matrices', topics: ['Quadratic Equations', 'Matrices & Determinants', 'Sequences'] },
      { id: 'ch_math_3', name: 'Vectors & 3D Geometry', topics: ['Vector Algebra', '3D Coordinate Geometry', 'Probability'] },
    ],
    createdAt: 1700000000000,
  },
  {
    id: 'subj_biology',
    name: 'Biology',
    color: '#10b981', // Emerald
    chapters: [
      { id: 'ch_bio_1', name: 'Human Physiology', topics: ['Circulatory System', 'Neural Control', 'Endocrine System'] },
      { id: 'ch_bio_2', name: 'Genetics & Evolution', topics: ['Mendelian Inheritance', 'Molecular Basis of Inheritance', 'Evolution'] },
      { id: 'ch_bio_3', name: 'Ecology & Environment', topics: ['Organisms & Populations', 'Ecosystem Dynamics', 'Biodiversity'] },
    ],
    createdAt: 1700000000000,
  },
  {
    id: 'subj_english',
    name: 'English',
    color: '#a855f7', // Purple
    chapters: [
      { id: 'ch_eng_1', name: 'Literature & Prose', topics: ['Critical Analysis', 'Poetry Analysis', 'Essays'] },
      { id: 'ch_eng_2', name: 'Grammar & Writing Skills', topics: ['Formal Letters', 'Syntax & Vocab', 'Comprehension'] },
    ],
    createdAt: 1700000000000,
  },
  {
    id: 'subj_tamil',
    name: 'Tamil',
    color: '#f97316', // Orange
    chapters: [
      { id: 'ch_tam_1', name: 'இலக்கியம் (Literature)', topics: ['திருக்குறள்', 'சிலப்பதிகாரம்', 'புறநானூறு'] },
      { id: 'ch_tam_2', name: 'இலக்கணம் (Grammar)', topics: ['சொல் இலக்கணம்', 'பொருள் இலக்கணம்', 'யாப்பு'] },
    ],
    createdAt: 1700000000000,
  },
  {
    id: 'subj_other',
    name: 'Other',
    color: '#64748b', // Slate
    chapters: [
      { id: 'ch_oth_1', name: 'General Studies', topics: ['Self Learning', 'Research', 'Problem Sets'] },
    ],
    createdAt: 1700000000000,
  },
];

export const DEFAULT_SETTINGS: UserSettings = {
  studentName: 'BK NITHILESHVAR',
  dailyGoalHours: 4,
  weeklyGoalHours: 25,
  monthlyGoalHours: 100,
  defaultSubject: 'Physics',
  defaultTimerMode: 'stopwatch',
  pomodoroWorkMin: 25,
  pomodoroShortBreakMin: 5,
  pomodoroLongBreakMin: 15,
  pomodoroSessionsBeforeLongBreak: 4,
  idleDetectionMin: 15,
  weekStart: 'monday',
  subjectPresets: [
    'Physics',
    'Chemistry',
    'Mathematics',
    'Biology',
    'English',
    'Tamil',
    'Other',
  ],
  tagPresets: [
    'urgent',
    'review',
    'exam-prep',
    'deep-work',
    'assignment',
    'revision',
  ],
  soundEnabled: true,
  autoBackupEnabled: true,
  autoBackupFrequencyHours: 24,
  maxAutoSnapshots: 5,
  autoSaveCloud: true,
  themeAccent: 'crimson-gold',
  widgetMode: false,
};

class MasterStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isIndexedDBAvailable: boolean = true;

  constructor() {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      this.initDB();
    } else {
      this.isIndexedDBAvailable = false;
    }
  }

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // 1. Sessions store
          if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
            const sStore = db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
            sStore.createIndex('date', 'date', { unique: false });
            sStore.createIndex('startTime', 'startTime', { unique: false });
            sStore.createIndex('subject', 'subject', { unique: false });
            sStore.createIndex('timerMode', 'timerMode', { unique: false });
          }

          // 2. Subjects store
          if (!db.objectStoreNames.contains(SUBJECTS_STORE)) {
            db.createObjectStore(SUBJECTS_STORE, { keyPath: 'id' });
          }

          // 3. Goals store
          if (!db.objectStoreNames.contains(GOALS_STORE)) {
            db.createObjectStore(GOALS_STORE, { keyPath: 'id' });
          }

          // 4. Daily Reviews store
          if (!db.objectStoreNames.contains(REVIEWS_STORE)) {
            db.createObjectStore(REVIEWS_STORE, { keyPath: 'date' });
          }

          // 5. Backup Snapshots store
          if (!db.objectStoreNames.contains(SNAPSHOTS_STORE)) {
            db.createObjectStore(SNAPSHOTS_STORE, { keyPath: 'id' });
          }

          // 6. Active session store
          if (!db.objectStoreNames.contains(ACTIVE_STORE)) {
            db.createObjectStore(ACTIVE_STORE, { keyPath: 'key' });
          }

          // 7. Settings store
          if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
            db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
          }
        };

        request.onsuccess = () => resolve(request.result);

        request.onerror = (e) => {
          console.warn('IndexedDB unavailable, falling back to LocalStorage:', e);
          this.isIndexedDBAvailable = false;
          reject(e);
        };
      } catch (err) {
        this.isIndexedDBAvailable = false;
        reject(err);
      }
    });

    return this.dbPromise;
  }

  /* ---------------- SESSIONS ---------------- */

  async getAllSessions(): Promise<StudySession[]> {
    if (!this.isIndexedDBAvailable) {
      return this.getLocalFallback<StudySession[]>('chronos_study_sessions', []);
    }

    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const tx = db.transaction(SESSIONS_STORE, 'readonly');
        const store = tx.objectStore(SESSIONS_STORE);
        const req = store.getAll();

        req.onsuccess = () => {
          const items = (req.result || []) as StudySession[];
          items.sort((a, b) => b.startTime - a.startTime);
          resolve(items);
        };

        req.onerror = () => {
          resolve(this.getLocalFallback<StudySession[]>('chronos_study_sessions', []));
        };
      });
    } catch {
      return this.getLocalFallback<StudySession[]>('chronos_study_sessions', []);
    }
  }

  async saveSession(session: StudySession): Promise<void> {
    this.updateLocalList('chronos_study_sessions', session);

    if (!this.isIndexedDBAvailable) return;

    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(SESSIONS_STORE, 'readwrite');
        const store = tx.objectStore(SESSIONS_STORE);
        const req = store.put(session);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('IndexedDB save session fallback:', e);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.removeFromLocalList('chronos_study_sessions', sessionId);

    if (!this.isIndexedDBAvailable) return;

    try {
      const db = await this.initDB();
      const tx = db.transaction(SESSIONS_STORE, 'readwrite');
      tx.objectStore(SESSIONS_STORE).delete(sessionId);
    } catch {}
  }

  async clearAllSessions(): Promise<void> {
    localStorage.removeItem('chronos_study_sessions');
    if (!this.isIndexedDBAvailable) return;

    try {
      const db = await this.initDB();
      const tx = db.transaction(SESSIONS_STORE, 'readwrite');
      tx.objectStore(SESSIONS_STORE).clear();
    } catch {}
  }

  /* ---------------- SUBJECTS ---------------- */

  async getAllSubjects(): Promise<SubjectItem[]> {
    if (!this.isIndexedDBAvailable) {
      return this.getLocalFallback<SubjectItem[]>('chronos_subjects', DEFAULT_SUBJECTS);
    }

    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const tx = db.transaction(SUBJECTS_STORE, 'readonly');
        const store = tx.objectStore(SUBJECTS_STORE);
        const req = store.getAll();

        req.onsuccess = () => {
          const res = (req.result || []) as SubjectItem[];
          if (res.length === 0) {
            // Seed defaults
            DEFAULT_SUBJECTS.forEach((s) => this.saveSubject(s));
            resolve(DEFAULT_SUBJECTS);
          } else {
            resolve(res);
          }
        };

        req.onerror = () => resolve(this.getLocalFallback<SubjectItem[]>('chronos_subjects', DEFAULT_SUBJECTS));
      });
    } catch {
      return this.getLocalFallback<SubjectItem[]>('chronos_subjects', DEFAULT_SUBJECTS);
    }
  }

  async saveSubject(subject: SubjectItem): Promise<void> {
    this.updateLocalList('chronos_subjects', subject);

    if (!this.isIndexedDBAvailable) return;

    try {
      const db = await this.initDB();
      const tx = db.transaction(SUBJECTS_STORE, 'readwrite');
      tx.objectStore(SUBJECTS_STORE).put(subject);
    } catch {}
  }

  async deleteSubject(id: string): Promise<void> {
    this.removeFromLocalList('chronos_subjects', id);

    if (!this.isIndexedDBAvailable) return;

    try {
      const db = await this.initDB();
      const tx = db.transaction(SUBJECTS_STORE, 'readwrite');
      tx.objectStore(SUBJECTS_STORE).delete(id);
    } catch {}
  }

  /* ---------------- GOALS ---------------- */

  async getAllGoals(): Promise<StudyGoal[]> {
    if (!this.isIndexedDBAvailable) {
      return this.getLocalFallback<StudyGoal[]>('chronos_goals', []);
    }

    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const tx = db.transaction(GOALS_STORE, 'readonly');
        const store = tx.objectStore(GOALS_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result || []) as StudyGoal[]);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  async saveGoal(goal: StudyGoal): Promise<void> {
    this.updateLocalList('chronos_goals', goal);
    if (!this.isIndexedDBAvailable) return;

    try {
      const db = await this.initDB();
      const tx = db.transaction(GOALS_STORE, 'readwrite');
      tx.objectStore(GOALS_STORE).put(goal);
    } catch {}
  }

  async deleteGoal(id: string): Promise<void> {
    this.removeFromLocalList('chronos_goals', id);
    if (!this.isIndexedDBAvailable) return;

    try {
      const db = await this.initDB();
      const tx = db.transaction(GOALS_STORE, 'readwrite');
      tx.objectStore(GOALS_STORE).delete(id);
    } catch {}
  }

  /* ---------------- DAILY REVIEWS ---------------- */

  async getAllReviews(): Promise<DailyReview[]> {
    if (!this.isIndexedDBAvailable) {
      return this.getLocalFallback<DailyReview[]>('chronos_daily_reviews', []);
    }

    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const tx = db.transaction(REVIEWS_STORE, 'readonly');
        const store = tx.objectStore(REVIEWS_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result || []) as DailyReview[]);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  async saveReview(review: DailyReview): Promise<void> {
    this.updateLocalList('chronos_daily_reviews', review, 'date');
    if (!this.isIndexedDBAvailable) return;

    try {
      const db = await this.initDB();
      const tx = db.transaction(REVIEWS_STORE, 'readwrite');
      tx.objectStore(REVIEWS_STORE).put(review);
    } catch {}
  }

  async deleteReview(date: string): Promise<void> {
    this.removeFromLocalList('chronos_daily_reviews', date, 'date');
    if (!this.isIndexedDBAvailable) return;

    try {
      const db = await this.initDB();
      const tx = db.transaction(REVIEWS_STORE, 'readwrite');
      tx.objectStore(REVIEWS_STORE).delete(date);
    } catch {}
  }

  /* ---------------- BACKUP SNAPSHOTS ---------------- */

  async getAllSnapshots(): Promise<BackupSnapshot[]> {
    if (!this.isIndexedDBAvailable) {
      return this.getLocalFallback<BackupSnapshot[]>('chronos_snapshots', []);
    }

    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const tx = db.transaction(SNAPSHOTS_STORE, 'readonly');
        const store = tx.objectStore(SNAPSHOTS_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
          const list = (req.result || []) as BackupSnapshot[];
          list.sort((a, b) => b.timestamp - a.timestamp);
          resolve(list);
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  async saveSnapshot(snapshot: BackupSnapshot): Promise<void> {
    this.updateLocalList('chronos_snapshots', snapshot);
    if (!this.isIndexedDBAvailable) return;

    try {
      const db = await this.initDB();
      const tx = db.transaction(SNAPSHOTS_STORE, 'readwrite');
      tx.objectStore(SNAPSHOTS_STORE).put(snapshot);
    } catch {}
  }

  async deleteSnapshot(id: string): Promise<void> {
    this.removeFromLocalList('chronos_snapshots', id);
    if (!this.isIndexedDBAvailable) return;

    try {
      const db = await this.initDB();
      const tx = db.transaction(SNAPSHOTS_STORE, 'readwrite');
      tx.objectStore(SNAPSHOTS_STORE).delete(id);
    } catch {}
  }

  /* ---------------- ACTIVE TIMER RECOVERY ---------------- */

  async getActiveSession(): Promise<StudySession | null> {
    const localActive = localStorage.getItem('chronos_active_session');
    if (localActive) {
      try {
        return JSON.parse(localActive) as StudySession;
      } catch {}
    }

    if (!this.isIndexedDBAvailable) return null;

    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const tx = db.transaction(ACTIVE_STORE, 'readonly');
        const store = tx.objectStore(ACTIVE_STORE);
        const req = store.get('current');
        req.onsuccess = () => {
          if (req.result && req.result.session) {
            resolve(req.result.session as StudySession);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  async saveActiveSession(session: StudySession | null): Promise<void> {
    if (!session) {
      localStorage.removeItem('chronos_active_session');
      if (this.isIndexedDBAvailable) {
        try {
          const db = await this.initDB();
          const tx = db.transaction(ACTIVE_STORE, 'readwrite');
          tx.objectStore(ACTIVE_STORE).delete('current');
        } catch {}
      }
      return;
    }

    try {
      localStorage.setItem('chronos_active_session', JSON.stringify(session));
    } catch {}

    if (!this.isIndexedDBAvailable) return;

    try {
      const db = await this.initDB();
      const tx = db.transaction(ACTIVE_STORE, 'readwrite');
      tx.objectStore(ACTIVE_STORE).put({ key: 'current', session });
    } catch {}
  }

  /* ---------------- SETTINGS ---------------- */

  async getSettings(): Promise<UserSettings> {
    const sanitize = (s: UserSettings): UserSettings => {
      const merged = { ...DEFAULT_SETTINGS, ...s };
      if (!merged.studentName || merged.studentName === 'Student') {
        merged.studentName = 'BK NITHILESHVAR';
      }
      return merged;
    };

    const local = localStorage.getItem('chronos_user_settings');
    if (local) {
      try {
        return sanitize(JSON.parse(local));
      } catch {}
    }

    if (!this.isIndexedDBAvailable) return DEFAULT_SETTINGS;

    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const tx = db.transaction(SETTINGS_STORE, 'readonly');
        const store = tx.objectStore(SETTINGS_STORE);
        const req = store.get('current_settings');

        req.onsuccess = () => {
          if (req.result && req.result.settings) {
            resolve(sanitize(req.result.settings));
          } else {
            resolve(DEFAULT_SETTINGS);
          }
        };

        req.onerror = () => resolve(DEFAULT_SETTINGS);
      });
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    try {
      localStorage.setItem('chronos_user_settings', JSON.stringify(settings));
    } catch {}

    if (!this.isIndexedDBAvailable) return;

    try {
      const db = await this.initDB();
      const tx = db.transaction(SETTINGS_STORE, 'readwrite');
      tx.objectStore(SETTINGS_STORE).put({ key: 'current_settings', settings });
    } catch {}
  }

  /* ---------------- LOCAL STORAGE HELPERS ---------------- */

  private getLocalFallback<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      if (!data) return defaultValue;
      return JSON.parse(data) as T;
    } catch {
      return defaultValue;
    }
  }

  private updateLocalList<T extends { id?: string; date?: string }>(
    key: string,
    item: T,
    idKey: 'id' | 'date' = 'id'
  ) {
    try {
      const list = this.getLocalFallback<T[]>(key, []);
      const idx = list.findIndex((x) => x[idKey] === item[idKey]);
      if (idx >= 0) {
        list[idx] = item;
      } else {
        list.unshift(item);
      }
      localStorage.setItem(key, JSON.stringify(list));
    } catch {}
  }

  private removeFromLocalList<T extends { id?: string; date?: string }>(
    key: string,
    idVal: string,
    idKey: 'id' | 'date' = 'id'
  ) {
    try {
      const list = this.getLocalFallback<T[]>(key, []);
      const filtered = list.filter((x) => x[idKey] !== idVal);
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch {}
  }
}

export const storageService = new MasterStorageService();
