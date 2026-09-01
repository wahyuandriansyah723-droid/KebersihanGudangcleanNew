import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ClipboardList,
  PlusCircle,
  FileCheck2,
  Clock,
  MapPin,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  CalendarDays,
  Check,
  Eye,
  MessageCircle,
  ArrowRight,
  X,
  Camera,
  Upload,
  UserCheck,
  RefreshCw,
  LogOut,
  Download,
  Trash2,
  AlertTriangle,
  LayoutDashboard,
  Search,
  Filter,
  Calendar,
  RotateCcw,
  Building2,
  ShieldCheck,
  User as UserIcon,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { User, Task, Report, Warehouse, Attendance } from '../types';

interface DashboardPetugasProps {
  currentUser: User;
  tasks: Task[];
  reports: Report[];
  warehouses: Warehouse[];
  onOpenReportModal: (preselectedWarehouse?: string) => void;
  attendanceList: Attendance[];
  onAddAttendance: (attendanceData: {
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
  }) => Promise<void>;
}

export default function DashboardPetugas({
  currentUser,
  tasks,
  reports,
  warehouses,
  onOpenReportModal,
  attendanceList,
  onAddAttendance
}: DashboardPetugasProps) {
  const [activeTab, setActiveTab] = useState<'TASKS' | 'REPORTS' | 'STATUS_GUDANG' | 'ABSENSI'>('TASKS');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Attendance States
  const [customUserName, setCustomUserName] = useState(currentUser.name);
  const [customUserEmail, setCustomUserEmail] = useState(currentUser.email);
  const [selectedLocation, setSelectedLocation] = useState('Gudang A');
  const [customLocation, setCustomLocation] = useState('');
  const [attendanceType, setAttendanceType] = useState<'MASUK' | 'KELUAR'>('MASUK');
  const [photo, setPhoto] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [submittingAttendance, setSubmittingAttendance] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Modal for viewing full attendance photo lightbox
  const [selectedAttendancePhoto, setSelectedAttendancePhoto] = useState<string | null>(null);

  // Filters for Cleaner's Own Reports ("Laporan Saya")
  const [reportSearchTerm, setReportSearchTerm] = useState('');
  const [reportWarehouseFilter, setReportWarehouseFilter] = useState('ALL');
  const [reportStatusFilter, setReportStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED'>('ALL');
  const [reportDateFilterMode, setReportDateFilterMode] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'CUSTOM'>('ALL');
  const [reportCustomDate, setReportCustomDate] = useState(() => new Date().toISOString().split('T')[0]);

  const handleDownloadAttendancePDF = (filteredList: Attendance[]) => {
    try {
      const doc = new jsPDF();
      
      // Page Heading/Header Design
      doc.setFillColor(18, 19, 26); // Dark theme color matching the app
      doc.rect(0, 0, 210, 45, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.text("GUDANGCLEAN", 14, 18);
      
      doc.setFontSize(10);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(161, 161, 170); // zinc-400
      doc.text(`Riwayat Absensi Mandiri - ${currentUser.name}`, 14, 25);
      doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 32);
      
      // Horizontal Rule
      doc.setDrawColor(39, 39, 42); // zinc-800
      doc.line(14, 49, 196, 49);
      
      // Subtitle
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59); // deep color
      doc.text("Riwayat Catatan Kehadiran Pribadi", 14, 58);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(115, 115, 115);
      doc.text(`Total Catatan: ${filteredList.length} Entri`, 14, 64);
      
      const tableData = filteredList.map((log, index) => {
        const dateObj = new Date(log.timestamp);
        const formattedDate = dateObj.toLocaleDateString('id-ID', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        return [
          index + 1,
          log.userName,
          log.type,
          log.location,
          `${formattedDate} (${log.time} WIB)`,
          '' // Placeholder for photo
        ];
      });
      
      autoTable(doc, {
        startY: 70,
        head: [['No', 'Nama Petugas', 'Tipe Absen', 'Lokasi Gudang', 'Tanggal & Waktu', 'Foto Selfie']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [16, 185, 129], // Emerald 500
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        styles: {
          fontSize: 9,
          cellPadding: 3,
          valign: 'middle',
          minCellHeight: 18
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          2: { fontStyle: 'bold', halign: 'center' },
          5: { cellWidth: 25, halign: 'center' }
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 5) {
            const log = filteredList[data.row.index];
            const photoUrl = log?.photo;
            if (photoUrl && photoUrl.startsWith('data:image/')) {
              try {
                const padding = 1.5;
                const imgWidth = data.cell.width - padding * 2;
                const imgHeight = data.cell.height - padding * 2;
                const format = photoUrl.includes('image/png') ? 'PNG' : 'JPEG';
                
                doc.addImage(
                  photoUrl,
                  format,
                  data.cell.x + padding,
                  data.cell.y + padding,
                  imgWidth,
                  imgHeight
                );
              } catch (e) {
                console.error("Error drawing image in pdf:", e);
              }
            }
          }
        }
      });
      
      doc.save(`Riwayat_Absen_${currentUser.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    }
  };

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const applyWatermarkToImage = (
    imageSrc: string,
    meta: {
      cleanerName: string;
      locationName: string;
      type: 'MASUK' | 'KELUAR';
    }
  ): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Watermark Banner / Stamp
        const now = new Date();
        const dateFormatted = now.toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
        const timeFormatted = now.toLocaleTimeString('id-ID', { hour12: false }) + ' WIB';

        const bannerHeight = Math.max(55, Math.round(height * 0.15));
        
        // Gradient banner background
        const gradient = ctx.createLinearGradient(0, height - bannerHeight, 0, height);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

        // Top accent line
        ctx.fillStyle = meta.type === 'MASUK' ? '#10b981' : '#f43f5e';
        ctx.fillRect(0, height - bannerHeight, width, Math.max(3, Math.round(bannerHeight * 0.04)));

        // Text setup
        const fontSizeMain = Math.max(12, Math.round(bannerHeight * 0.28));
        const fontSizeSub = Math.max(10, Math.round(bannerHeight * 0.22));

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${fontSizeMain}px sans-serif`;
        ctx.fillText(`PRESENSI ${meta.type}: ${meta.cleanerName}`, 12, height - bannerHeight + fontSizeMain + 6);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = `${fontSizeSub}px sans-serif`;
        ctx.fillText(`📍 ${meta.locationName} • 🕒 ${dateFormatted} ${timeFormatted}`, 12, height - bannerHeight + fontSizeMain + fontSizeSub + 10);

        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => resolve(imageSrc);
      img.src = imageSrc;
    });
  };

  const startCamera = async () => {
    setCameraError('');
    setIsCameraActive(true);
    setPhoto('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error("Camera access failed", err);
      setCameraError('Gagal mengakses kamera. Silakan pilih unggah foto sebagai alternatif.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = async () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const rawDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        stopCamera();

        const finalLocation = selectedLocation === 'Lainnya' ? (customLocation || 'Gudang A') : selectedLocation;

        const watermarked = await applyWatermarkToImage(rawDataUrl, {
          cleanerName: customUserName || currentUser.name,
          locationName: finalLocation,
          type: attendanceType
        });
        setPhoto(watermarked);
      }
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Format berkas harus berupa gambar.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawDataUrl = reader.result as string;
      const finalLocation = selectedLocation === 'Lainnya' ? (customLocation || 'Gudang A') : selectedLocation;

      const watermarked = await applyWatermarkToImage(rawDataUrl, {
        cleanerName: customUserName || currentUser.name,
        locationName: finalLocation,
        type: attendanceType
      });
      setPhoto(watermarked);
    };
    reader.readAsDataURL(file);
  };

  const handleClearPhoto = () => {
    setPhoto('');
    stopCamera();
  };

  const handleSubmitAttendance = async () => {
    if (!photo) {
      alert('Silakan ambil foto diri terlebih dahulu.');
      return;
    }
    const finalLocation = selectedLocation === 'Lainnya' ? customLocation : selectedLocation;
    if (!finalLocation.trim()) {
      alert('Silakan tentukan lokasi absensi Anda.');
      return;
    }

    setSubmittingAttendance(true);
    try {
      await onAddAttendance({
        photo,
        location: finalLocation,
        type: attendanceType,
        customUserName,
        customUserEmail
      });
      // Reset state
      setPhoto('');
      setSelectedLocation('Gudang A');
      setCustomLocation('');
    } catch (err) {
      console.error("Failed submitting attendance", err);
    } finally {
      setSubmittingAttendance(false);
    }
  };

  // Robust helper to check if report belongs strictly to the currently logged in cleaner by account Name
  const isMyReport = (report: Report) => {
    const curName = (currentUser.name || '').trim().toLowerCase();
    const rName = (report.cleanerName || '').trim().toLowerCase();

    // 1. Primary check: Strict match on cleaner's account name
    if (curName && rName) {
      if (curName === rName || curName.includes(rName) || rName.includes(curName)) {
        return true;
      }
    }

    // 2. Fallback only if report cleanerName is blank
    if (!rName) {
      const curEmail = (currentUser.email || '').trim().toLowerCase();
      const rEmail = (report.cleanerEmail || '').trim().toLowerCase();
      if (curEmail && rEmail && curEmail === rEmail) return true;
    }

    return false;
  };

  // Robust helper to check if task is assigned specifically to this cleaner by account Name
  const isMyTask = (t: Task) => {
    const curName = (currentUser.name || '').trim().toLowerCase();
    const tName = (t.assignedToName || '').trim().toLowerCase();

    if (curName && tName) {
      if (curName === tName || curName.includes(tName) || tName.includes(curName)) {
        return true;
      }
    }

    const curId = (currentUser.id || '').trim().toLowerCase();
    const tUserId = (t.assignedToUserId || '').trim().toLowerCase();
    if (curId && tUserId && curId === tUserId) return true;

    return false;
  };

  // Filter attendance list for this user by account Name
  const myAttendance = useMemo(() => {
    return (attendanceList || [])
      .filter(a => {
        const curName = (currentUser.name || '').trim().toLowerCase();
        const aName = (a.userName || '').trim().toLowerCase();

        if (curName && aName) {
          if (curName === aName || curName.includes(aName) || aName.includes(curName)) {
            return true;
          }
        }

        const curId = (currentUser.id || '').trim().toLowerCase();
        const aUserId = (a.userId || '').trim().toLowerCase();
        if (curId && aUserId && curId === aUserId) return true;

        return false;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [attendanceList, currentUser]);

  // Filter tasks assigned to this cleaner
  const myTasks = useMemo(() => {
    return tasks.filter(t => isMyTask(t));
  }, [tasks, currentUser]);

  // All reports belonging strictly to this cleaner account
  const allMyReports = useMemo(() => {
    return reports
      .filter(r => isMyReport(r))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [reports, currentUser]);

  // Date filtering helper for cleaner's reports
  const getIsReportInDateFilter = (timestampStr: string) => {
    if (reportDateFilterMode === 'ALL') return true;
    const rDate = new Date(timestampStr);
    const rY = rDate.getFullYear();
    const rM = String(rDate.getMonth() + 1).padStart(2, '0');
    const rD = String(rDate.getDate()).padStart(2, '0');
    const rDateStr = `${rY}-${rM}-${rD}`;

    const now = new Date();
    const nowY = now.getFullYear();
    const nowM = String(now.getMonth() + 1).padStart(2, '0');
    const nowD = String(now.getDate()).padStart(2, '0');
    const todayStr = `${nowY}-${nowM}-${nowD}`;

    if (reportDateFilterMode === 'TODAY') {
      return rDateStr === todayStr;
    }

    if (reportDateFilterMode === 'YESTERDAY') {
      const yDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yY = yDate.getFullYear();
      const yM = String(yDate.getMonth() + 1).padStart(2, '0');
      const yD = String(yDate.getDate()).padStart(2, '0');
      return rDateStr === `${yY}-${yM}-${yD}`;
    }

    if (reportDateFilterMode === 'LAST_7_DAYS') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return rDate >= sevenDaysAgo && rDate <= now;
    }

    if (reportDateFilterMode === 'CUSTOM') {
      return rDateStr === reportCustomDate;
    }

    return true;
  };

  // Filtered reports by search, warehouse, status, and date
  const filteredMyReports = useMemo(() => {
    return allMyReports.filter(r => {
      const cleanTerm = reportSearchTerm.trim().toLowerCase();
      const matchesSearch = 
        !cleanTerm ||
        r.warehouse.toLowerCase().includes(cleanTerm) ||
        `gudang ${r.warehouse.toLowerCase()}`.includes(cleanTerm) ||
        `gd ${r.warehouse.toLowerCase()}`.includes(cleanTerm) ||
        r.description.toLowerCase().includes(cleanTerm) ||
        (r.feedback && r.feedback.toLowerCase().includes(cleanTerm));

      const matchesWarehouse = reportWarehouseFilter === 'ALL' || r.warehouse === reportWarehouseFilter;
      const matchesStatus = reportStatusFilter === 'ALL' || r.status === reportStatusFilter;
      const matchesDate = getIsReportInDateFilter(r.timestamp);

      return matchesSearch && matchesWarehouse && matchesStatus && matchesDate;
    });
  }, [allMyReports, reportSearchTerm, reportWarehouseFilter, reportStatusFilter, reportDateFilterMode, reportCustomDate]);

  // Backward compatibility reference
  const myReports = allMyReports;

  // Calculate Warehouse Cleanliness Metrics
  const totalWarehouses = warehouses.length;
  const cleanCount = warehouses.filter(w => w.status === 'BERSIH').length;
  const inProgressCount = warehouses.filter(w => w.status === 'DALAM_PENGERJAAN').length;
  const dirtyCount = warehouses.filter(w => w.status === 'KOTOR').length;
  const cleanPercentage = totalWarehouses > 0 ? Math.round((cleanCount / totalWarehouses) * 100) : 0;

  const getWarehouseName = (id: string) => {
    const wh = warehouses.find(w => w.id === id);
    return wh ? `${wh.name} - ${wh.area}` : `Gudang ${id}`;
  };

  const getStatusColor = (status: Report['status']) => {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'REJECTED': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default: return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    }
  };

  const getStatusLabel = (status: Report['status']) => {
    switch (status) {
      case 'APPROVED': return 'Disetujui';
      case 'REJECTED': return 'Ditolak / Revisi';
      default: return 'Menunggu Verifikasi';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-1 md:px-0 font-sans">
      
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-br from-zinc-900/60 to-zinc-950/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 shadow-xl"
        id="cleaner-welcome-banner"
      >
        <div className="absolute right-0 top-0 translate-x-[15%] translate-y-[-15%] w-72 h-72 rounded-full bg-emerald-500/5 blur-[80px] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 mb-2">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">Layanan Kebersihan Aktif</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold font-display text-white tracking-tight">
              Semangat Bekerja, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{currentUser.name}</span>!
            </h2>
            <p className="text-xs md:text-sm text-zinc-400 mt-1 max-w-xl">
              Gudang yang bersih menjamin keselamatan kerja dan kelancaran logistik. Pastikan untuk selalu melampirkan foto sebelum dan sesudah pengerjaan secara detail.
            </p>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onOpenReportModal()}
            className="flex items-center space-x-2 py-3 px-5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/10 transition-all outline-none border-none cursor-pointer self-stretch md:self-auto justify-center"
            id="create-report-btn"
          >
            <PlusCircle className="w-4.5 h-4.5" />
            <span>Buat Laporan Baru</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Task Summary Card */}
        <div className="p-5 bg-zinc-900/20 border border-zinc-900/80 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Progres Tugas Hari Ini</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-extrabold text-white">
                {myTasks.filter(t => t.status === 'COMPLETED').length} <span className="text-zinc-500 text-base font-normal">/</span> {myTasks.length}
              </span>
              <span className="text-xs text-emerald-400 font-bold">Tugas Selesai</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {myTasks.filter(t => t.status !== 'COMPLETED').length === 0 
                ? 'Semua tugas telah selesai dikerjakan.' 
                : `${myTasks.filter(t => t.status !== 'COMPLETED').length} tugas perlu diselesaikan.`}
            </p>
          </div>
          <div className="w-11 h-11 rounded-full bg-emerald-500/5 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-500/10">
            {myTasks.length > 0 
              ? Math.round((myTasks.filter(t => t.status === 'COMPLETED').length / myTasks.length) * 100) 
              : 100}%
          </div>
        </div>

        {/* Verification Status Card */}
        <div className="p-5 bg-zinc-900/20 border border-zinc-900/80 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Laporan Dikirim</span>
            <div className="flex items-center space-x-3">
              <div>
                <span className="text-xl font-bold text-white block">{myReports.length}</span>
                <span className="text-[9px] text-zinc-400 uppercase font-bold">Total</span>
              </div>
              <div className="h-7 w-[1px] bg-zinc-800" />
              <div>
                <span className="text-xl font-bold text-emerald-400 block">
                  {myReports.filter(r => r.status === 'APPROVED').length}
                </span>
                <span className="text-[9px] text-zinc-400 uppercase font-bold">Disetujui</span>
              </div>
              <div className="h-7 w-[1px] bg-zinc-800" />
              <div>
                <span className="text-xl font-bold text-amber-400 block">
                  {myReports.filter(r => r.status === 'PENDING').length}
                </span>
                <span className="text-[9px] text-zinc-400 uppercase font-bold">Proses</span>
              </div>
            </div>
          </div>
          <div className="p-2.5 bg-zinc-800/20 rounded-xl border border-zinc-800 shrink-0 text-zinc-400">
            <FileCheck2 className="w-4 h-4" />
          </div>
        </div>

        {/* Warehouse Cleanliness Standard Pass Percentage Card */}
        <div className="p-5 bg-zinc-900/20 border border-zinc-900/80 rounded-2xl flex flex-col justify-between space-y-2">
          <div className="space-y-1">
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Standar Kebersihan Gudang</span>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-extrabold text-white tracking-tight">{cleanPercentage}%</span>
                <span className="text-xs text-emerald-400 font-bold">Lolos Standar</span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono font-medium">
                {cleanCount}/{totalWarehouses} Area Bersih
              </span>
            </div>
            <div className="w-full bg-zinc-950/60 rounded-full h-1.5 border border-zinc-900 overflow-hidden mt-1">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${cleanPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-zinc-900 flex space-x-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('TASKS')}
          className={`pb-3.5 text-sm font-bold relative transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'TASKS' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-200'
          }`}
          id="tab-tasks"
        >
          <ClipboardList className="w-4 h-4" />
          <span>Daftar Tugas Harian ({myTasks.length})</span>
          {activeTab === 'TASKS' && (
            <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('REPORTS')}
          className={`pb-3.5 text-sm font-bold relative transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'REPORTS' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-200'
          }`}
          id="tab-reports"
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Laporan Saya ({myReports.length})</span>
          {activeTab === 'REPORTS' && (
            <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('STATUS_GUDANG')}
          className={`pb-3.5 text-sm font-bold relative transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'STATUS_GUDANG' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-200'
          }`}
          id="tab-status-gudang"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Status 12 Area Gudang ({cleanCount}/{totalWarehouses} Bersih)</span>
          {activeTab === 'STATUS_GUDANG' && (
            <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('ABSENSI')}
          className={`pb-3.5 text-sm font-bold relative transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'ABSENSI' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-200'
          }`}
          id="tab-attendance"
        >
          <UserCheck className="w-4 h-4" />
          <span>Absensi Saya</span>
          {activeTab === 'ABSENSI' && (
            <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
          )}
        </button>
      </div>

      {/* Main Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'TASKS' && (
          <motion.div
            key="tasks-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {myTasks.length === 0 ? (
              <div className="p-12 text-center bg-zinc-900/10 rounded-2xl border border-zinc-900 border-dashed">
                <CheckCircle2 className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <h4 className="font-bold text-white mb-1">Semua Tugas Selesai!</h4>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Anda tidak memiliki tugas tertulis yang ditugaskan hari ini. Anda tetap dapat mengirimkan laporan kebersihan mandiri melalui tombol "Buat Laporan Baru".
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myTasks.map((task) => {
                  const isCompleted = task.status === 'COMPLETED';
                  return (
                    <motion.div
                      key={task.id}
                      whileHover={{ y: -2 }}
                      className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
                        isCompleted
                          ? 'bg-emerald-950/15 border-emerald-900/20'
                          : 'bg-zinc-900/30 border-zinc-900'
                      }`}
                      id={`task-card-${task.id}`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-xs font-black text-emerald-400">
                              {task.warehouse}
                            </span>
                            <div>
                              <h4 className="text-sm font-bold text-zinc-100">{task.taskName}</h4>
                              <span className="text-[10px] text-zinc-500 font-medium">
                                {getWarehouseName(task.warehouse)}
                              </span>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            isCompleted
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                          }`}>
                            {isCompleted ? 'Selesai' : 'Perlu Dikerjakan'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed pl-10 mb-4">
                          {task.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-zinc-850/60 pt-3 pl-10 mt-2">
                        <div className="flex items-center space-x-1.5 text-zinc-500 text-[10px] font-medium font-mono">
                          <CalendarDays className="w-3.5 h-3.5" />
                          <span>Hari Ini</span>
                        </div>
                        
                        {!isCompleted ? (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onOpenReportModal(task.warehouse)}
                            className="flex items-center space-x-1.5 py-1.5 px-3.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-lg transition-all cursor-pointer border-none"
                            id={`report-task-${task.id}`}
                          >
                            <span>Kerjakan & Lapor</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </motion.button>
                        ) : (
                          <span className="flex items-center space-x-1 text-xs text-emerald-400 font-bold">
                            <Check className="w-4 h-4" />
                            <span>Tugas Selesai</span>
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'REPORTS' && (
          <motion.div
            key="reports-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Cleaner Account Identity & Summary Header */}
            <div className="p-4.5 bg-zinc-900/40 border border-zinc-850 rounded-2xl space-y-4 shadow-sm" id="cleaner-reports-account-header">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3.5 border-b border-zinc-800/80">
                <div className="flex items-center space-x-3.5">
                  <div className="relative shrink-0">
                    <img
                      src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150'}
                      alt={currentUser.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/40 ring-2 ring-emerald-500/10 shadow-md"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 text-zinc-950 p-0.5 rounded-full border border-zinc-900" title="Akun Petugas Terverifikasi">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-extrabold text-white text-base font-display">
                        Laporan Saya — {currentUser.name}
                      </h3>
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] font-bold font-mono">
                        Petugas Bertugas
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 flex items-center space-x-1.5 mt-0.5">
                      <span className="font-bold text-zinc-200">{currentUser.name}</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-emerald-400 font-medium">Menampilkan laporan khusus atas nama akun Anda</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenReportModal()}
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/10 transition-all cursor-pointer border-none"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Tambah Laporan</span>
                  </button>
                </div>
              </div>

              {/* Status breakdown metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-0.5 text-xs">
                <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-850 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Total Laporan</span>
                    <span className="text-base font-extrabold text-white font-mono">{allMyReports.length}</span>
                  </div>
                  <FileCheck2 className="w-5 h-5 text-zinc-600" />
                </div>
                <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-emerald-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Disetujui</span>
                    <span className="text-base font-extrabold text-emerald-400 font-mono">
                      {allMyReports.filter(r => r.status === 'APPROVED').length}
                    </span>
                  </div>
                  <Check className="w-5 h-5 text-emerald-400/60" />
                </div>
                <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-amber-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Menunggu</span>
                    <span className="text-base font-extrabold text-amber-400 font-mono">
                      {allMyReports.filter(r => r.status === 'PENDING').length}
                    </span>
                  </div>
                  <Clock className="w-5 h-5 text-amber-400/60" />
                </div>
                <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-rose-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">Ditolak / Revisi</span>
                    <span className="text-base font-extrabold text-rose-400 font-mono">
                      {allMyReports.filter(r => r.status === 'REJECTED').length}
                    </span>
                  </div>
                  <AlertTriangle className="w-5 h-5 text-rose-400/60" />
                </div>
              </div>

              {/* Filter & Search Bar for Cleaner's Reports */}
              <div className="pt-2 space-y-2.5 border-t border-zinc-850/70">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-zinc-300 flex items-center space-x-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Filter & Pencarian Laporan:</span>
                  </span>

                  {(reportSearchTerm || reportWarehouseFilter !== 'ALL' || reportStatusFilter !== 'ALL' || reportDateFilterMode !== 'ALL') && (
                    <button
                      type="button"
                      onClick={() => {
                        setReportSearchTerm('');
                        setReportWarehouseFilter('ALL');
                        setReportStatusFilter('ALL');
                        setReportDateFilterMode('ALL');
                      }}
                      className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Filter</span>
                    </button>
                  )}
                </div>

                {/* Date Quick Selector Pills */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  <span className="text-[11px] font-bold text-zinc-500 shrink-0 mr-1 flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-zinc-400" />
                    <span>Tanggal:</span>
                  </span>

                  {[
                    { mode: 'ALL', label: 'Semua Waktu' },
                    { mode: 'TODAY', label: 'Hari Ini' },
                    { mode: 'YESTERDAY', label: 'Kemarin' },
                    { mode: 'LAST_7_DAYS', label: '7 Hari Terakhir' },
                    { mode: 'CUSTOM', label: 'Pilih Tanggal' }
                  ].map((btn) => (
                    <button
                      key={btn.mode}
                      type="button"
                      onClick={() => setReportDateFilterMode(btn.mode as any)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                        reportDateFilterMode === btn.mode
                          ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                          : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-850'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}

                  {reportDateFilterMode === 'CUSTOM' && (
                    <input
                      type="date"
                      value={reportCustomDate}
                      onChange={(e) => setReportCustomDate(e.target.value)}
                      className="px-2 py-0.5 bg-zinc-950 border border-emerald-500/40 rounded-lg text-xs text-zinc-200 outline-none cursor-pointer"
                    />
                  )}
                </div>

                {/* Filter Controls Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {/* Search Input */}
                  <div className="relative flex items-center">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none">
                      <Search className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      placeholder="Cari gudang / keterangan..."
                      value={reportSearchTerm}
                      onChange={(e) => setReportSearchTerm(e.target.value)}
                      className="w-full pl-8.5 pr-8 py-1.5 bg-zinc-950 border border-zinc-850 hover:border-zinc-700 focus:border-emerald-500 rounded-xl text-xs text-zinc-200 placeholder-zinc-600 outline-none transition-all"
                      id="cleaner-report-search"
                    />
                    {reportSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setReportSearchTerm('')}
                        className="absolute right-2 p-1 text-zinc-500 hover:text-white rounded cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Filter Warehouse */}
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none text-xs font-medium">
                      Area:
                    </span>
                    <select
                      value={reportWarehouseFilter}
                      onChange={(e) => setReportWarehouseFilter(e.target.value)}
                      className="w-full pl-13 pr-4 py-1.5 bg-zinc-950 border border-zinc-850 focus:border-emerald-500 rounded-xl text-xs text-zinc-200 outline-none cursor-pointer"
                      id="cleaner-report-warehouse-filter"
                    >
                      <option value="ALL">Semua 12 Gudang</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          Gudang {w.id} - {w.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filter Status */}
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none text-xs font-medium">
                      Status:
                    </span>
                    <select
                      value={reportStatusFilter}
                      onChange={(e) => setReportStatusFilter(e.target.value as any)}
                      className="w-full pl-15 pr-4 py-1.5 bg-zinc-950 border border-zinc-850 focus:border-emerald-500 rounded-xl text-xs text-zinc-200 outline-none cursor-pointer"
                      id="cleaner-report-status-filter"
                    >
                      <option value="ALL">Semua Status</option>
                      <option value="APPROVED">Disetujui</option>
                      <option value="PENDING">Menunggu Verifikasi</option>
                      <option value="REJECTED">Ditolak / Perlu Revisi</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Reports List */}
            {allMyReports.length === 0 ? (
              <div className="p-12 text-center bg-zinc-900/10 rounded-2xl border border-zinc-900 border-dashed">
                <FileCheck2 className="w-12 h-12 text-zinc-750 mx-auto mb-3" />
                <h4 className="font-bold text-white mb-1">Belum Ada Laporan Dari Akun Anda</h4>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
                  Anda ({currentUser.name}) belum mengirimkan laporan kebersihan. Silakan klik tombol di bawah untuk membuat laporan pertama Anda.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenReportModal()}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center space-x-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Buat Laporan Sekarang</span>
                </button>
              </div>
            ) : filteredMyReports.length === 0 ? (
              <div className="p-10 text-center bg-zinc-900/15 rounded-2xl border border-zinc-850 border-dashed space-y-3">
                <Search className="w-10 h-10 text-zinc-600 mx-auto" />
                <div>
                  <h4 className="font-bold text-white text-sm">Tidak Ada Laporan yang Sesuai</h4>
                  <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1">
                    Tidak ditemukan laporan yang cocok dengan kata kunci atau filter tanggal yang Anda pilih.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReportSearchTerm('');
                    setReportWarehouseFilter('ALL');
                    setReportStatusFilter('ALL');
                    setReportDateFilterMode('ALL');
                  }}
                  className="px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 text-xs font-bold rounded-lg border border-zinc-700 cursor-pointer inline-flex items-center space-x-1"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Reset Filter Pencarian</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                  <span>Menampilkan <strong>{filteredMyReports.length}</strong> laporan milik Anda</span>
                  <span className="text-[11px] font-mono text-zinc-500">Urutan Terbaru</span>
                </div>

                {filteredMyReports.map((report) => (
                  <div
                    key={report.id}
                    className="p-4 bg-zinc-900/30 border border-zinc-900 hover:border-zinc-800 rounded-xl transition-all flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0"
                    id={`report-item-${report.id}`}
                  >
                    <div className="flex items-start space-x-4">
                      {/* Before / After Mini previews */}
                      <div className="flex -space-x-4 hover:space-x-1 transition-all shrink-0">
                        <div className="relative group/img cursor-pointer" onClick={() => setSelectedReport(report)} title="Klik untuk perbesar foto Sebelum">
                          <img
                            src={report.photoBefore}
                            alt="Sebelum"
                            className="w-14 h-14 rounded-lg object-cover border-2 border-zinc-900 shadow-md"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute bottom-0 right-0 bg-rose-600 text-[7px] text-white font-extrabold px-1 rounded">SEBELUM</span>
                        </div>
                        <div className="relative group/img cursor-pointer" onClick={() => setSelectedReport(report)} title="Klik untuk perbesar foto Sesudah">
                          <img
                            src={report.photoAfter}
                            alt="Sesudah"
                            className="w-14 h-14 rounded-lg object-cover border-2 border-zinc-900 shadow-md"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute bottom-0 right-0 bg-emerald-600 text-[7px] text-white font-extrabold px-1 rounded">SESUDAH</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="bg-zinc-800 text-white font-extrabold text-[11px] px-2 py-0.5 rounded-md border border-zinc-700">
                            Gudang {report.warehouse}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-medium font-mono">
                            {new Date(report.timestamp).toLocaleDateString('id-ID', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })} • {new Date(report.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                          </span>
                          <span className="text-[10px] text-emerald-400/90 font-mono bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-800/30">
                            Oleh: {report.cleanerName || currentUser.name}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 font-medium mt-1.5 max-w-lg line-clamp-2">
                          {report.description}
                        </p>
                        
                        {/* Display feedback if any */}
                        {report.feedback && (
                          <div className="flex items-start space-x-1.5 mt-2 text-[11px] text-emerald-400 bg-emerald-500/5 px-2 py-1 rounded-md border border-emerald-500/10">
                            <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                            <span><strong>Catatan Kepala:</strong> "{report.feedback}"</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end border-t border-zinc-850/40 md:border-none pt-3 md:pt-0">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${getStatusColor(report.status)}`}>
                        {getStatusLabel(report.status)}
                      </span>
                      
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
                        title="Lihat Detail Laporan"
                        id={`view-report-detail-${report.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'STATUS_GUDANG' && (
          <motion.div
            key="status-gudang-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Header / Summary banner for Warehouses */}
            <div className="p-4 bg-zinc-900/30 border border-zinc-900 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                  <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                  <span>Monitoring Status 12 Area Gudang Logistik</span>
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Setiap kali Anda mengirimkan laporan kebersihan, status area gudang terkait akan otomatis berubah menjadi <span className="text-emerald-400 font-bold">Bersih</span> dan persentase standar kebersihan gudang langsung terupdate secara real-time.
                </p>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
                  {cleanCount} Bersih
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold font-mono">
                  {inProgressCount} Proses
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold font-mono">
                  {dirtyCount} Kotor
                </span>
              </div>
            </div>

            {/* 12 Warehouse Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {warehouses.map((w) => {
                const isClean = w.status === 'BERSIH';
                const isInProgress = w.status === 'DALAM_PENGERJAAN';

                return (
                  <motion.div
                    key={w.id}
                    whileHover={{ y: -2 }}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                      isClean
                        ? 'bg-emerald-950/15 border-emerald-900/30 hover:border-emerald-700/50'
                        : isInProgress
                        ? 'bg-amber-950/15 border-amber-900/30 hover:border-amber-700/50'
                        : 'bg-zinc-900/30 border-zinc-900 hover:border-zinc-800'
                    }`}
                    id={`cleaner-wh-card-${w.id}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black border ${
                            isClean 
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                              : isInProgress
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                              : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                          }`}>
                            {w.id}
                          </span>
                          <div>
                            <h5 className="text-xs font-bold text-white">{w.name}</h5>
                            <span className="text-[10px] text-zinc-500">{w.area}</span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                          isClean
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : isInProgress
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isClean ? 'bg-emerald-400' : isInProgress ? 'bg-amber-400' : 'bg-rose-400'
                          }`} />
                          <span>{isClean ? 'Bersih' : isInProgress ? 'Proses' : 'Kotor'}</span>
                        </span>
                      </div>

                      <div className="mt-2 text-[11px] text-zinc-400 space-y-0.5">
                        {w.lastCleaned ? (
                          <>
                            <div className="text-[10px] text-zinc-500">
                              Dibersihkan: <span className="text-zinc-300 font-mono">{new Date(w.lastCleaned).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                            </div>
                            {w.lastCleanedBy && (
                              <div className="text-[10px] text-emerald-400/90 truncate">
                                Oleh: <span className="font-semibold">{w.lastCleanedBy}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-[10px] text-zinc-600 italic">Belum dibersihkan hari ini</div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-zinc-850/60 flex items-center justify-between">
                      <span className="text-[9px] text-zinc-500 font-mono">Area {w.id}</span>
                      <button
                        onClick={() => onOpenReportModal(w.id)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1 cursor-pointer border-none ${
                          isClean
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
                        }`}
                        id={`btn-report-wh-${w.id}`}
                      >
                        <span>{isClean ? 'Lapor Ulang' : 'Lapor Bersih'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === 'ABSENSI' && (
          <motion.div
            key="attendance-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Absen Form */}
              <div className="lg:col-span-5 bg-zinc-900/30 border border-zinc-900 rounded-2xl p-6 flex flex-col space-y-5">
                <div className="border-b border-zinc-800 pb-4">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block font-mono">Fitur Absensi</span>
                  <h3 className="text-lg font-bold text-white mt-1">Absensi Petugas & Tim</h3>
                  
                  {/* Digital Clock Widget */}
                  <div className="mt-3 flex items-center space-x-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-4 py-2.5">
                    <Clock className="w-5 h-5 text-emerald-400 animate-pulse shrink-0" />
                    <div>
                      <span className="text-zinc-500 text-[9px] uppercase tracking-wider block font-bold font-mono">Waktu Sekarang</span>
                      <span className="text-xs font-mono font-bold text-zinc-300 tracking-wide block mt-0.5">
                        {currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} &bull; {currentTime.toLocaleTimeString('id-ID', { hour12: false })} WIB
                      </span>
                    </div>
                  </div>
                </div>

                {/* Nama Petugas Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block font-mono">Nama Petugas yang Absen</label>
                  <input
                    type="text"
                    value={customUserName}
                    onChange={(e) => {
                      setCustomUserName(e.target.value);
                      const sanitized = e.target.value.toLowerCase().replace(/\s+/g, '.');
                      setCustomUserEmail(`${sanitized || 'user'}@gudang.com`);
                    }}
                    placeholder="Masukkan nama lengkap petugas..."
                    className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-xs text-zinc-200 outline-none transition-all font-medium"
                    required
                  />
                </div>

                {/* Absen Type (MASUK / KELUAR) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block font-mono">Tipe Absensi</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAttendanceType('MASUK')}
                      className={`py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-center space-x-2 cursor-pointer transition-all ${
                        attendanceType === 'MASUK'
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/5'
                          : 'bg-zinc-900/40 border-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-800'
                      }`}
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Masuk Kerja</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttendanceType('KELUAR')}
                      className={`py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-center space-x-2 cursor-pointer transition-all ${
                        attendanceType === 'KELUAR'
                          ? 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-lg shadow-rose-500/5'
                          : 'bg-zinc-900/40 border-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-800'
                      }`}
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Pulang Kerja</span>
                    </button>
                  </div>
                </div>

                {/* Location Picker */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block font-mono">Lokasi Presensi</label>

                  <div className="flex space-x-2">
                    <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 text-zinc-400 shrink-0">
                      <MapPin className="w-5 h-5 text-emerald-400" />
                    </div>
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium"
                    >
                      {warehouses.map((wh) => (
                        <option key={wh.id} value={`Gudang ${wh.id}`}>
                          Gudang {wh.id} - {wh.name}
                        </option>
                      ))}
                      <option value="Kantor Utama">Kantor Utama / Staff Area</option>
                      <option value="Gudang Utama">Gudang Utama (Logistik)</option>
                      <option value="Lainnya">Lainnya (Tulis Lokasi)</option>
                    </select>
                  </div>
                  
                  {selectedLocation === 'Lainnya' && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="pt-1.5"
                    >
                      <input
                        type="text"
                        value={customLocation}
                        onChange={(e) => setCustomLocation(e.target.value)}
                        placeholder="Masukkan nama lokasi detail..."
                        className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 outline-none focus:border-emerald-500 transition-all font-medium"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Camera / Foto Diri panel */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block font-mono">Foto Diri di Lokasi (Selfie)</label>
                  
                  {!photo && !isCameraActive && (
                    <div className="border border-zinc-800 border-dashed rounded-xl p-6 text-center bg-zinc-950/20">
                      <Camera className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                      <p className="text-xs text-zinc-400 font-medium mb-4">Pilih metode pengambilan foto diri Anda</p>
                      
                      <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <button
                          type="button"
                          onClick={startCamera}
                          className="py-2 px-3.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-lg flex items-center justify-center space-x-1.5 cursor-pointer transition-all border-none"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Ambil dari Kamera</span>
                        </button>
                        <label className="py-2 px-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-lg flex items-center justify-center space-x-1.5 cursor-pointer transition-all border border-zinc-750">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Unggah Foto</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {isCameraActive && (
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black border border-zinc-800">
                      <video
                        ref={videoRef}
                        className="w-full h-full object-cover scale-x-[-1]"
                        playsInline
                        muted
                      />
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-2">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="py-2 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs rounded-lg flex items-center space-x-1.5 shadow-lg border-none cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Ambil Foto</span>
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-lg border-none cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}

                  {photo && (
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-zinc-800">
                      <img
                        src={photo}
                        alt="Foto Absen"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={handleClearPhoto}
                        className="absolute top-2 right-2 p-1.5 bg-zinc-950/80 text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="Hapus foto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-zinc-950/80 px-2 py-0.5 rounded text-[8px] font-mono tracking-wider text-zinc-400 uppercase">
                        Pratinjau Foto Selfie
                      </div>
                    </div>
                  )}

                  {cameraError && (
                    <p className="text-[10px] text-rose-400 font-medium pl-1">{cameraError}</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="button"
                  disabled={submittingAttendance || !photo}
                  onClick={handleSubmitAttendance}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all border-none ${
                    photo && !submittingAttendance
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 cursor-pointer shadow-lg shadow-emerald-500/10'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {submittingAttendance ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan Absensi...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Kirim Absensi ({attendanceType})</span>
                    </>
                  )}
                </button>
              </div>

              {/* Attendance History */}
              <div className="lg:col-span-7 bg-zinc-900/10 border border-zinc-900/60 rounded-2xl p-6 flex flex-col space-y-4">
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block font-mono">Riwayat Kehadiran</span>
                  <h3 className="text-base font-bold text-white mt-0.5">Buku Riwayat Absen Mandiri</h3>
                </div>

                {myAttendance.length === 0 ? (
                  <div className="p-12 text-center bg-zinc-900/10 rounded-2xl border border-zinc-900 border-dashed my-auto">
                    <UserCheck className="w-10 h-10 text-zinc-750 mx-auto mb-3" />
                    <h4 className="font-bold text-zinc-300 text-sm mb-1">Belum Ada Riwayat Absensi</h4>
                    <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                      Anda belum mencatatkan absensi masuk atau pulang hari ini. Lakukan absensi pertama Anda di panel sebelah kiri.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/10 border border-zinc-900 rounded-xl p-3.5">
                      <div className="text-[11px] font-medium text-zinc-400">
                        Total Catatan Absensi: <span className="text-white font-bold font-mono">{myAttendance.length}</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Download PDF Button */}
                        <button
                          onClick={() => handleDownloadAttendancePDF(myAttendance)}
                          className="flex items-center space-x-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 rounded-lg px-3 py-1.5 text-[10px] font-semibold transition-all cursor-pointer shadow-md"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh Buku Absen (PDF)</span>
                        </button>
                      </div>
                    </div>

                    <div className="w-full overflow-hidden border border-zinc-900 rounded-xl bg-zinc-950/20">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-900 bg-zinc-900/40 text-[9px] font-black uppercase tracking-wider text-zinc-500 font-mono">
                              <th className="py-3 px-3 text-center w-10">No</th>
                              <th className="py-3 px-3">Petugas</th>
                              <th className="py-3 px-3 text-center">Tipe</th>
                              <th className="py-3 px-3">Lokasi</th>
                              <th className="py-3 px-3">Tanggal & Waktu</th>
                              <th className="py-3 px-3 text-center w-20">Foto Selfie</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900/60 text-xs">
                            {myAttendance.map((log, index) => {
                              const isMasuk = log.type === 'MASUK';
                              const dateObj = new Date(log.timestamp);
                              const formattedDate = dateObj.toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              });

                              return (
                                <tr
                                  key={log.id}
                                  className="hover:bg-zinc-900/20 transition-all group"
                                >
                                  <td className="py-3 px-3 text-center font-mono font-bold text-zinc-650">
                                    {index + 1}
                                  </td>
                                  <td className="py-3 px-3">
                                    <div>
                                      <span className="font-bold text-zinc-200 block">
                                        {log.userName}
                                      </span>
                                      <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">
                                        {log.userEmail}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                      isMasuk
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                                    }`}>
                                      {isMasuk ? 'MASUK' : 'KELUAR'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="flex items-center space-x-1.5 text-zinc-300 font-medium">
                                      <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                      <span>{log.location}</span>
                                    </div>
                                    {log.latitude && (
                                      <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                                        GPS: {log.latitude.toFixed(4)}, {log.longitude?.toFixed(4)}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3 px-3">
                                    <div>
                                      <span className="text-zinc-300 font-semibold block">{formattedDate}</span>
                                      <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">{log.time} WIB</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <div className="flex justify-center">
                                      <div
                                        onClick={() => setSelectedAttendancePhoto(log.photo)}
                                        className="relative w-10 h-8 rounded overflow-hidden border border-zinc-900 cursor-pointer group/att-pic shrink-0"
                                        title="Lihat foto selfie"
                                      >
                                        <img
                                          src={log.photo}
                                          alt={`Selfie ${log.userName}`}
                                          className="w-full h-full object-cover transition-transform duration-300 group-hover/att-pic:scale-110"
                                          referrerPolicy="no-referrer"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/att-pic:opacity-100 flex items-center justify-center transition-all">
                                          <Eye className="w-3 h-3 text-white" />
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox / Details Modal for Cleaner's own reports */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReport(null)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-[#12131a] border border-zinc-800 rounded-2xl shadow-2xl p-6 z-10 flex flex-col max-h-[90vh] overflow-y-auto"
              id="report-detail-lightbox"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Detail Laporan</span>
                  <h3 className="font-bold text-white text-base">Gudang {selectedReport.warehouse}</h3>
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Side by side Before and After Images */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-1">Sebelum</span>
                    <div className="aspect-[4/3] rounded-xl overflow-hidden border border-rose-950/30">
                      <img
                        src={selectedReport.photoBefore}
                        alt="Sebelum"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Sesudah</span>
                    <div className="aspect-[4/3] rounded-xl overflow-hidden border border-emerald-950/30">
                      <img
                        src={selectedReport.photoAfter}
                        alt="Sesudah"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 space-y-2 text-xs">
                  <div>
                    <span className="text-zinc-500 font-semibold uppercase text-[9px] tracking-wider block">Keterangan Pekerjaan</span>
                    <span className="text-zinc-200 font-medium leading-relaxed block mt-0.5">{selectedReport.description}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/50">
                    <div>
                      <span className="text-zinc-500 font-semibold uppercase text-[9px] tracking-wider block">Waktu Pengiriman</span>
                      <span className="text-zinc-300 font-mono text-[10px]">
                        {new Date(selectedReport.timestamp).toLocaleString('id-ID')} WIB
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-semibold uppercase text-[9px] tracking-wider block">Status Verifikasi</span>
                      <span className={`inline-block font-bold text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5 ${getStatusColor(selectedReport.status)}`}>
                        {getStatusLabel(selectedReport.status)}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedReport.feedback && (
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                    <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Tanggapan Kepala Gudang</span>
                    <p className="text-xs text-zinc-300 italic leading-relaxed">
                      "{selectedReport.feedback}"
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox Modal for Attendance selfie photo */}
      <AnimatePresence>
        {selectedAttendancePhoto && (
          <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAttendancePhoto(null)}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#12131a] border border-zinc-800 rounded-2xl shadow-2xl p-4 z-10 flex flex-col"
            >
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-800">
                <span className="text-xs font-bold text-zinc-400">Foto Selfie Absensi</span>
                <button
                  onClick={() => setSelectedAttendancePhoto(null)}
                  className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="rounded-xl overflow-hidden aspect-[4/3] border border-zinc-800">
                <img
                  src={selectedAttendancePhoto}
                  alt="Selfie Absen"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
