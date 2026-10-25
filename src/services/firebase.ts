/**
 * Firebase Realtime Database & Authentication Service
 * Connected to project: gen-lang-client-0079533925
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  set,
  get,
  remove,
  onValue,
  DatabaseReference,
} from 'firebase/database';
import { StudySession, UserSettings } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyAHlYr4erSpNAdPZALgTuDinl7PKzwK1Fw",
  authDomain: "gen-lang-client-0079533925.firebaseapp.com",
  databaseURL: "https://gen-lang-client-0079533925-default-rtdb.firebaseio.com",
  projectId: "gen-lang-client-0079533925",
  storageBucket: "gen-lang-client-0079533925.firebasestorage.app",
  messagingSenderId: "66925364916",
  appId: "1:66925364916:web:61fa295a62e85f1f6379e1"
};

// Initialize Firebase safely
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const rtdb = getDatabase(app);

export interface CloudSyncStatus {
  isConfigured: boolean;
  user: User | null;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  syncError: string | null;
  isOnline: boolean;
}

class FirebaseService {
  private statusListeners: Set<(status: CloudSyncStatus) => void> = new Set();
  private status: CloudSyncStatus = {
    isConfigured: true,
    user: null,
    isSyncing: false,
    lastSyncedAt: null,
    syncError: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.updateStatus({ isOnline: true, syncError: null });
      });
      window.addEventListener('offline', () => {
        this.updateStatus({ isOnline: false, syncError: 'Device is currently offline. Working locally.' });
      });

      onAuthStateChanged(auth, (user) => {
        this.updateStatus({ user, syncError: null });
      });
    }
  }

  public subscribeStatus(listener: (status: CloudSyncStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  private updateStatus(partial: Partial<CloudSyncStatus>) {
    this.status = { ...this.status, ...partial };
    this.statusListeners.forEach((fn) => fn(this.status));
  }

  /* ---------------- AUTHENTICATION ---------------- */

  async loginAnonymously(): Promise<User> {
    try {
      this.updateStatus({ isSyncing: true, syncError: null });
      const cred = await signInAnonymously(auth);
      this.updateStatus({ isSyncing: false, user: cred.user });
      return cred.user;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Anonymous authentication failed';
      this.updateStatus({ isSyncing: false, syncError: msg });
      throw err;
    }
  }

  async loginWithEmail(email: string, pass: string): Promise<User> {
    try {
      this.updateStatus({ isSyncing: true, syncError: null });
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      this.updateStatus({ isSyncing: false, user: cred.user });
      return cred.user;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Email sign-in failed';
      this.updateStatus({ isSyncing: false, syncError: msg });
      throw err;
    }
  }

  async registerWithEmail(email: string, pass: string): Promise<User> {
    try {
      this.updateStatus({ isSyncing: true, syncError: null });
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      this.updateStatus({ isSyncing: false, user: cred.user });
      return cred.user;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      this.updateStatus({ isSyncing: false, syncError: msg });
      throw err;
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(auth);
      this.updateStatus({ user: null, syncError: null });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign out failed';
      this.updateStatus({ syncError: msg });
      throw err;
    }
  }

  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /* ---------------- REALTIME DATABASE OPERATIONS ---------------- */

  async saveSessionToCloud(session: StudySession): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return false;

    try {
      this.updateStatus({ isSyncing: true, syncError: null });
      const sessionRef = ref(rtdb, `users/${user.uid}/sessions/${session.id}`);
      await set(sessionRef, session);
      this.updateStatus({ isSyncing: false, lastSyncedAt: Date.now() });
      return true;
    } catch (err: unknown) {
      console.warn('Firebase RTDB save error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to save session to cloud';
      this.updateStatus({ isSyncing: false, syncError: msg });
      return false;
    }
  }

  async deleteSessionFromCloud(sessionId: string): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return false;

    try {
      this.updateStatus({ isSyncing: true, syncError: null });
      const sessionRef = ref(rtdb, `users/${user.uid}/sessions/${sessionId}`);
      await remove(sessionRef);
      this.updateStatus({ isSyncing: false, lastSyncedAt: Date.now() });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete session from cloud';
      this.updateStatus({ isSyncing: false, syncError: msg });
      return false;
    }
  }

  async fetchSessionsFromCloud(): Promise<StudySession[] | null> {
    const user = auth.currentUser;
    if (!user) return null;

    try {
      this.updateStatus({ isSyncing: true, syncError: null });
      const sessionsRef = ref(rtdb, `users/${user.uid}/sessions`);
      const snapshot = await get(sessionsRef);

      this.updateStatus({ isSyncing: false, lastSyncedAt: Date.now() });

      if (snapshot.exists()) {
        const val = snapshot.val();
        const list: StudySession[] = Object.values(val);
        list.sort((a, b) => b.startTime - a.startTime);
        return list;
      }
      return [];
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch sessions from cloud';
      this.updateStatus({ isSyncing: false, syncError: msg });
      return null;
    }
  }

  async syncAllToCloud(sessions: StudySession[], settings?: UserSettings): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return false;

    try {
      this.updateStatus({ isSyncing: true, syncError: null });
      const sessionsMap: Record<string, StudySession> = {};
      sessions.forEach((s) => {
        sessionsMap[s.id] = s;
      });

      const userRef = ref(rtdb, `users/${user.uid}/sessions`);
      await set(userRef, sessionsMap);

      if (settings) {
        const settingsRef = ref(rtdb, `users/${user.uid}/settings`);
        await set(settingsRef, settings);
      }

      this.updateStatus({ isSyncing: false, lastSyncedAt: Date.now(), syncError: null });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to batch sync to cloud';
      this.updateStatus({ isSyncing: false, syncError: msg });
      return false;
    }
  }

  async saveSettingsToCloud(settings: UserSettings): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return false;

    try {
      const settingsRef = ref(rtdb, `users/${user.uid}/settings`);
      await set(settingsRef, settings);
      return true;
    } catch {
      return false;
    }
  }

  async fetchSettingsFromCloud(): Promise<UserSettings | null> {
    const user = auth.currentUser;
    if (!user) return null;

    try {
      const settingsRef = ref(rtdb, `users/${user.uid}/settings`);
      const snapshot = await get(settingsRef);
      if (snapshot.exists()) {
        return snapshot.val() as UserSettings;
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const firebaseService = new FirebaseService();
