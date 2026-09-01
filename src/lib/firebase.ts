import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs, 
  getDoc,
  writeBatch,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { initialWarehouses, demoUsers, defaultSystemSettings } from '../mockData';
import { User, Warehouse, Report, Task, Attendance, SystemSettings } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore targeting our custom Database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Sign in with Google helper
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

// ----------------------------------------------------
// Global Quota & Network Tracking State
// ----------------------------------------------------
let quotaExceededState = false;
const quotaListeners = new Set<(isExceeded: boolean) => void>();

export function isQuotaExceeded(): boolean {
  return quotaExceededState;
}

export function subscribeQuotaState(listener: (isExceeded: boolean) => void) {
  quotaListeners.add(listener);
  listener(quotaExceededState);
  return () => {
    quotaListeners.delete(listener);
  };
}

function setQuotaExceededState(val: boolean) {
  if (quotaExceededState !== val) {
    quotaExceededState = val;
    quotaListeners.forEach((fn) => fn(val));
  }
}

// ----------------------------------------------------
// Local Storage Persistence & Fallback Mirror Store
// ----------------------------------------------------
const LOCAL_STORAGE_PREFIX = 'gudang_store_';

function getStorageKey(collectionName: string): string {
  return `${LOCAL_STORAGE_PREFIX}${collectionName}`;
}

export function getLocalCollection<T>(collectionName: string, defaultData: T[] = []): T[] {
  try {
    const raw = localStorage.getItem(getStorageKey(collectionName));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as T[];
      }
    }
  } catch (e) {
    console.warn(`[LocalStore] Failed to read ${collectionName} from localStorage:`, e);
  }
  return defaultData;
}

export function setLocalCollection<T>(collectionName: string, data: T[]): void {
  try {
    localStorage.setItem(getStorageKey(collectionName), JSON.stringify(data));
    // Notify all active subscriptions in this window
    window.dispatchEvent(new CustomEvent('gudang_store_change', { detail: { collectionName } }));
  } catch (e) {
    console.warn(`[LocalStore] Failed to write ${collectionName} to localStorage:`, e);
  }
}

export function saveItemToLocalCollection<T extends { id?: string }>(collectionName: string, item: T): void {
  const itemId = item.id || 'default';
  const current = getLocalCollection<T>(collectionName, []);
  const index = current.findIndex((i) => (i.id || 'default') === itemId);
  let updated: T[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = item;
  } else {
    updated = [item, ...current];
  }
  setLocalCollection(collectionName, updated);
}

export function deleteItemFromLocalCollection(collectionName: string, id: string): void {
  const current = getLocalCollection<{ id: string }>(collectionName, []);
  const updated = current.filter((i) => i.id !== id);
  setLocalCollection(collectionName, updated);
}

// Ensure default fallback data exists in LocalStore on app boot
function initLocalStoreDefaults() {
  try {
    if (!localStorage.getItem(getStorageKey('warehouses'))) {
      localStorage.setItem(getStorageKey('warehouses'), JSON.stringify(initialWarehouses));
    }
    if (!localStorage.getItem(getStorageKey('users'))) {
      localStorage.setItem(getStorageKey('users'), JSON.stringify(demoUsers));
    }
    if (!localStorage.getItem(getStorageKey('systemSettings'))) {
      localStorage.setItem(getStorageKey('systemSettings'), JSON.stringify([defaultSystemSettings]));
    }
    if (!localStorage.getItem(getStorageKey('reports'))) {
      localStorage.setItem(getStorageKey('reports'), JSON.stringify([]));
    }
    if (!localStorage.getItem(getStorageKey('tasks'))) {
      localStorage.setItem(getStorageKey('tasks'), JSON.stringify([]));
    }
    if (!localStorage.getItem(getStorageKey('attendance'))) {
      localStorage.setItem(getStorageKey('attendance'), JSON.stringify([]));
    }
  } catch (e) {
    console.warn('[LocalStore] Storage initialization notice:', e);
  }
}
initLocalStoreDefaults();

// ----------------------------------------------------
// Cookie Helpers for session and remember me
// ----------------------------------------------------
export function setSessionCookie(userId: string) {
  document.cookie = `gudang_clean_session=${encodeURIComponent(userId)}; path=/; max-age=31536000; SameSite=Lax`;
  // Also store in localStorage for offline session recovery
  try {
    localStorage.setItem('gudang_active_session_id', userId);
  } catch {}
}

export function getSessionCookie(): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; gudang_clean_session=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '');
  try {
    return localStorage.getItem('gudang_active_session_id');
  } catch {
    return null;
  }
}

export function clearSessionCookie() {
  document.cookie = 'gudang_clean_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  try {
    localStorage.removeItem('gudang_active_session_id');
  } catch {}
}

export function setRememberedCredentials(email: string, password: string, name: string, role: string) {
  document.cookie = `gudang_clean_saved_email=${encodeURIComponent(email)}; path=/; max-age=31536000; SameSite=Lax`;
  document.cookie = `gudang_clean_saved_password=${encodeURIComponent(password)}; path=/; max-age=31536000; SameSite=Lax`;
  document.cookie = `gudang_clean_saved_name=${encodeURIComponent(name)}; path=/; max-age=31536000; SameSite=Lax`;
  document.cookie = `gudang_clean_saved_role=${encodeURIComponent(role)}; path=/; max-age=31536000; SameSite=Lax`;
  document.cookie = `gudang_clean_remember_me=true; path=/; max-age=31536000; SameSite=Lax`;
}

export function getRememberedCredentials() {
  const value = `; ${document.cookie}`;
  const getVal = (key: string) => {
    const parts = value.split(`; ${key}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '');
    return '';
  };
  return {
    email: getVal('gudang_clean_saved_email'),
    password: getVal('gudang_clean_saved_password'),
    name: getVal('gudang_clean_saved_name'),
    role: getVal('gudang_clean_saved_role'),
    rememberMe: getVal('gudang_clean_remember_me') === 'true'
  };
}

export function clearRememberedCredentials() {
  document.cookie = 'gudang_clean_saved_email=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'gudang_clean_saved_password=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'gudang_clean_saved_name=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'gudang_clean_saved_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'gudang_clean_remember_me=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

// ----------------------------------------------------
// Error Diagnostics Helper
// ----------------------------------------------------
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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (errMsg.includes('Quota limit exceeded') || errMsg.includes('resource-exhausted') || errMsg.includes('Quota exceeded')) {
    setQuotaExceededState(true);
  }
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.warn('Firestore Warning (Operating with local safe cache):', JSON.stringify(errInfo));
  return errInfo;
}

// Automatically Seed Initial Warehouses and Demo Users if Firestore collection is empty
export async function seedInitialDataIfEmpty() {
  try {
    const warehouseSnapshot = await getDocs(collection(db, 'warehouses'));
    if (warehouseSnapshot.empty) {
      const batch = writeBatch(db);
      initialWarehouses.forEach((w) => {
        const docRef = doc(db, 'warehouses', w.id);
        batch.set(docRef, w);
      });
      await batch.commit();
    }

    const usersSnapshot = await getDocs(collection(db, 'users'));
    if (usersSnapshot.empty) {
      const batch = writeBatch(db);
      demoUsers.forEach((u) => {
        const docRef = doc(db, 'users', u.id);
        batch.set(docRef, u);
      });
      await batch.commit();
    }

    const settingsSnapshot = await getDocs(collection(db, 'systemSettings'));
    if (settingsSnapshot.empty) {
      await setDoc(doc(db, 'systemSettings', 'main-settings'), defaultSystemSettings);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'warehouses_and_users');
  }
}

// ----------------------------------------------------
// Resilient Collection Subscription with Local Fallback
// ----------------------------------------------------
export function subscribeToCollection<T extends { id?: string }>(
  collectionName: string,
  onUpdate: (data: T[]) => void,
  sortField?: string,
  sortOrder: 'asc' | 'desc' = 'asc'
) {
  // Get initial default based on collection type
  let fallbackDefault: T[] = [];
  if (collectionName === 'warehouses') fallbackDefault = initialWarehouses as unknown as T[];
  if (collectionName === 'users') fallbackDefault = demoUsers as unknown as T[];
  if (collectionName === 'systemSettings') fallbackDefault = [defaultSystemSettings] as unknown as T[];

  // 1. Immediately emit cached data from LocalStore so there is 0ms blank screen
  const initialLocalData = getLocalCollection<T>(collectionName, fallbackDefault);
  onUpdate(initialLocalData);

  // 2. Setup listener for local store updates (fired whenever local writes occur)
  const handleLocalStoreChange = (e: Event) => {
    const customEvent = e as CustomEvent<{ collectionName: string }>;
    if (!customEvent.detail || customEvent.detail.collectionName === collectionName) {
      const freshData = getLocalCollection<T>(collectionName, fallbackDefault);
      onUpdate(freshData);
    }
  };
  window.addEventListener('gudang_store_change', handleLocalStoreChange);

  // 3. Attempt real-time Firestore sync
  let unsubscribeFirestore = () => {};
  try {
    let q = query(collection(db, collectionName));
    if (sortField) {
      q = query(collection(db, collectionName), orderBy(sortField, sortOrder));
    }
    unsubscribeFirestore = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const data: T[] = [];
          snapshot.forEach((docSnap) => {
            data.push({ ...docSnap.data() } as T);
          });
          // Update local cache
          setLocalCollection(collectionName, data);
          onUpdate(data);
        } else if (snapshot.metadata.fromCache && initialLocalData.length > 0) {
          onUpdate(initialLocalData);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, collectionName);
        // Fallback to local store
        const currentData = getLocalCollection<T>(collectionName, fallbackDefault);
        onUpdate(currentData);
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, collectionName);
  }

  return () => {
    window.removeEventListener('gudang_store_change', handleLocalStoreChange);
    try {
      unsubscribeFirestore();
    } catch {}
  };
}

// Helper to recursively clean objects and strip out undefined values before sending to Firestore
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => cleanForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

// ----------------------------------------------------
// Resilient Firestore CRUD Operations
// ----------------------------------------------------

export async function saveUserToFirestore(user: User) {
  // Always update local cache first
  saveItemToLocalCollection<User>('users', user);
  try {
    const cleaned = cleanForFirestore(user);
    await setDoc(doc(db, 'users', user.id), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.id}`);
  }
}

export async function deleteUserFromFirestore(id: string) {
  deleteItemFromLocalCollection('users', id);
  try {
    await deleteDoc(doc(db, 'users', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
  }
}

export async function getUserFromFirestore(id: string): Promise<User | null> {
  // Check local first
  const localUsers = getLocalCollection<User>('users', demoUsers);
  const foundLocal = localUsers.find((u) => u.id === id);
  if (foundLocal) return foundLocal;

  try {
    const docSnap = await getDoc(doc(db, 'users', id));
    if (docSnap.exists()) {
      const u = docSnap.data() as User;
      saveItemToLocalCollection<User>('users', u);
      return u;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${id}`);
  }
  return null;
}

export async function getUsersByEmailFromFirestore(email: string): Promise<User[]> {
  const normEmail = email.trim().toLowerCase();
  // Get from local store
  const localUsers = getLocalCollection<User>('users', demoUsers);
  const localMatches = localUsers.filter((u) => u.email.trim().toLowerCase() === normEmail);

  try {
    const q = query(collection(db, 'users'), where('email', '==', normEmail));
    const snap = await getDocs(q);
    const remoteUsers: User[] = [];
    snap.forEach((d) => {
      remoteUsers.push(d.data() as User);
    });

    if (remoteUsers.length > 0) {
      // Merge into local cache
      remoteUsers.forEach((u) => saveItemToLocalCollection<User>('users', u));
      return remoteUsers;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
  }

  // Return local matches (or demo user if matches)
  if (localMatches.length > 0) return localMatches;
  const demoMatch = demoUsers.filter((u) => u.email.toLowerCase() === normEmail);
  return demoMatch;
}

export async function saveWarehouseToFirestore(warehouse: Warehouse) {
  saveItemToLocalCollection<Warehouse>('warehouses', warehouse);
  try {
    const cleaned = cleanForFirestore(warehouse);
    await setDoc(doc(db, 'warehouses', warehouse.id), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `warehouses/${warehouse.id}`);
  }
}

export async function saveReportToFirestore(report: Report) {
  saveItemToLocalCollection<Report>('reports', report);
  try {
    const cleaned = cleanForFirestore(report);
    await setDoc(doc(db, 'reports', report.id), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `reports/${report.id}`);
  }
}

export async function deleteReportFromFirestore(id: string) {
  deleteItemFromLocalCollection('reports', id);
  try {
    await deleteDoc(doc(db, 'reports', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `reports/${id}`);
  }
}

export async function saveTaskToFirestore(task: Task) {
  saveItemToLocalCollection<Task>('tasks', task);
  try {
    const cleaned = cleanForFirestore(task);
    await setDoc(doc(db, 'tasks', task.id), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `tasks/${task.id}`);
  }
}

export async function deleteTaskFromFirestore(id: string) {
  deleteItemFromLocalCollection('tasks', id);
  try {
    await deleteDoc(doc(db, 'tasks', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
  }
}

export async function saveAttendanceToFirestore(attendance: Attendance) {
  saveItemToLocalCollection<Attendance>('attendance', attendance);
  try {
    const cleaned = cleanForFirestore(attendance);
    await setDoc(doc(db, 'attendance', attendance.id), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `attendance/${attendance.id}`);
  }
}

export async function deleteAttendanceFromFirestore(id: string) {
  deleteItemFromLocalCollection('attendance', id);
  try {
    await deleteDoc(doc(db, 'attendance', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `attendance/${id}`);
  }
}

// Session CRUD
export async function createSessionInFirestore(userId: string, user: User) {
  const session = {
    id: userId,
    user: cleanForFirestore(user),
    createdAt: new Date().toISOString()
  };
  saveItemToLocalCollection<{ id: string; user: User; createdAt: string }>('sessions', session);
  try {
    await setDoc(doc(db, 'sessions', userId), session);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `sessions/${userId}`);
  }
}

export async function getSessionFromFirestore(userId: string): Promise<User | null> {
  const localSessions = getLocalCollection<{ id: string; user: User }>('sessions', []);
  const found = localSessions.find((s) => s.id === userId);
  if (found && found.user) return found.user;

  try {
    const docSnap = await getDoc(doc(db, 'sessions', userId));
    if (docSnap.exists()) {
      return docSnap.data().user as User;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `sessions/${userId}`);
  }
  return null;
}

export async function deleteSessionFromFirestore(userId: string) {
  deleteItemFromLocalCollection('sessions', userId);
  try {
    await deleteDoc(doc(db, 'sessions', userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `sessions/${userId}`);
  }
}

// System Settings CRUD
export async function saveSystemSettingsToFirestore(settings: SystemSettings) {
  const id = settings.id || 'main-settings';
  saveItemToLocalCollection<SystemSettings>('systemSettings', { ...settings, id });
  try {
    const cleaned = cleanForFirestore(settings);
    await setDoc(doc(db, 'systemSettings', id), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `systemSettings/${id}`);
  }
}

export async function getSystemSettingsFromFirestore(): Promise<SystemSettings | null> {
  const localSettings = getLocalCollection<SystemSettings>('systemSettings', [defaultSystemSettings]);
  if (localSettings.length > 0) return localSettings[0];

  try {
    const docSnap = await getDoc(doc(db, 'systemSettings', 'main-settings'));
    if (docSnap.exists()) {
      return docSnap.data() as SystemSettings;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'systemSettings/main-settings');
  }
  return defaultSystemSettings;
}

// Clear all data and re-seed
export async function resetDatabaseToDefault() {
  // 1. Reset local stores
  setLocalCollection('warehouses', initialWarehouses);
  setLocalCollection('users', demoUsers);
  setLocalCollection('systemSettings', [defaultSystemSettings]);
  setLocalCollection('reports', []);
  setLocalCollection('tasks', []);
  setLocalCollection('attendance', []);

  // 2. Try Firestore batch reset if online
  try {
    const batch = writeBatch(db);

    const warehousesSnap = await getDocs(collection(db, 'warehouses'));
    warehousesSnap.forEach((d) => batch.delete(d.ref));

    const reportsSnap = await getDocs(collection(db, 'reports'));
    reportsSnap.forEach((d) => batch.delete(d.ref));

    const tasksSnap = await getDocs(collection(db, 'tasks'));
    tasksSnap.forEach((d) => batch.delete(d.ref));

    const usersSnap = await getDocs(collection(db, 'users'));
    usersSnap.forEach((d) => batch.delete(d.ref));

    const attendanceSnap = await getDocs(collection(db, 'attendance'));
    attendanceSnap.forEach((d) => batch.delete(d.ref));

    const settingsSnap = await getDocs(collection(db, 'systemSettings'));
    settingsSnap.forEach((d) => batch.delete(d.ref));

    await batch.commit();

    const seedBatch = writeBatch(db);
    initialWarehouses.forEach((w) => {
      const docRef = doc(db, 'warehouses', w.id);
      seedBatch.set(docRef, w);
    });

    demoUsers.forEach((u) => {
      const docRef = doc(db, 'users', u.id);
      seedBatch.set(docRef, u);
    });

    const settingsRef = doc(db, 'systemSettings', 'main-settings');
    seedBatch.set(settingsRef, defaultSystemSettings);

    await seedBatch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'batch_reset');
  }
}
