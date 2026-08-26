import { Warehouse, Report, Task, User } from './types';

// Mock Users for Demo
export const demoUsers: User[] = [
  {
    id: 'demo-cleaner',
    name: 'Budi Santoso',
    email: 'budi@gudang.com',
    role: 'PETUGAS_KEBERSIHAN',
    password: 'password123',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150'
  },
  {
    id: 'demo-supervisor',
    name: 'Ahmad Subarjo, M.T.',
    email: 'ahmad@gudang.com',
    role: 'KEPALA_GUDANG',
    password: 'password123',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150'
  }
];

// 12 Warehouses (Gudang A - L)
export const initialWarehouses: Warehouse[] = [
  { id: 'A', name: 'Gudang A', status: 'KOTOR', area: 'Area Gudang A' },
  { id: 'B', name: 'Gudang B', status: 'KOTOR', area: 'Area Gudang B' },
  { id: 'C', name: 'Gudang C', status: 'KOTOR', area: 'Area Gudang C' },
  { id: 'D', name: 'Gudang D', status: 'KOTOR', area: 'Area Gudang D' },
  { id: 'E', name: 'Gudang E', status: 'KOTOR', area: 'Area Gudang E' },
  { id: 'F', name: 'Gudang F', status: 'KOTOR', area: 'Area Gudang F' },
  { id: 'G', name: 'Gudang G', status: 'KOTOR', area: 'Area Gudang G' },
  { id: 'H', name: 'Gudang H', status: 'KOTOR', area: 'Area Gudang H' },
  { id: 'I', name: 'Gudang I', status: 'KOTOR', area: 'Area Gudang I' },
  { id: 'J', name: 'Gudang J', status: 'KOTOR', area: 'Area Gudang J' },
  { id: 'K', name: 'Gudang K', status: 'KOTOR', area: 'Area Gudang K' },
  { id: 'L', name: 'Gudang L', status: 'KOTOR', area: 'Area Gudang L' },
];

// Predefined Photo Templates for easy simulation
export interface PhotoPreset {
  id: string;
  label: string;
  beforeUrl: string;
  afterUrl: string;
}

export const photoPresets: PhotoPreset[] = [
  {
    id: 'preset1',
    label: 'Lorong Rak Utama (Sapu & Pel)',
    beforeUrl: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&q=80&w=600', // Dusty/busy pallets
    afterUrl: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=600',  // Super clean aisles
  },
  {
    id: 'preset2',
    label: 'Area Palet Kardus (Rapikan Box)',
    beforeUrl: 'https://images.unsplash.com/photo-1531834685032-c34bf0d84c77?auto=format&fit=crop&q=80&w=600', // Unorganized boxes
    afterUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=600',  // Highly structured storage
  },
  {
    id: 'preset3',
    label: 'Kaca & Jendela Kantor Gudang',
    beforeUrl: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&q=80&w=600', // Dusty build site
    afterUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=600',  // Elegant corporate light
  },
  {
    id: 'preset4',
    label: 'Lantai Loading Dock (Bebas Oli)',
    beforeUrl: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&q=80&w=600', // Dirty floor
    afterUrl: 'https://images.unsplash.com/photo-1568241429808-153db7414436?auto=format&fit=crop&q=80&w=600',  // Clear polished space
  }
];

// Initial Reports
export const initialReports: Report[] = [];

// Initial Tasks Assigned
export const initialTasks: Task[] = [];

// Default System Configuration Settings
export const defaultSystemSettings = {
  id: 'main-settings',
  companyName: 'PT Logistik Prima Nusantara',
  systemName: 'GudangClean Management System',
  tagline: 'Layanan Pemeliharaan Kebersihan & Standardisasi Mutu Gudang Logistik Terpadu',
  auditorName: 'Ahmad Subarjo, M.T.',
  auditorTitle: 'Lead Logistics & Quality Auditor',
  auditorCompany: 'PT Inspeksi Mutu Nasional',
  auditorSignature: '',
  kepalaSignerName: 'Wahyu Andriansyah, S.T.',
  kepalaSignerTitle: 'Kepala Gudang & Fasilitas Terdaftar',
  kepalaSignerCompany: 'PT Logistik Prima Nusantara',
  kepalaSignature: '',
  cleanerSignerName: 'Budi Santoso & Tim Kebersihan',
  cleanerSignerTitle: 'Koordinator Pelaksana Bersih Area',
  cleanerSignerCompany: 'Divisi Fasilitas & Cleanliness',
  cleanerSignature: '',
  documentPrefix: 'GC-AUDIT',
  contactEmail: 'audit@gudangclean.com',
  contactPhone: '(021) 8092-1029',
  workShiftStart: '07:00',
  workShiftEnd: '16:00',
  allowAutoApprove: false,
  minCleanDurationMinutes: 30,
  emergencyAlertEnabled: true,
  notesFooter: 'Dokumen ini diterbitkan secara elektronik oleh Sistem Informasi Bersih Area (GudangClean SIBA) dan sah digunakan untuk keperluan audit mutu operasional.'
};
