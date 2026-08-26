export type UserRole = 'KEPALA_GUDANG' | 'PETUGAS_KEBERSIHAN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  password?: string;
}

export interface Report {
  id: string;
  cleanerName: string;
  cleanerEmail: string;
  warehouse: string; // "A" through "L"
  description: string;
  photoBefore: string; // base64 or URL
  photoAfter: string;  // base64 or URL
  timestamp: string;   // ISO string
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  feedback?: string;
}

export interface Task {
  id: string;
  warehouse: string; // "A" - "L"
  taskName: string;
  description: string;
  assignedToEmail: string;
  assignedToUserId?: string;
  assignedToName?: string;
  status: 'PENDING' | 'COMPLETED';
  date: string; // YYYY-MM-DD
}

export interface Warehouse {
  id: string; // "A" - "L"
  name: string; // "Gudang A"
  status: 'BERSIH' | 'KOTOR' | 'DALAM_PENGERJAAN';
  area: string; // e.g., "Area Logistik Utara", "Penyimpanan Elektronik"
  lastCleaned?: string; // ISO string
  lastCleanedBy?: string;
}

export interface Attendance {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  timestamp: string; // ISO string
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  photo: string; // base64 image
  location: string; // e.g. "Gudang A", "Gudang Utama"
  type: 'MASUK' | 'KELUAR'; // Check-in or Check-out
}

