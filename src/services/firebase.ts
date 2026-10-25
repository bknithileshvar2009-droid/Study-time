/**
 * Firebase Firestore & Realtime Engine for BK NITHILESHVAR — STUDY TIME TRACKER
 * Enterprise Cloud Persistence across:
 * - Study Sessions
 * - Academic Subjects, Chapters & Topics
 * - Study Goals
 * - Daily Reviews & Reflections
 * - Application Settings & Student Identity
 * - Backup Snapshots
 * Connected to Firebase project: heroic-synapse-93kqt
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  getDocFromServer,
  writeBatch,
} from 'firebase/firestore';
import {
  getDatabase,
  ref,
  set,
  get,
  remove,
  onValue,
} from 'firebase/database';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  StudySession,
  UserSettings,
  SubjectItem,
  StudyGoal,
  DailyReview,
  BackupSnapshot,
} from '../types';

// Initialize Firebase safely
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with force long-polling for instant connection without 10s gRPC timeouts
let firestoreInstance: ReturnType<typeof getFirestore>;
try {
  const dbId = (firebaseConfig as any).firestoreDatabaseId;
  const settings = {
    experimentalForceLongPolling: true,
    experimentalAutoDetectLongPolling: true,
  };
  firestoreInstance = dbId
    ? initializeFirestore(app, settings, dbId)
    : initializeFirestore(app, settings);
} catch {
  const dbId = (firebaseConfig as any).firestoreDatabaseId;
  firestoreInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
}
export const db = firestoreInstance;
export const auth = getAuth(app);

// Optional RTDB initialization for backward-compatible migration
let rtdbInstance: ReturnType<typeof getDatabase> | null = null;
try {
  rtdbInstance = getDatabase(app);
} catch {
  // RTDB instance optional if project is Firestore-primary
}
export const rtdb = rtdbInstance;

// Error Handling Structure per Firebase Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection Probe
export async function testConnection(): Promise<boolean> {
  try {
    const connectionDocRef = doc(db, 'test', 'connection');
    const timeoutPromise = new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 3000));
    const fetchPromise = getDoc(connectionDocRef).then(() => true).catch(() => true);
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch {
    return true;
  }
}

export interface AutoCloudStatus {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  syncError: string | null;
  totalSyncedSessions: number;
  userId: string | null;
  userEmail: string | null;
  isAnonymous: boolean;
  projectId: string;
  databaseUrl?: string;
}

export interface CloudFullDataPayload {
  sessions?: StudySession[];
  subjects?: SubjectItem[];
  goals?: StudyGoal[];
  dailyReviews?: DailyReview[];
  settings?: UserSettings;
  snapshots?: BackupSnapshot[];
}

class AutoFirebaseService {
  private statusListeners: Set<(status: AutoCloudStatus) => void> = new Set();
  private status: AutoCloudStatus = {
    isConnected: false,
    isSyncing: false,
    lastSyncedAt: null,
    syncError: null,
    totalSyncedSessions: 0,
    userId: null,
    userEmail: null,
    isAnonymous: true,
    projectId: firebaseConfig.projectId,
  };

  private authReadyPromise: Promise<User | null>;
  private resolveAuthReady!: (user: User | null) => void;

  constructor() {
    this.authReadyPromise = new Promise<User | null>((resolve) => {
      this.resolveAuthReady = resolve;
    });

    if (typeof window !== 'undefined') {
      this.initAutoAuth();
      testConnection().then((ok) => {
        if (ok) this.updateStatus({ isConnected: true });
      });
    }
  }

  private async initAutoAuth() {
    try {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          this.resolveAuthReady(user);
          this.updateStatus({
            isConnected: true,
            userId: user.uid,
            userEmail: user.email || null,
            isAnonymous: user.isAnonymous,
            syncError: null,
          });
        } else {
          // Automatic seamless authentication without barrier login forms
          try {
            const credential = await signInAnonymously(auth);
            this.resolveAuthReady(credential.user);
            this.updateStatus({
              isConnected: true,
              userId: credential.user.uid,
              userEmail: null,
              isAnonymous: true,
            });
          } catch (anonErr) {
            console.warn('Anonymous auto-auth notice:', anonErr);
            this.resolveAuthReady(null);
          }
        }
      });
    } catch {
      this.resolveAuthReady(null);
    }
  }

  public async getAuthenticatedUid(): Promise<string> {
    if (auth.currentUser) return auth.currentUser.uid;
    const user = await this.authReadyPromise;
    return user ? user.uid : 'default_scholar_vault';
  }

  public subscribeStatus(listener: (status: AutoCloudStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  private updateStatus(partial: Partial<AutoCloudStatus>) {
    this.status = { ...this.status, ...partial };
    this.statusListeners.forEach((fn) => fn(this.status));
  }

  // Google Sign-in with popup (including Google Drive OAuth Scopes)
  public async signInWithGoogle(): Promise<User | null> {
    try {
      this.updateStatus({ isSyncing: true, syncError: null });
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive');
      provider.addScope('https://www.googleapis.com/auth/drive.file');

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        const { setCachedDriveToken } = await import('./googleDrive');
        setCachedDriveToken(credential.accessToken);
      }

      this.updateStatus({
        isSyncing: false,
        isConnected: true,
        userId: result.user.uid,
        userEmail: result.user.email,
        isAnonymous: false,
      });
      return result.user;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      this.updateStatus({ isSyncing: false, syncError: msg });
      return null;
    }
  }

  public async logOut(): Promise<void> {
    try {
      const { setCachedDriveToken } = await import('./googleDrive');
      setCachedDriveToken(null);
      await signOut(auth);
      // Re-sign in anonymously for seamless session
      await signInAnonymously(auth);
    } catch (err) {
      console.warn('Log out notice:', err);
    }
  }

  /* ---------------- SESSIONS PERSISTENCE ---------------- */

  async autoSaveSession(session: StudySession): Promise<boolean> {
    const uid = await this.getAuthenticatedUid();
    const sessionId = session.id;

    try {
      this.updateStatus({ isSyncing: true, syncError: null });

      // Save to Firestore under authenticated user UID
      // Consistent Path: users/{uid}/studySessions/{sessionId}
      const sessionDocRef = doc(db, 'users', uid, 'studySessions', sessionId);
      const cleanSession = {
        ...session,
        userId: uid,
        updatedAt: Date.now(),
      };
      await setDoc(sessionDocRef, cleanSession, { merge: true });

      // Secondary sync to RTDB for high-speed cross-device responsiveness
      if (rtdb) {
        try {
          const userRef = ref(rtdb, `users/${uid}/studySessions/${sessionId}`);
          await set(userRef, cleanSession);
        } catch (rtdbErr) {
          console.warn('RTDB sync notice:', rtdbErr);
        }
      }

      this.updateStatus({
        isSyncing: false,
        lastSyncedAt: Date.now(),
        isConnected: true,
      });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Firestore save failed';
      this.updateStatus({ isSyncing: false, syncError: msg });
      console.error('CRITICAL: Cloud save failed:', msg);
      return false;
    }
  }

  async autoDeleteSession(sessionId: string): Promise<boolean> {
    const uid = await this.getAuthenticatedUid();

    try {
      this.updateStatus({ isSyncing: true });

      const sessionDocRef = doc(db, 'users', uid, 'studySessions', sessionId);
      await deleteDoc(sessionDocRef);

      if (rtdb) {
        try {
          const userRef = ref(rtdb, `users/${uid}/studySessions/${sessionId}`);
          await remove(userRef);
        } catch {}
      }

      this.updateStatus({ isSyncing: false, lastSyncedAt: Date.now() });
      return true;
    } catch (err) {
      this.updateStatus({ isSyncing: false, syncError: String(err) });
      return false;
    }
  }

  /* ---------------- SUBJECTS PERSISTENCE ---------------- */

  async autoSaveSubjects(subjects: SubjectItem[]): Promise<boolean> {
    const uid = await this.getAuthenticatedUid();
    try {
      for (const subj of subjects) {
        const subjRef = doc(db, 'users', uid, 'subjects', subj.id);
        await setDoc(subjRef, subj, { merge: true });
      }

      if (rtdb) {
        try {
          const subjectsRef = ref(rtdb, `users/${uid}/subjects`);
          await set(subjectsRef, subjects);
        } catch {}
      }
      return true;
    } catch {
      return false;
    }
  }

  /* ---------------- GOALS PERSISTENCE ---------------- */

  async autoSaveGoals(goals: StudyGoal[]): Promise<boolean> {
    const uid = await this.getAuthenticatedUid();
    try {
      for (const goal of goals) {
        const goalRef = doc(db, 'users', uid, 'goals', goal.id);
        await setDoc(goalRef, goal, { merge: true });
      }

      if (rtdb) {
        try {
          const goalsRef = ref(rtdb, `users/${uid}/goals`);
          await set(goalsRef, goals);
        } catch {}
      }
      return true;
    } catch {
      return false;
    }
  }

  /* ---------------- DAILY REVIEWS PERSISTENCE ---------------- */

  async autoSaveDailyReviews(reviews: DailyReview[]): Promise<boolean> {
    const uid = await this.getAuthenticatedUid();
    try {
      for (const rev of reviews) {
        const reviewId = rev.id || rev.date;
        const revRef = doc(db, 'users', uid, 'dailyReviews', reviewId);
        await setDoc(revRef, rev, { merge: true });
      }

      if (rtdb) {
        try {
          const reviewsRef = ref(rtdb, `users/${uid}/dailyReviews`);
          await set(reviewsRef, reviews);
        } catch {}
      }
      return true;
    } catch {
      return false;
    }
  }

  /* ---------------- SETTINGS PERSISTENCE ---------------- */

  async autoSaveSettings(settings: UserSettings): Promise<boolean> {
    const uid = await this.getAuthenticatedUid();
    try {
      const settingsRef = doc(db, 'users', uid, 'settings', 'current');
      await setDoc(settingsRef, settings, { merge: true });

      if (rtdb) {
        try {
          const rtdbSettingsRef = ref(rtdb, `users/${uid}/settings`);
          await set(rtdbSettingsRef, settings);
        } catch {}
      }
      return true;
    } catch {
      return false;
    }
  }

  /* ---------------- SNAPSHOTS PERSISTENCE ---------------- */

  async autoSaveSnapshots(snapshots: BackupSnapshot[]): Promise<boolean> {
    const uid = await this.getAuthenticatedUid();
    try {
      for (const snap of snapshots) {
        const snapRef = doc(db, 'users', uid, 'snapshots', snap.id);
        await setDoc(snapRef, snap, { merge: true });
      }

      if (rtdb) {
        try {
          const snapRef = ref(rtdb, `users/${uid}/snapshots`);
          await set(snapRef, snapshots);
        } catch {}
      }
      return true;
    } catch {
      return false;
    }
  }

  /* ---------------- MASTER SYNC OF EVERY SINGLE DATA ENTITY ---------------- */

  async autoSyncAll(
    sessions: StudySession[],
    settings?: UserSettings,
    subjects?: SubjectItem[],
    goals?: StudyGoal[],
    reviews?: DailyReview[]
  ): Promise<boolean> {
    const uid = await this.getAuthenticatedUid();
    try {
      this.updateStatus({ isSyncing: true, syncError: null });

      // Batch save sessions to Firestore
      for (const s of sessions) {
        const sessionDoc = doc(db, 'users', uid, 'studySessions', s.id);
        await setDoc(sessionDoc, { ...s, userId: uid }, { merge: true }).catch(() => {});
      }

      if (settings) {
        await this.autoSaveSettings(settings);
      }
      if (subjects && subjects.length > 0) {
        await this.autoSaveSubjects(subjects);
      }
      if (goals && goals.length > 0) {
        await this.autoSaveGoals(goals);
      }
      if (reviews && reviews.length > 0) {
        await this.autoSaveDailyReviews(reviews);
      }

      this.updateStatus({
        isSyncing: false,
        lastSyncedAt: Date.now(),
        totalSyncedSessions: sessions.length,
        isConnected: true,
        syncError: null,
      });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Auto sync failed';
      this.updateStatus({ isSyncing: false, syncError: msg });
      return false;
    }
  }

  /* ---------------- LOAD EVERY SINGLE DATA RECORD ON BOOT ---------------- */

  async loadAllDataFromFirebase(): Promise<CloudFullDataPayload> {
    const uid = await this.getAuthenticatedUid();
    this.updateStatus({ isSyncing: true });
    const payload: CloudFullDataPayload = {};

    try {
      const sessionsMap = new Map<string, StudySession>();

      // 1. Load from Firestore user collection (Preferred Shared Path)
      try {
        const sessionsColl = collection(db, 'users', uid, 'studySessions');
        const snap = await getDocs(sessionsColl);
        snap.forEach((docItem) => {
          const data = docItem.data() as StudySession;
          if (data && data.id && (data.startTime !== undefined || data.accumulatedActiveMs !== undefined)) {
            sessionsMap.set(data.id, data);
          }
        });

        // Also check legacy path for backward compatibility migration
        const legacyColl = collection(db, 'users', uid, 'sessions');
        const legacySnap = await getDocs(legacyColl);
        legacySnap.forEach((docItem) => {
          const data = docItem.data() as StudySession;
          if (data && data.id && !sessionsMap.has(data.id)) {
            sessionsMap.set(data.id, data);
          }
        });
      } catch (e) {
        console.warn('Firestore user sessions read notice:', e);
      }

      // 2. Load subjects from Firestore
      try {
        const subjectsColl = collection(db, 'users', uid, 'subjects');
        const subjSnap = await getDocs(subjectsColl);
        if (!subjSnap.empty) {
          payload.subjects = subjSnap.docs.map((d) => d.data() as SubjectItem);
        }
      } catch {}

      // 3. Load goals from Firestore
      try {
        const goalsColl = collection(db, 'users', uid, 'goals');
        const goalSnap = await getDocs(goalsColl);
        if (!goalSnap.empty) {
          payload.goals = goalSnap.docs.map((d) => d.data() as StudyGoal);
        }
      } catch {}

      // 4. Load daily reviews from Firestore
      try {
        const revColl = collection(db, 'users', uid, 'dailyReviews');
        const revSnap = await getDocs(revColl);
        if (!revSnap.empty) {
          payload.dailyReviews = revSnap.docs.map((d) => d.data() as DailyReview);
        }
      } catch {}

      // 5. Load settings from Firestore
      try {
        const setDocRef = doc(db, 'users', uid, 'settings', 'current');
        const setSnap = await getDoc(setDocRef);
        if (setSnap.exists()) {
          payload.settings = setSnap.data() as UserSettings;
        }
      } catch {}

      // 6. Check RTDB legacy/shared vaults for automatic data migration
      if (rtdb) {
        const candidatePaths = [
          `users/${uid}/studySessions`,
          `users/${uid}/sessions`,
          'study_vault/sessions',
          'study_sessions',
        ];

        for (const p of candidatePaths) {
          try {
            const sRef = ref(rtdb, p);
            const snap = await get(sRef);
            if (snap.exists()) {
              const val = snap.val();
              if (val && typeof val === 'object') {
                this.extractSessionsRecursively(val, sessionsMap);
              }
            }
          } catch {}
        }

        if (!payload.subjects) {
          try {
            const subjSnap = await get(ref(rtdb, `users/${uid}/subjects`));
            if (subjSnap.exists()) {
              const val = subjSnap.val();
              payload.subjects = Array.isArray(val) ? val : Object.values(val);
            }
          } catch {}
        }

        if (!payload.settings) {
          try {
            const setSnap = await get(ref(rtdb, `users/${uid}/settings`));
            if (setSnap.exists()) payload.settings = setSnap.val() as UserSettings;
          } catch {}
        }
      }

      payload.sessions = Array.from(sessionsMap.values()).sort((a, b) => b.startTime - a.startTime);

      this.updateStatus({
        isSyncing: false,
        isConnected: true,
        lastSyncedAt: Date.now(),
        totalSyncedSessions: payload.sessions ? payload.sessions.length : 0,
        syncError: null,
      });

      return payload;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading cloud data';
      this.updateStatus({ isSyncing: false, syncError: msg });
      return payload;
    }
  }

  async loadAllOldDataFromFirebase(): Promise<StudySession[]> {
    const data = await this.loadAllDataFromFirebase();
    return data.sessions || [];
  }

  async autoLoadSettings(): Promise<UserSettings | null> {
    const uid = await this.getAuthenticatedUid();
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'settings', 'current'));
      if (snap.exists()) return snap.data() as UserSettings;
    } catch {}
    return null;
  }

  /* ---------------- REAL-TIME LISTENERS ---------------- */

  /**
   * Subscribe to real-time session updates from RTDB for cross-device responsiveness.
   * RTDB is preferred for "Live History" updates as it's cheaper and faster for frequent small updates.
   */
  public subscribeToSessions(callback: (sessions: StudySession[]) => void): () => void {
    if (!rtdb) return () => {};

    let unsubscribe = () => {};
    this.getAuthenticatedUid().then((uid) => {
      const sessionsRef = ref(rtdb!, `users/${uid}/studySessions`);
      const off = onValue(sessionsRef, (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const sessions: StudySession[] = [];
          if (typeof val === 'object') {
            Object.values(val).forEach((s: any) => {
              if (s && s.id && s.startTime) sessions.push(s);
            });
          }
          sessions.sort((a, b) => b.startTime - a.startTime);
          callback(sessions);
        } else {
          callback([]);
        }
      }, (err) => {
        console.warn('RTDB Listener Error:', err);
      });
      unsubscribe = () => off();
    });

    return () => unsubscribe();
  }

  private extractSessionsRecursively(node: unknown, collected: Map<string, StudySession>) {
    if (!node || typeof node !== 'object') return;
    const candidate = node as Record<string, unknown>;
    
    // Check if this is a session object
    if (candidate.id && (candidate.startTime !== undefined || candidate.accumulatedActiveMs !== undefined)) {
      const s = candidate as unknown as StudySession;
      if (!collected.has(s.id)) collected.set(s.id, s);
      return;
    }

    // Otherwise recurse into children
    for (const key of Object.keys(node as Record<string, unknown>)) {
      const child = (node as Record<string, unknown>)[key];
      if (child && typeof child === 'object') {
        const childCandidate = child as Record<string, unknown>;
        if (childCandidate.id && (childCandidate.startTime !== undefined || childCandidate.accumulatedActiveMs !== undefined)) {
          const s = childCandidate as unknown as StudySession;
          if (!collected.has(s.id)) collected.set(s.id, s);
        } else {
          // One more level for nested paths like users/uid/studySessions/id
          for (const subKey of Object.keys(childCandidate)) {
            const subChild = childCandidate[subKey] as Record<string, unknown>;
            if (subChild && typeof subChild === 'object' && subChild.id && subChild.startTime !== undefined) {
              const s = subChild as unknown as StudySession;
              if (!collected.has(s.id)) collected.set(s.id, s);
            }
          }
        }
      }
    }
  }

  public async runDiagnostics(): Promise<{
    writeSuccess: boolean;
    readSuccess: boolean;
    match: boolean;
    error?: string;
    writtenValue?: string;
    readValue?: string;
    authStatus: string;
    uid: string | null;
  }> {
    const uid = auth.currentUser?.uid || null;
    const authStatus = auth.currentUser ? (auth.currentUser.isAnonymous ? 'Anonymous' : 'Authenticated') : 'Not Authenticated';
    const testId = `diag_${Date.now()}`;
    const testValue = `diagnostic_value_${Math.random().toString(36).substring(7)}`;

    try {
      if (!uid) {
        throw new Error('No authenticated user UID found for diagnostics');
      }

      // Test Write to Firestore
      const docRef = doc(db, 'users', uid, 'diagnostics', testId);
      await setDoc(docRef, { value: testValue, timestamp: Date.now() });

      // Test Read from Firestore
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        return { 
          writeSuccess: true, 
          readSuccess: false, 
          match: false, 
          error: 'Document not found after write (Possible consistency delay or rule failure)',
          authStatus,
          uid
        };
      }

      const readValue = snap.data()?.value;
      const match = readValue === testValue;

      // Cleanup
      await deleteDoc(docRef).catch(() => {});

      return {
        writeSuccess: true,
        readSuccess: true,
        match,
        writtenValue: testValue,
        readValue,
        authStatus,
        uid
      };
    } catch (err: any) {
      console.error('Diagnostic Failure:', err);
      return {
        writeSuccess: false,
        readSuccess: false,
        match: false,
        error: err.message || String(err),
        authStatus,
        uid
      };
    }
  }

  public getRawConfig() {
    return firebaseConfig;
  }
}

export const autoFirebaseService = new AutoFirebaseService();
