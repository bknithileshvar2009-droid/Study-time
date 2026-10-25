/**
 * High-Reliability IndexedDB & Local Storage Persistence Layer
 */

import { StudySession, UserSettings } from '../types';

const DB_NAME = 'ChronosStudyDB';
const DB_VERSION = 1;
const SESSIONS_STORE = 'sessions';
const ACTIVE_STORE = 'active_session';
const SETTINGS_STORE = 'settings';

const DEFAULT_SETTINGS: UserSettings = {
  studentName: 'Student',
  dailyGoalHours: 4,
  defaultSubject: 'General Study',
  subjectPresets: [
    'General Study',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Computer Science',
    'Literature',
  ],
  soundEnabled: true,
  autoSaveCloud: true,
  themeAccent: 'crimson-gold',
};

class StorageService {
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
          // Sessions store
          if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
            const sessionsStore = db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
            sessionsStore.createIndex('date', 'date', { unique: false });
            sessionsStore.createIndex('startTime', 'startTime', { unique: false });
            sessionsStore.createIndex('status', 'status', { unique: false });
            sessionsStore.createIndex('subject', 'subject', { unique: false });
          }

          // Active session store (single item key 'current')
          if (!db.objectStoreNames.contains(ACTIVE_STORE)) {
            db.createObjectStore(ACTIVE_STORE, { keyPath: 'key' });
          }

          // Settings store
          if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
            db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = (e) => {
          console.error('IndexedDB open error, falling back to localStorage:', e);
          this.isIndexedDBAvailable = false;
          reject(e);
        };
      } catch (err) {
        console.error('Failed to init IndexedDB:', err);
        this.isIndexedDBAvailable = false;
        reject(err);
      }
    });

    return this.dbPromise;
  }

  /* ---------------- SESSIONS CRUD ---------------- */

  async getAllSessions(): Promise<StudySession[]> {
    if (!this.isIndexedDBAvailable) {
      return this.getLocalFallbackSessions();
    }

    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const tx = db.transaction(SESSIONS_STORE, 'readonly');
        const store = tx.objectStore(SESSIONS_STORE);
        const req = store.getAll();

        req.onsuccess = () => {
          const items = (req.result || []) as StudySession[];
          // Sort chronologically descending
          items.sort((a, b) => b.startTime - a.startTime);
          resolve(items);
        };

        req.onerror = () => {
          resolve(this.getLocalFallbackSessions());
        };
      });
    } catch {
      return this.getLocalFallbackSessions();
    }
  }

  async saveSession(session: StudySession): Promise<void> {
    // Always mirror to localStorage as an instant safety net
    this.saveToLocalFallback(session);

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
      console.warn('Could not save to IndexedDB, fallback used:', e);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.deleteFromLocalFallback(sessionId);

    if (!this.isIndexedDBAvailable) return;

    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(SESSIONS_STORE, 'readwrite');
        const store = tx.objectStore(SESSIONS_STORE);
        const req = store.delete(sessionId);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Could not delete from IndexedDB:', e);
    }
  }

  async clearAllSessions(): Promise<void> {
    localStorage.removeItem('chronos_study_sessions');

    if (!this.isIndexedDBAvailable) return;

    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(SESSIONS_STORE, 'readwrite');
        const store = tx.objectStore(SESSIONS_STORE);
        const req = store.clear();

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Could not clear IndexedDB:', e);
    }
  }

  /* ---------------- ACTIVE TIMER RECOVERY ---------------- */

  async getActiveSession(): Promise<StudySession | null> {
    // Check localStorage first for instant synchronous recovery
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
    const local = localStorage.getItem('chronos_user_settings');
    if (local) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(local) };
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
            resolve({ ...DEFAULT_SETTINGS, ...req.result.settings });
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

  /* ---------------- LOCALSTORAGE FALLBACK HELPERS ---------------- */

  private getLocalFallbackSessions(): StudySession[] {
    try {
      const data = localStorage.getItem('chronos_study_sessions');
      if (!data) return [];
      const sessions = JSON.parse(data) as StudySession[];
      return sessions.sort((a, b) => b.startTime - a.startTime);
    } catch {
      return [];
    }
  }

  private saveToLocalFallback(session: StudySession) {
    try {
      const list = this.getLocalFallbackSessions();
      const idx = list.findIndex((s) => s.id === session.id);
      if (idx >= 0) {
        list[idx] = session;
      } else {
        list.unshift(session);
      }
      localStorage.setItem('chronos_study_sessions', JSON.stringify(list));
    } catch (e) {
      console.warn('LocalStorage quota or error:', e);
    }
  }

  private deleteFromLocalFallback(id: string) {
    try {
      const list = this.getLocalFallbackSessions().filter((s) => s.id !== id);
      localStorage.setItem('chronos_study_sessions', JSON.stringify(list));
    } catch {}
  }
}

export const storageService = new StorageService();
