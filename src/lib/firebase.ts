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

// Initialize Firebase
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

// Cookie Helpers for session and remember me
export function setSessionCookie(userId: string) {
  document.cookie = `gudang_clean_session=${encodeURIComponent(userId)}; path=/; max-age=31536000; SameSite=Lax`;
}

export function getSessionCookie(): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; gudang_clean_session=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '');
  return null;
}

export function clearSessionCookie() {
  document.cookie = 'gudang_clean_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
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

// Generic helper to subscribe to a collection in real-time
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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  return errInfo;
}

// Automatically Seed Initial Warehouses and Demo Users if Firestore collection is empty
export async function seedInitialDataIfEmpty() {
  try {
    const warehouseSnapshot = await getDocs(collection(db, 'warehouses'));
    if (warehouseSnapshot.empty) {
      console.log('Seeding initial warehouses...');
      const batch = writeBatch(db);
      initialWarehouses.forEach((w) => {
        const docRef = doc(db, 'warehouses', w.id);
        batch.set(docRef, w);
      });
      await batch.commit();
      console.log('Successfully seeded initial warehouses into Firestore');
    }

    const usersSnapshot = await getDocs(collection(db, 'users'));
    if (usersSnapshot.empty) {
      console.log('Seeding demo users...');
      const batch = writeBatch(db);
      demoUsers.forEach((u) => {
        const docRef = doc(db, 'users', u.id);
        batch.set(docRef, u);
      });
      await batch.commit();
      console.log('Successfully seeded demo users into Firestore');
    }

    const settingsSnapshot = await getDocs(collection(db, 'systemSettings'));
    if (settingsSnapshot.empty) {
      console.log('Seeding default system settings...');
      await setDoc(doc(db, 'systemSettings', 'main-settings'), defaultSystemSettings);
      console.log('Successfully seeded default system settings into Firestore');
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'warehouses_and_users');
    console.error('Error seeding initial data:', error);
  }
}

// Generic helper to subscribe to a collection in real-time
export function subscribeToCollection<T>(
  collectionName: string,
  onUpdate: (data: T[]) => void,
  sortField?: string,
  sortOrder: 'asc' | 'desc' = 'asc'
) {
  let q = query(collection(db, collectionName));
  if (sortField) {
    q = query(collection(db, collectionName), orderBy(sortField, sortOrder));
  }
  return onSnapshot(q, (snapshot) => {
    const data: T[] = [];
    snapshot.forEach((docSnap) => {
      data.push({ ...docSnap.data() } as T);
    });
    onUpdate(data);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, collectionName);
    console.error(`Error subscribing to ${collectionName}:`, err);
  });
}

// Firestore CRUD operations
export async function saveUserToFirestore(user: User) {
  try {
    await setDoc(doc(db, 'users', user.id), user);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.id}`);
    throw error;
  }
}

export async function deleteUserFromFirestore(id: string) {
  try {
    await deleteDoc(doc(db, 'users', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
    throw error;
  }
}

export async function getUserFromFirestore(id: string): Promise<User | null> {
  try {
    const docSnap = await getDoc(doc(db, 'users', id));
    if (docSnap.exists()) {
      return docSnap.data() as User;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${id}`);
    return null;
  }
}

export async function getUsersByEmailFromFirestore(email: string): Promise<User[]> {
  try {
    const q = query(collection(db, 'users'), where('email', '==', email.trim().toLowerCase()));
    const snap = await getDocs(q);
    const users: User[] = [];
    snap.forEach((doc) => {
      users.push(doc.data() as User);
    });
    return users;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
    return [];
  }
}

export async function saveWarehouseToFirestore(warehouse: Warehouse) {
  try {
    await setDoc(doc(db, 'warehouses', warehouse.id), warehouse);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `warehouses/${warehouse.id}`);
    throw error;
  }
}

export async function saveReportToFirestore(report: Report) {
  try {
    await setDoc(doc(db, 'reports', report.id), report);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `reports/${report.id}`);
    throw error;
  }
}

export async function deleteReportFromFirestore(id: string) {
  try {
    await deleteDoc(doc(db, 'reports', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `reports/${id}`);
    throw error;
  }
}

export async function saveTaskToFirestore(task: Task) {
  try {
    await setDoc(doc(db, 'tasks', task.id), task);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `tasks/${task.id}`);
    throw error;
  }
}

export async function deleteTaskFromFirestore(id: string) {
  try {
    await deleteDoc(doc(db, 'tasks', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
    throw error;
  }
}

export async function saveAttendanceToFirestore(attendance: Attendance) {
  try {
    await setDoc(doc(db, 'attendance', attendance.id), attendance);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `attendance/${attendance.id}`);
    throw error;
  }
}

export async function deleteAttendanceFromFirestore(id: string) {
  try {
    await deleteDoc(doc(db, 'attendance', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `attendance/${id}`);
    throw error;
  }
}

// Session CRUD
export async function createSessionInFirestore(userId: string, user: User) {
  try {
    const session = {
      id: userId,
      user,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'sessions', userId), session);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `sessions/${userId}`);
    throw error;
  }
}

export async function getSessionFromFirestore(userId: string): Promise<User | null> {
  try {
    const docSnap = await getDoc(doc(db, 'sessions', userId));
    if (docSnap.exists()) {
      return docSnap.data().user as User;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `sessions/${userId}`);
    return null;
  }
}

export async function deleteSessionFromFirestore(userId: string) {
  try {
    await deleteDoc(doc(db, 'sessions', userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `sessions/${userId}`);
  }
}

// System Settings CRUD
export async function saveSystemSettingsToFirestore(settings: SystemSettings) {
  try {
    const id = settings.id || 'main-settings';
    await setDoc(doc(db, 'systemSettings', id), settings);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `systemSettings/${settings.id || 'main-settings'}`);
    throw error;
  }
}

export async function getSystemSettingsFromFirestore(): Promise<SystemSettings | null> {
  try {
    const docSnap = await getDoc(doc(db, 'systemSettings', 'main-settings'));
    if (docSnap.exists()) {
      return docSnap.data() as SystemSettings;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'systemSettings/main-settings');
    return null;
  }
}

// Clear all data and re-seed
export async function resetDatabaseToDefault() {
  try {
    const batch = writeBatch(db);

    // 1. Delete all current warehouses, reports, tasks, users, attendance, settings
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

    // 2. Re-seed warehouses, users, settings
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
    throw error;
  }
}
