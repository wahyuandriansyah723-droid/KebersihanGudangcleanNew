import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle, Info, LogOut, RefreshCw, Sparkles, UserCheck, AlertTriangle } from 'lucide-react';
import { User, Report, Task, Warehouse, Attendance, SystemSettings } from './types';
import { defaultSystemSettings } from './mockData';
import Login from './components/Login';
import Navbar from './components/Navbar';
import DashboardPetugas from './components/DashboardPetugas';
import DashboardKepala from './components/DashboardKepala';
import CreateReportModal from './components/CreateReportModal';
import {
  seedInitialDataIfEmpty,
  subscribeToCollection,
  saveUserToFirestore,
  deleteUserFromFirestore,
  saveWarehouseToFirestore,
  saveReportToFirestore,
  deleteReportFromFirestore,
  saveTaskToFirestore,
  deleteTaskFromFirestore,
  saveAttendanceToFirestore,
  deleteAttendanceFromFirestore,
  saveSystemSettingsToFirestore,
  createSessionInFirestore,
  getSessionFromFirestore,
  deleteSessionFromFirestore,
  setSessionCookie,
  getSessionCookie,
  clearSessionCookie,
  resetDatabaseToDefault
} from './lib/firebase';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Core App Databases (Synced with Firestore in real-time)
  const [reports, setReports] = useState<Report[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(defaultSystemSettings);

  // UI Control State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [preselectedWarehouse, setPreselectedWarehouse] = useState<string | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const lastRolloverDateRef = useRef<string>('');

  useEffect(() => {
    const initAndSubscribe = async () => {
      // 1. Initial Seeding of database (only seeds if warehouses collection is empty)
      await seedInitialDataIfEmpty();

      // 2. Load active session if any
      const sessionId = getSessionCookie();
      if (sessionId) {
        try {
          const user = await getSessionFromFirestore(sessionId);
          if (user) {
            setCurrentUser(user);
          } else {
            clearSessionCookie();
          }
        } catch (e) {
          console.error("Failed to fetch session from Firestore:", e);
        }
      }
      setLoadingSession(false);
    };

    initAndSubscribe();

    // 3. Subscriptions to collections for real-time updates
    const unsubWarehouses = subscribeToCollection<Warehouse>('warehouses', (data) => {
      // Sort warehouses by id (A-L)
      setWarehouses(data.sort((a, b) => a.id.localeCompare(b.id)));
    });

    const unsubReports = subscribeToCollection<Report>('reports', (data) => {
      // Sort reports by timestamp descending
      setReports(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    });

    const unsubTasks = subscribeToCollection<Task>('tasks', (data) => {
      // Sort tasks by date or ID descending
      setTasks(data.sort((a, b) => b.id.localeCompare(a.id)));
    });

    const unsubUsers = subscribeToCollection<User>('users', (data) => {
      setUsers(data);
    });

    const unsubAttendance = subscribeToCollection<Attendance>('attendance', (data) => {
      setAttendanceList(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    });

    const unsubSettings = subscribeToCollection<SystemSettings>('systemSettings', (data) => {
      if (data && data.length > 0) {
        setSystemSettings(data[0]);
      }
    });

    return () => {
      unsubWarehouses();
      unsubReports();
      unsubTasks();
      unsubUsers();
      unsubAttendance();
      unsubSettings();
    };
  }, []);

  // Daily Automatic Warehouse Status Refresh:
  // Every change of day (new date), all 12 warehouse area statuses automatically refresh to 'KOTOR'
  // if no cleaning report has been made for that warehouse on the new day.
  // Historical data from previous days is permanently preserved.
  useEffect(() => {
    if (warehouses.length === 0) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayDateStr = `${year}-${month}-${day}`;

    // Only run this check once per date per session to avoid excess writes
    if (lastRolloverDateRef.current === todayDateStr) {
      return;
    }
    lastRolloverDateRef.current = todayDateStr;

    // Warehouses that have already been reported clean TODAY
    const cleanedTodayWhIds = new Set(
      reports
        .filter(r => {
          if (!r.timestamp) return false;
          const rDate = new Date(r.timestamp);
          const rY = rDate.getFullYear();
          const rM = String(rDate.getMonth() + 1).padStart(2, '0');
          const rD = String(rDate.getDate()).padStart(2, '0');
          return `${rY}-${rM}-${rD}` === todayDateStr && (r.status === 'APPROVED' || r.status === 'PENDING');
        })
        .map(r => r.warehouse)
    );

    const dirtyUpdates = warehouses.filter(wh => {
      let isCleanedToday = false;
      if (wh.lastCleaned) {
        const lcDate = new Date(wh.lastCleaned);
        const lcY = lcDate.getFullYear();
        const lcM = String(lcDate.getMonth() + 1).padStart(2, '0');
        const lcD = String(lcDate.getDate()).padStart(2, '0');
        isCleanedToday = `${lcY}-${lcM}-${lcD}` === todayDateStr;
      }
      const hasTodayReport = cleanedTodayWhIds.has(wh.id);
      return (wh.status === 'BERSIH' || wh.status === 'DALAM_PENGERJAAN') && !isCleanedToday && !hasTodayReport;
    });

    if (dirtyUpdates.length > 0) {
      dirtyUpdates.forEach((wh) => {
        saveWarehouseToFirestore({
          ...wh,
          status: 'KOTOR'
        }).catch((e) => console.warn(`Notice auto-refreshing warehouse ${wh.id}:`, e));
      });
    }
  }, [warehouses.length, reports.length]);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleLogin = async (user: User) => {
    try {
      // Register user in Firestore users list
      await saveUserToFirestore(user);
      // Create session in Firestore
      const sessionId = 'sess-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      await createSessionInFirestore(sessionId, user);
      // Save session in cookie
      setSessionCookie(sessionId);
      setCurrentUser(user);
      showToast(`Selamat datang, ${user.name}! Masuk sebagai ${user.role === 'KEPALA_GUDANG' ? 'Kepala Gudang' : 'Petugas Kebersihan'}.`, 'success');
    } catch (err) {
      console.error("Failed to login", err);
      showToast("Gagal melakukan login. Silakan coba lagi.", "error");
    }
  };

  const handleLogout = async () => {
    const sessionId = getSessionCookie();
    if (sessionId) {
      try {
        await deleteSessionFromFirestore(sessionId);
      } catch (e) {
        console.error("Failed to delete session on logout:", e);
      }
    }
    clearSessionCookie();
    setCurrentUser(null);
    showToast('Anda telah keluar dari sistem.', 'info');
  };

  // Reset databases to original values
  const handleResetDemoData = () => {
    setConfirmDialog({
      title: 'Setel Ulang Data',
      message: 'Apakah Anda ingin menyetel ulang seluruh data ke kondisi awal? Seluruh perubahan laporan dan petugas baru akan dihapus.',
      onConfirm: async () => {
        try {
          await resetDatabaseToDefault();
          showToast('Data demo berhasil disetel ulang di Firestore.', 'success');
        } catch (err) {
          console.error("Failed to reset database to default:", err);
          showToast('Gagal menyetel ulang database.', 'error');
        }
        setConfirmDialog(null);
      }
    });
  };

  // Cleaner submitting a report
  const handleAddReport = async (reportData: {
    warehouse: string;
    description: string;
    photoBefore: string;
    photoAfter: string;
    date?: string;
    time?: string;
  }) => {
    if (!currentUser) return;

    try {
      const customDate = new Date();

      if (reportData.date) {
        const [year, month, day] = reportData.date.split('-').map(Number);
        if (year && month && day) {
          customDate.setFullYear(year, month - 1, day);
        }
      }

      if (reportData.time) {
        const [hours, minutes] = reportData.time.split(':').map(Number);
        if (!isNaN(hours) && !isNaN(minutes)) {
          customDate.setHours(hours, minutes, 0, 0);
        }
      }

      const reportTimestamp = customDate.toISOString();

      const newReport: Report = {
        id: 'rep-' + Date.now(),
        cleanerName: currentUser.name,
        cleanerEmail: currentUser.email,
        warehouse: reportData.warehouse,
        description: reportData.description || "",
        photoBefore: reportData.photoBefore || "",
        photoAfter: reportData.photoAfter || "",
        timestamp: reportTimestamp,
        status: 'PENDING'
      };

      // 1. Save Report
      await saveReportToFirestore(newReport);

      // 2. Update warehouse status to 'BERSIH' and record last cleaned details
      const wh = warehouses.find(w => w.id === reportData.warehouse);
      if (wh) {
        await saveWarehouseToFirestore({
          ...wh,
          status: 'BERSIH',
          lastCleaned: reportTimestamp,
          lastCleanedBy: currentUser.name
        });
      }

      // 3. Mark matching tasks as COMPLETED
      const matchingTasks = tasks.filter(t => {
        const matchesWarehouse = t.warehouse === reportData.warehouse;
        const curId = (currentUser.id || '').trim().toLowerCase();
        const curEmail = (currentUser.email || '').trim().toLowerCase();
        const curName = (currentUser.name || '').trim().toLowerCase();

        const tUserId = (t.assignedToUserId || '').trim().toLowerCase();
        const tEmail = (t.assignedToEmail || '').trim().toLowerCase();
        const tName = (t.assignedToName || '').trim().toLowerCase();

        const isAssignedToMe = 
          (tUserId && curId && tUserId === curId) ||
          (tEmail && curEmail && tEmail === curEmail) ||
          (tName && curName && tName === curName);

        return matchesWarehouse && isAssignedToMe && t.status === 'PENDING';
      });
      for (const t of matchingTasks) {
        await saveTaskToFirestore({
          ...t,
          status: 'COMPLETED'
        });
      }

      showToast(`Laporan kebersihan Gudang ${reportData.warehouse} berhasil dikirim ke Kepala Gudang untuk diverifikasi!`, 'success');
    } catch (err) {
      console.error("Failed to submit report to Firestore", err);
      showToast("Gagal mengirim laporan.", "error");
    }
  };

  // Supervisor Approving a Report
  const handleApproveReport = async (reportId: string, feedback?: string) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    try {
      // 1. Update report status to APPROVED
      await saveReportToFirestore({
        ...report,
        status: 'APPROVED',
        feedback: feedback || 'Laporan disetujui. Area bersih!'
      });

      // 2. Mark warehouse as BERSIH
      const wh = warehouses.find(w => w.id === report.warehouse);
      if (wh) {
        await saveWarehouseToFirestore({
          ...wh,
          status: 'BERSIH',
          lastCleaned: new Date().toISOString(),
          lastCleanedBy: report.cleanerName
        });
      }

      showToast(`Laporan petugas ${report.cleanerName} untuk Gudang ${report.warehouse} telah DISETUJUI.`, 'success');
    } catch (err) {
      console.error("Failed to approve report", err);
      showToast("Gagal menyetujui laporan.", "error");
    }
  };

  // Supervisor Rejecting a Report
  const handleRejectReport = async (reportId: string, feedback?: string) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    try {
      // 1. Reject report with feedback
      await saveReportToFirestore({
        ...report,
        status: 'REJECTED',
        feedback: feedback || 'Mohon dibersihkan kembali secara menyeluruh.'
      });

      // 2. Mark warehouse back to KOTOR
      const wh = warehouses.find(w => w.id === report.warehouse);
      if (wh) {
        await saveWarehouseToFirestore({
          ...wh,
          status: 'KOTOR'
        });
      }

      // 3. Mark tasks back to PENDING for re-cleaning
      const matchingTasks = tasks.filter(t => t.warehouse === report.warehouse);
      for (const t of matchingTasks) {
        await saveTaskToFirestore({
          ...t,
          status: 'PENDING'
        });
      }

      showToast(`Laporan Gudang ${report.warehouse} DITOLAK. Petugas akan diminta membersihkan ulang.`, 'info');
    } catch (err) {
      console.error("Failed to reject report", err);
      showToast("Gagal menolak laporan.", "error");
    }
  };

  const handleUpdateWarehouseStatus = async (id: string, status: Warehouse['status'], lastCleanedBy?: string) => {
    try {
      const wh = warehouses.find(w => w.id === id);
      if (wh) {
        await saveWarehouseToFirestore({
          ...wh,
          status,
          lastCleaned: status === 'BERSIH' ? new Date().toISOString() : wh.lastCleaned,
          lastCleanedBy: status === 'BERSIH' ? (lastCleanedBy || currentUser?.name || 'Sistem') : wh.lastCleanedBy
        });
      }

      const statusLabel = status === 'BERSIH' ? 'Bersih ✨' : status === 'DALAM_PENGERJAAN' ? 'Dalam Pengerjaan ⏳' : 'Kotor 🧹';
      showToast(`Status Gudang ${id} diubah menjadi ${statusLabel}.`, 'success');
    } catch (err) {
      console.error("Failed to update warehouse status", err);
      showToast("Gagal memperbarui status gudang.", "error");
    }
  };

  const handleAddTask = async (taskData: {
    warehouse: string;
    taskName: string;
    description: string;
    assignedToEmail: string;
    assignedToUserId?: string;
    assignedToName?: string;
  }) => {
    try {
      const newTask: Task = {
        id: 'task-' + Date.now(),
        warehouse: taskData.warehouse,
        taskName: taskData.taskName,
        description: taskData.description || "",
        assignedToEmail: taskData.assignedToEmail,
        assignedToUserId: taskData.assignedToUserId,
        assignedToName: taskData.assignedToName,
        status: 'PENDING',
        date: new Date().toISOString().split('T')[0]
      };

      // 1. Save task
      await saveTaskToFirestore(newTask);

      // 2. Set warehouse status to 'KOTOR' if it is currently 'BERSIH'
      const wh = warehouses.find(w => w.id === taskData.warehouse);
      if (wh && wh.status === 'BERSIH') {
        await saveWarehouseToFirestore({
          ...wh,
          status: 'KOTOR'
        });
      }

      const cleanerName = taskData.assignedToName || taskData.assignedToEmail;

      showToast(`Pesan penugasan berhasil dikirim kepada ${cleanerName} untuk membersihkan Gudang ${taskData.warehouse}!`, 'success');
    } catch (err) {
      console.error("Failed to add task", err);
      showToast("Gagal menambahkan penugasan.", "error");
    }
  };

  const handleDeleteTask = (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;

    setConfirmDialog({
      title: 'Hapus Tugas Aktif',
      message: `Apakah Anda yakin ingin menghapus tugas "${taskToDelete.taskName}" untuk Gudang ${taskToDelete.warehouse}?`,
      onConfirm: async () => {
        try {
          await deleteTaskFromFirestore(taskId);
          showToast('Tugas penugasan telah berhasil dihapus.', 'info');
        } catch (err) {
          console.error("Failed to delete task", err);
          showToast("Gagal menghapus tugas.", "error");
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleUpdateUser = async (userId: string, updates: { name?: string; avatarUrl?: string }) => {
    const userToUpdate = users.find(u => u.id === userId);
    if (!userToUpdate) return;
    const trimmedName = updates.name !== undefined ? updates.name.trim() : userToUpdate.name;
    if (!trimmedName) {
      showToast("Nama petugas tidak boleh kosong.", "error");
      return;
    }

    try {
      const oldName = userToUpdate.name;
      const updatedUser: User = {
        ...userToUpdate,
        name: trimmedName,
        avatarUrl: updates.avatarUrl !== undefined ? updates.avatarUrl : userToUpdate.avatarUrl
      };

      // 1. Update user in Firestore
      await saveUserToFirestore(updatedUser);

      // 2. Update active session user if modifying current user
      if (currentUser && currentUser.id === userId) {
        setCurrentUser(updatedUser);
      }

      // 3. If name changed, synchronize in tasks, reports, and attendance records
      if (trimmedName !== oldName) {
        const matchingTasks = tasks.filter(t => t.assignedToUserId === userId || t.assignedToEmail === userToUpdate.email);
        for (const task of matchingTasks) {
          if (task.assignedToName !== trimmedName) {
            await saveTaskToFirestore({
              ...task,
              assignedToName: trimmedName
            });
          }
        }

        const matchingReports = reports.filter(r => r.cleanerEmail === userToUpdate.email);
        for (const rep of matchingReports) {
          if (rep.cleanerName !== trimmedName) {
            await saveReportToFirestore({
              ...rep,
              cleanerName: trimmedName
            });
          }
        }

        const matchingAttendance = attendanceList.filter(a => a.userId === userId || a.userEmail === userToUpdate.email);
        for (const att of matchingAttendance) {
          if (att.userName !== trimmedName) {
            await saveAttendanceToFirestore({
              ...att,
              userName: trimmedName
            });
          }
        }
      }

      showToast(`Profil petugas "${trimmedName}" berhasil diperbarui.`, 'success');
    } catch (err) {
      console.error("Failed to update user profile:", err);
      showToast("Gagal memperbarui profil petugas.", "error");
      throw err;
    }
  };

  const handleDeleteUser = (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;

    setConfirmDialog({
      title: 'Hapus Petugas Gudang',
      message: `Apakah Anda yakin ingin menghapus petugas ${userToDelete.name}? Akun petugas tidak akan dapat digunakan lagi untuk login.`,
      onConfirm: async () => {
        try {
          await deleteUserFromFirestore(userId);

          // Clear active session if they deleted themselves
          if (currentUser && currentUser.id === userId) {
            const sessionId = getSessionCookie();
            if (sessionId) {
              await deleteSessionFromFirestore(sessionId);
            }
            clearSessionCookie();
            setCurrentUser(null);
            showToast('Akun Anda telah dihapus. Sesi login dihentikan.', 'info');
          } else {
            showToast(`Petugas ${userToDelete.name} berhasil dihapus dari sistem.`, 'success');
          }
        } catch (err) {
          console.error("Failed to delete user", err);
          showToast("Gagal menghapus petugas.", "error");
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleDeleteReport = (reportId: string) => {
    const reportToDelete = reports.find(r => r.id === reportId);
    if (!reportToDelete) return;

    setConfirmDialog({
      title: 'Hapus Laporan Kebersihan',
      message: `Apakah Anda yakin ingin menghapus laporan kebersihan Gudang ${reportToDelete.warehouse} yang dibuat oleh ${reportToDelete.cleanerName}?`,
      onConfirm: async () => {
        try {
          await deleteReportFromFirestore(reportId);
          showToast(`Laporan Gudang ${reportToDelete.warehouse} berhasil dihapus.`, 'success');
        } catch (err) {
          console.error("Failed to delete report", err);
          showToast("Gagal menghapus laporan.", "error");
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleSaveAttendance = async (attendanceData: {
    photo: string;
    location: string;
    type: 'MASUK' | 'KELUAR';
    customUserName?: string;
    customUserEmail?: string;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    address?: string;
    mapUrl?: string;
  }) => {
    if (!currentUser) return;
    try {
      const now = new Date();
      // Date in YYYY-MM-DD
      const dateStr = now.toISOString().split('T')[0];
      // Time in HH:MM:SS
      const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });

      const googleMapsLink = (attendanceData.latitude !== undefined && attendanceData.longitude !== undefined)
        ? `https://www.google.com/maps?q=${attendanceData.latitude},${attendanceData.longitude}`
        : (attendanceData.mapUrl || '');
      
      const newAttendance: Attendance = {
        id: 'att-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
        userId: currentUser.id,
        userName: (attendanceData.customUserName || currentUser.name).trim(),
        userEmail: (attendanceData.customUserEmail || currentUser.email).trim(),
        timestamp: now.toISOString(),
        date: dateStr,
        time: timeStr,
        photo: attendanceData.photo,
        location: attendanceData.location,
        type: attendanceData.type,
      };

      if (attendanceData.latitude !== undefined) newAttendance.latitude = attendanceData.latitude;
      if (attendanceData.longitude !== undefined) newAttendance.longitude = attendanceData.longitude;
      if (attendanceData.accuracy !== undefined) newAttendance.accuracy = attendanceData.accuracy;
      if (attendanceData.address) newAttendance.address = attendanceData.address;
      if (googleMapsLink) newAttendance.mapUrl = googleMapsLink;
      
      await saveAttendanceToFirestore(newAttendance);
      showToast(`Absen ${attendanceData.type === 'MASUK' ? 'Masuk' : 'Keluar'} (${newAttendance.userName}) berhasil dicatat pada pukul ${timeStr}!`, 'success');
    } catch (err: any) {
      console.error("Failed to save attendance:", err);
      const errMsg = err?.message || 'Terjadi kesalahan saat menyimpan ke database.';
      showToast(`Gagal menyimpan data absensi: ${errMsg.slice(0, 70)}`, "error");
    }
  };

  const handleDeleteAttendance = (ids: string[]) => {
    setConfirmDialog({
      title: "Hapus Data Absensi",
      message: `Apakah Anda yakin ingin menghapus ${ids.length} data absensi yang dipilih? Tindakan ini hanya menghapus rekaman buku absen dan TIDAK akan mempengaruhi data pemantauan gudang maupun riwayat laporan pekerjaan.`,
      onConfirm: async () => {
        try {
          await Promise.all(ids.map(id => deleteAttendanceFromFirestore(id)));
          showToast(`${ids.length} data absensi berhasil dihapus. Data laporan pekerjaan tetap aman.`, 'success');
        } catch (err) {
          console.error("Failed to delete attendance", err);
          showToast("Gagal menghapus data absensi.", "error");
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleOpenReportModal = (warehouseCode?: string) => {
    setPreselectedWarehouse(warehouseCode);
    setIsReportModalOpen(true);
  };

  const handleSaveSystemSettings = async (newSettings: SystemSettings) => {
    try {
      await saveSystemSettingsToFirestore(newSettings);
      setSystemSettings(newSettings);
      showToast('Pengaturan sistem berhasil disimpan!', 'success');
    } catch (err) {
      console.error('Failed to save settings:', err);
      showToast('Gagal menyimpan pengaturan.', 'error');
      throw err;
    }
  };

  const handleUpdateWarehouseArea = async (warehouseId: string, newArea: string) => {
    const existing = warehouses.find(w => w.id === warehouseId);
    if (!existing) return;
    const updated: Warehouse = {
      ...existing,
      area: newArea
    };
    try {
      await saveWarehouseToFirestore(updated);
      showToast(`Spesifikasi Area Gudang ${warehouseId} berhasil diperbarui.`, 'success');
    } catch (err) {
      console.error('Failed to update warehouse area:', err);
      showToast('Gagal memperbarui area gudang.', 'error');
      throw err;
    }
  };

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-[#0a0b0e] text-zinc-100 flex flex-col justify-center items-center font-sans">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-400 mb-4"
        >
          <RefreshCw className="w-8 h-8 animate-spin" />
        </motion.div>
        <p className="text-sm font-semibold tracking-wider text-zinc-500 uppercase animate-pulse">
          Menghubungkan ke database Simpesta...
        </p>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-[#0a0b0e] text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      
      {/* Toast Notifications */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-120 pointer-events-none w-full max-w-md px-4"
          >
            <div className={`p-4 rounded-xl border shadow-xl flex items-start space-x-3 backdrop-blur-md ${
              toastMessage.type === 'success' 
                ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300'
                : toastMessage.type === 'error'
                ? 'bg-rose-950/80 border-rose-500/30 text-rose-300'
                : 'bg-zinc-900/80 border-zinc-700/50 text-sky-300'
            }`}>
              <CheckCircle className={`w-5 h-5 shrink-0 mt-0.5 ${
                toastMessage.type === 'success' ? 'text-emerald-400' : toastMessage.type === 'error' ? 'text-rose-400' : 'text-sky-400'
              }`} />
              <div className="text-xs font-semibold leading-relaxed">
                {toastMessage.text}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!currentUser ? (
        <Login onLogin={handleLogin} />
      ) : (
        <>
          <Navbar 
            currentUser={currentUser} 
            onLogout={handleLogout} 
          />

          <main className="flex-1 py-8 px-4 md:px-8 space-y-6 pb-20">

            {/* Dashboard Selector depending on Role */}
            {currentUser.role === 'PETUGAS_KEBERSIHAN' ? (
              <DashboardPetugas
                currentUser={currentUser}
                tasks={tasks}
                reports={reports}
                warehouses={warehouses}
                onOpenReportModal={handleOpenReportModal}
                attendanceList={attendanceList}
                onAddAttendance={handleSaveAttendance}
              />
            ) : (
              <DashboardKepala
                currentUser={currentUser}
                reports={reports}
                warehouses={warehouses}
                tasks={tasks}
                users={users}
                attendanceList={attendanceList}
                systemSettings={systemSettings}
                onApproveReport={handleApproveReport}
                onRejectReport={handleRejectReport}
                onUpdateWarehouseStatus={handleUpdateWarehouseStatus}
                onAddTask={handleAddTask}
                onDeleteTask={handleDeleteTask}
                onDeleteReport={handleDeleteReport}
                onDeleteUser={handleDeleteUser}
                onUpdateUser={handleUpdateUser}
                onDeleteAttendance={handleDeleteAttendance}
                onSaveSettings={handleSaveSystemSettings}
                onUpdateWarehouseArea={handleUpdateWarehouseArea}
                onResetDatabase={handleResetDemoData}
              />
            )}
          </main>

          {/* Persistent Footer */}
          <footer className="py-6 border-t border-zinc-900 bg-zinc-950/40 backdrop-blur-sm text-center text-[10px] font-mono tracking-wider text-zinc-600 mt-auto">
            GudangClean Dashboard &bull; Sistem Pemantauan Kebersihan Terpadu &bull; Versi 1.0.0
          </footer>

          {/* Create Report Dialog */}
          <AnimatePresence>
            {isReportModalOpen && (
              <CreateReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                onSubmitReport={handleAddReport}
                initialWarehouse={preselectedWarehouse}
                cleanerName={currentUser.name}
              />
            )}
          </AnimatePresence>

          {/* Custom Confirmation Modal */}
          <AnimatePresence>
            {confirmDialog && (
              <div className="fixed inset-0 z-150 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setConfirmDialog(null)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                {/* Content */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-zinc-950 border border-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl relative z-10 space-y-4"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold font-display text-white text-base">
                        {confirmDialog.title}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                        {confirmDialog.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDialog(null)}
                      className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 text-xs font-bold rounded-xl transition-all cursor-pointer border border-zinc-800"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={confirmDialog.onConfirm}
                      className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-zinc-950 text-xs font-extrabold rounded-xl transition-all cursor-pointer border-none"
                    >
                      Ya, Hapus
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
