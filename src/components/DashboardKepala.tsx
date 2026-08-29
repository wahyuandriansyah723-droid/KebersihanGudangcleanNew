import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Grid,
  ListFilter,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Sparkles,
  RefreshCw,
  Info,
  ExternalLink,
  Plus,
  Compass,
  LayoutDashboard,
  TrendingUp,
  Clock,
  Eye,
  Check,
  X,
  AlertTriangle,
  Send,
  ClipboardList,
  Trash2,
  UserCheck,
  MapPin,
  Download,
  Settings,
  Edit2,
  Pencil
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Report, Warehouse, User, Task, Attendance, SystemSettings } from '../types';
import { defaultSystemSettings } from '../mockData';
import ExportReportsModal from './ExportReportsModal';
import DashboardSettings from './DashboardSettings';

interface DashboardKepalaProps {
  currentUser: User;
  reports: Report[];
  warehouses: Warehouse[];
  tasks: Task[];
  users: User[];
  attendanceList: Attendance[];
  systemSettings?: SystemSettings;
  onApproveReport: (id: string, feedback?: string) => void;
  onRejectReport: (id: string, feedback?: string) => void;
  onUpdateWarehouseStatus: (id: string, status: Warehouse['status'], lastCleanedBy?: string) => void;
  onAddTask: (taskData: {
    warehouse: string;
    taskName: string;
    description: string;
    assignedToEmail: string;
    assignedToUserId?: string;
    assignedToName?: string;
  }) => void;
  onDeleteTask: (id: string) => void;
  onDeleteReport: (id: string) => void;
  onDeleteUser: (id: string) => void;
  onUpdateUser?: (id: string, newName: string) => Promise<void> | void;
  onDeleteAttendance?: (ids: string[]) => void;
  onSaveSettings?: (settings: SystemSettings) => Promise<void>;
  onUpdateWarehouseArea?: (id: string, newArea: string) => Promise<void>;
  onResetDatabase?: () => void;
  onImportDatabase?: (data: any) => Promise<void>;
}

export default function DashboardKepala({
  currentUser,
  reports,
  warehouses,
  tasks,
  users,
  attendanceList,
  systemSettings = defaultSystemSettings,
  onApproveReport,
  onRejectReport,
  onUpdateWarehouseStatus,
  onAddTask,
  onDeleteTask,
  onDeleteReport,
  onDeleteUser,
  onUpdateUser,
  onDeleteAttendance,
  onSaveSettings,
  onUpdateWarehouseArea,
  onResetDatabase,
  onImportDatabase
}: DashboardKepalaProps) {
  const [activeTab, setActiveTab] = useState<'MONITORING' | 'TASKS' | 'PETUGAS' | 'ABSENSI' | 'SETTINGS'>('MONITORING');
  const [periodFilter, setPeriodFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportPeriod, setExportPeriod] = useState<'TODAY' | 'WEEK' | 'MONTH'>('TODAY');

  // Cleaner management state
  const [cleanerSearch, setCleanerSearch] = useState('');
  const [editingCleaner, setEditingCleaner] = useState<User | null>(null);
  const [cleanerNameInput, setCleanerNameInput] = useState('');
  const [isUpdatingCleaner, setIsUpdatingCleaner] = useState(false);
  const [cleanerUpdateError, setCleanerUpdateError] = useState('');

  // Attendance logbook filters & state
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceTypeFilter, setAttendanceTypeFilter] = useState<'ALL' | 'MASUK' | 'KELUAR'>('ALL');
  const [selectedAttendancePhoto, setSelectedAttendancePhoto] = useState<string | null>(null);
  const [selectedAttendanceIds, setSelectedAttendanceIds] = useState<string[]>([]);

  // New task form state
  const [newTaskWarehouse, setNewTaskWarehouse] = useState('A');
  const [newTaskCleaner, setNewTaskCleaner] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [taskFormError, setTaskFormError] = useState('');

  // Auto-initialize first available cleaner
  React.useEffect(() => {
    const cleaners = users.filter(u => u.role === 'PETUGAS_KEBERSIHAN');
    if (cleaners.length > 0) {
      const isValid = cleaners.some(u => u.id === newTaskCleaner || u.email === newTaskCleaner);
      if (!isValid) {
        setNewTaskCleaner(cleaners[0].id);
      }
    }
  }, [users, newTaskCleaner]);

  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [activeWarehouseView, setActiveWarehouseView] = useState<string | null>(null);

  // States for editing warehouse status
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [tempStatus, setTempStatus] = useState<Warehouse['status']>('BERSIH');
  const [tempCleanedBy, setTempCleanedBy] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<'timestamp' | 'cleanerName'>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: 'timestamp' | 'cleanerName') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

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
      doc.text("Sistem Pemantauan Kebersihan Terpadu - Buku Absensi Petugas", 14, 25);
      doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 32);
      
      // Horizontal Rule
      doc.setDrawColor(39, 39, 42); // zinc-800
      doc.line(14, 49, 196, 49);
      
      // Subtitle
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59); // deep color
      doc.text("Buku Catatan Kehadiran Petugas Gudang", 14, 58);
      
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
      
      doc.save(`Buku_Absensi_Petugas_Gudang_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    }
  };

  const getIsInPeriod = (dateStr: string, period: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH') => {
    if (period === 'ALL') return true;
    const date = new Date(dateStr);
    const now = new Date();
    
    if (period === 'TODAY') {
      return date.toDateString() === now.toDateString();
    }
    
    const diffMs = now.getTime() - date.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    if (period === 'WEEK') {
      return diffDays <= 7;
    }
    if (period === 'MONTH') {
      return diffDays <= 30;
    }
    return true;
  };

  // Filter reports
  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.cleanerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesWarehouse = warehouseFilter === 'ALL' || report.warehouse === warehouseFilter;
    const matchesStatus = statusFilter === 'ALL' || report.status === statusFilter;
    const matchesPeriod = getIsInPeriod(report.timestamp, periodFilter);

    return matchesSearch && matchesWarehouse && matchesStatus && matchesPeriod;
  }).sort((a, b) => {
    if (sortField === 'timestamp') {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
    } else {
      return sortDirection === 'asc' 
        ? a.cleanerName.localeCompare(b.cleanerName)
        : b.cleanerName.localeCompare(a.cleanerName);
    }
  });

  // Calculate Metrics
  const totalWarehouses = warehouses.length;
  const cleanCount = warehouses.filter(w => w.status === 'BERSIH').length;
  const dirtyCount = warehouses.filter(w => w.status === 'KOTOR').length;
  const inProgressCount = warehouses.filter(w => w.status === 'DALAM_PENGERJAAN').length;
  const cleanPercentage = Math.round((cleanCount / totalWarehouses) * 100);

  const pendingReportsCount = reports.filter(r => r.status === 'PENDING').length;

  const getStatusBadgeClass = (status: Warehouse['status']) => {
    switch (status) {
      case 'BERSIH': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'KOTOR': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'DALAM_PENGERJAAN': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    }
  };

  const getReportStatusBadgeClass = (status: Report['status']) => {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'REJECTED': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'PENDING': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse';
    }
  };

  const getReportStatusLabel = (status: Report['status']) => {
    switch (status) {
      case 'APPROVED': return 'Disetujui';
      case 'REJECTED': return 'Ditolak';
      case 'PENDING': return 'Menunggu';
    }
  };

  const handleApprove = (reportId: string) => {
    onApproveReport(reportId, feedbackText);
    setSelectedReport(null);
    setFeedbackText('');
  };

  const handleReject = (reportId: string) => {
    onRejectReport(reportId, feedbackText);
    setSelectedReport(null);
    setFeedbackText('');
  };

  const handleOpenEditCleaner = (cleaner: User) => {
    setEditingCleaner(cleaner);
    setCleanerNameInput(cleaner.name);
    setCleanerUpdateError('');
  };

  const handleSaveCleanerName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCleaner) return;
    const trimmed = cleanerNameInput.trim();
    if (!trimmed) {
      setCleanerUpdateError('Nama petugas kebersihan tidak boleh kosong.');
      return;
    }
    if (trimmed.length < 2) {
      setCleanerUpdateError('Nama petugas minimal 2 karakter.');
      return;
    }

    try {
      setIsUpdatingCleaner(true);
      setCleanerUpdateError('');
      if (onUpdateUser) {
        await onUpdateUser(editingCleaner.id, trimmed);
      }
      setEditingCleaner(null);
    } catch (err) {
      console.error('Failed to update cleaner name:', err);
      setCleanerUpdateError('Gagal memperbarui nama petugas. Silakan coba lagi.');
    } finally {
      setIsUpdatingCleaner(false);
    }
  };

  const alphabetList = Array.from({ length: 12 }, (_, i) => String.fromCharCode(65 + i)); // A to L

  return (
    <div className="space-y-7 max-w-7xl mx-auto px-1 md:px-0 font-sans">
      
      {/* Navigation Tabs for Kepala */}
      <div className="border-b border-zinc-900 flex space-x-6">
        <button
          onClick={() => setActiveTab('MONITORING')}
          className={`pb-3.5 text-sm font-bold relative transition-all cursor-pointer flex items-center space-x-2 outline-none ${
            activeTab === 'MONITORING' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-200'
          }`}
          id="tab-monitoring"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Pemantauan &amp; Laporan</span>
          {activeTab === 'MONITORING' && (
            <motion.div layoutId="activeTabUnderlineKepala" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('TASKS')}
          className={`pb-3.5 text-sm font-bold relative transition-all cursor-pointer flex items-center space-x-2 outline-none ${
            activeTab === 'TASKS' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-200'
          }`}
          id="tab-tasks-kepala"
        >
          <ClipboardList className="w-4 h-4" />
          <span>Atur Tugas Petugas ({tasks.length})</span>
          {activeTab === 'TASKS' && (
            <motion.div layoutId="activeTabUnderlineKepala" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('PETUGAS')}
          className={`pb-3.5 text-sm font-bold relative transition-all cursor-pointer flex items-center space-x-2 outline-none ${
            activeTab === 'PETUGAS' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-200'
          }`}
          id="tab-users-kepala"
        >
          <UserCheck className="w-4 h-4" />
          <span>Kelola Petugas Gudang ({users.filter(u => u.role === 'PETUGAS_KEBERSIHAN').length})</span>
          {activeTab === 'PETUGAS' && (
            <motion.div layoutId="activeTabUnderlineKepala" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('ABSENSI')}
          className={`pb-3.5 text-sm font-bold relative transition-all cursor-pointer flex items-center space-x-2 outline-none ${
            activeTab === 'ABSENSI' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-200'
          }`}
          id="tab-attendance-kepala"
        >
          <UserCheck className="w-4 h-4" />
          <span>Buku Absen Petugas ({attendanceList.length})</span>
          {activeTab === 'ABSENSI' && (
            <motion.div layoutId="activeTabUnderlineKepala" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('SETTINGS')}
          className={`pb-3.5 text-sm font-bold relative transition-all cursor-pointer flex items-center space-x-2 outline-none ${
            activeTab === 'SETTINGS' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-200'
          }`}
          id="tab-settings-kepala"
        >
          <Settings className="w-4 h-4" />
          <span>Pengaturan Sistem</span>
          {activeTab === 'SETTINGS' && (
            <motion.div layoutId="activeTabUnderlineKepala" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'MONITORING' && (
          <motion.div
            key="monitoring-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-7"
          >
            {/* Overview/Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Unified Cleanliness & Status Breakdown Card */}
              <div className="p-5 bg-zinc-900/20 border border-zinc-900/80 rounded-2xl flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Ringkasan Kebersihan Gudang</span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-extrabold text-white tracking-tight">{cleanPercentage}%</span>
                    <span className="text-xs text-emerald-400 font-bold">Lolos Standar Bersih</span>
                  </div>
                  <div className="w-full bg-zinc-950/60 rounded-full h-2 border border-zinc-900 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${cleanPercentage}%` }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-850/60 text-center">
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase font-bold">Bersih</span>
                    <span className="text-sm font-extrabold text-emerald-400 font-mono">{cleanCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase font-bold">Proses</span>
                    <span className="text-sm font-extrabold text-amber-400 font-mono">{inProgressCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase font-bold">Kotor</span>
                    <span className="text-sm font-extrabold text-rose-400 font-mono">{dirtyCount}</span>
                  </div>
                </div>
              </div>

              {/* Pending Verification Card */}
              <div className="p-5 bg-zinc-900/20 border border-zinc-900/80 rounded-2xl flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-3.5">
                    <span className={`text-4xl font-black font-mono tracking-tight ${pendingReportsCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {pendingReportsCount}
                    </span>
                    <div>
                      <span className="text-[10px] text-zinc-400 font-medium">
                        {pendingReportsCount > 0 
                          ? 'Perlu segera diperiksa dan disetujui hari ini'
                          : 'Semua pekerjaan petugas telah selesai dikonfirmasi'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-zinc-850/60 flex items-center justify-between text-xs text-zinc-400">
                  <span>Pemberitahuan Sistem</span>
                  {pendingReportsCount > 0 ? (
                    <span className="text-amber-400 font-bold animate-pulse flex items-center space-x-1">
                      <span>●</span> <span>Ada Laporan Masuk</span>
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-bold flex items-center space-x-1">
                      <span>✓</span> <span>Selesai Semua</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Grid Gudang A - L */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-zinc-200">
                  <LayoutDashboard className="w-5 h-5 text-emerald-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
                {warehouses.map((w) => {
                  const isSelected = warehouseFilter === w.id;
                  return (
                    <motion.div
                      key={w.id}
                      whileHover={{ y: -3, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setWarehouseFilter(warehouseFilter === w.id ? 'ALL' : w.id);
                        }
                      }}
                      onClick={() => {
                        setWarehouseFilter(warehouseFilter === w.id ? 'ALL' : w.id);
                      }}
                      className={`p-4 rounded-xl border text-left transition-all relative cursor-pointer outline-none ${
                        isSelected 
                          ? 'bg-emerald-950/15 border-emerald-500 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/20' 
                          : 'bg-zinc-900/30 hover:bg-zinc-900/60 border-zinc-900'
                      }`}
                      id={`warehouse-card-${w.id}`}
                    >
                      {/* Cleanliness Indicator */}
                      <div className="absolute top-4 right-4">
                        <span className={`w-2 h-2 rounded-full block ${
                          w.status === 'BERSIH' ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 
                          w.status === 'DALAM_PENGERJAAN' ? 'bg-amber-400 shadow-sm shadow-amber-400/50' : 'bg-rose-500 shadow-sm'
                        }`} />
                      </div>

                      <span className="block font-black text-white text-lg tracking-tight font-display">Gudang {w.id}</span>
                      <span className="block text-[10px] text-zinc-500 mt-0.5 truncate font-sans max-w-[80%]" title={w.area}>
                        {w.area}
                      </span>

                      <div className="mt-4 pt-2.5 border-t border-zinc-900 flex items-center justify-between">
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded flex items-center space-x-1 ${getStatusBadgeClass(w.status)}`}>
                          <span>{w.status === 'BERSIH' ? 'Bersih' : w.status === 'DALAM_PENGERJAAN' ? 'Proses' : 'Kotor'}</span>
                        </span>
                        
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingWarehouse(w);
                            setTempStatus(w.status);
                            setTempCleanedBy(w.lastCleanedBy || '');
                          }}
                          className="p-1 px-2.5 bg-zinc-800/80 hover:bg-emerald-500 hover:text-zinc-950 text-zinc-300 text-[9px] font-bold rounded-lg transition-all cursor-pointer border border-zinc-700/40 uppercase tracking-wider flex items-center"
                          id={`edit-status-btn-${w.id}`}
                          title="Ubah Status Gudang"
                        >
                          <span>Ubah</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Main Report Table Container */}
            <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl shadow-xl overflow-hidden animate-none" id="reports-table-container">
              
              {/* Table Filters & Search Header */}
              <div className="p-5 border-b border-zinc-900 bg-zinc-950/20 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3.5 md:space-y-0">
                  <div>
                    <h3 className="font-extrabold font-display text-white text-lg flex items-center space-x-2">
                      <span>Daftar Laporan &amp; Pemantauan</span>
                      {warehouseFilter !== 'ALL' && (
                        <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold font-mono uppercase">
                          Gudang {warehouseFilter} Only
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Gunakan filter di bawah untuk meninjau detail lampiran foto sebelum dan sesudah pengerjaan.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 self-stretch md:self-auto">
                    {/* Unduh Laporan Audit Button */}
                    <button
                      onClick={() => setIsExportModalOpen(true)}
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-extrabold rounded-lg flex items-center space-x-1.5 cursor-pointer transition-all shadow-md shadow-emerald-500/10 hover:scale-[1.02] active:scale-[0.98]"
                      id="btn-trigger-export-reports"
                    >
                      <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                      <span>Unduh Laporan Audit</span>
                    </button>

                    {/* Reset filter */}
                    {(warehouseFilter !== 'ALL' || statusFilter !== 'ALL' || searchTerm) && (
                      <button
                        onClick={() => {
                          setWarehouseFilter('ALL');
                          setStatusFilter('ALL');
                          setSearchTerm('');
                        }}
                        className="px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-lg border border-zinc-850 flex items-center space-x-1 cursor-pointer transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reset Filter</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Search staff or desc */}
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 pointer-events-none">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="Cari nama petugas / keterangan..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-xl text-xs text-zinc-200 placeholder-zinc-700 outline-none transition-all"
                      id="search-reports-input"
                    />
                  </div>

                  {/* Warehouse Filter Selector */}
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-zinc-500 text-xs font-semibold">Gudang:</span>
                    <select
                      value={warehouseFilter}
                      onChange={(e) => setWarehouseFilter(e.target.value)}
                      className="w-full pl-18 pr-4 py-2 bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl text-xs text-zinc-200 outline-none appearance-none cursor-pointer transition-all"
                      id="warehouse-filter-select"
                    >
                      <option value="ALL">Semua Gudang (A-L)</option>
                      {alphabetList.map((code) => (
                        <option key={code} value={code}>Gudang {code}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter Selector */}
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-zinc-500 text-xs font-semibold">Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full pl-16 pr-4 py-2 bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl text-xs text-zinc-200 outline-none appearance-none cursor-pointer transition-all"
                      id="status-filter-select"
                    >
                      <option value="ALL">Semua Status</option>
                      <option value="PENDING">Menunggu Verifikasi</option>
                      <option value="APPROVED">Telah Disetujui</option>
                      <option value="REJECTED">Ditolak / Revisi</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Reports List / Table Grid */}
              <div className="overflow-x-auto">
                {filteredReports.length === 0 ? (
                  <div className="p-12 text-center bg-zinc-900/10">
                    <AlertTriangle className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                    <h4 className="font-bold text-white mb-1">Laporan Tidak Ditemukan</h4>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                      Tidak ada laporan yang sesuai dengan pencarian atau filter yang Anda tetapkan. Silakan ubah filter Anda.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* DESKTOP TABLE VIEW */}
                    <table className="w-full text-left border-collapse hidden md:table" id="desktop-reports-table">
                      <thead>
                        <tr className="bg-zinc-950/40 border-b border-zinc-900 text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
                          <th 
                            onClick={() => handleSort('cleanerName')}
                            className="py-3.5 px-5 cursor-pointer hover:text-zinc-200 transition-colors"
                          >
                            <div className="flex items-center space-x-1">
                              <span>Petugas Kebersihan</span>
                              <ArrowUpDown className="w-3 h-3" />
                            </div>
                          </th>
                          <th className="py-3.5 px-4 text-center">Gudang</th>
                          <th className="py-3.5 px-4 w-[40%]">Keterangan Pengerjaan</th>
                          <th className="py-3.5 px-4 text-center">Lampiran Foto (Sebelum &amp; Sesudah)</th>
                          <th 
                            onClick={() => handleSort('timestamp')}
                            className="py-3.5 px-4 cursor-pointer hover:text-zinc-200 transition-colors"
                          >
                            <div className="flex items-center space-x-1">
                              <span>Waktu Laporan</span>
                              <ArrowUpDown className="w-3 h-3" />
                            </div>
                          </th>
                          <th className="py-3.5 px-4 text-center">Status</th>
                          <th className="py-3.5 px-5 text-right">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900 text-xs">
                        {filteredReports.map((report) => (
                          <tr 
                            key={report.id} 
                            className="hover:bg-zinc-900/10 transition-colors"
                            id={`row-report-${report.id}`}
                          >
                            {/* Name Column */}
                            <td className="py-4 px-5">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-300">
                                  {report.cleanerName.charAt(0)}
                                </div>
                                <div>
                                  <span className="font-semibold text-zinc-100 block">{report.cleanerName}</span>
                                  <span className="text-[10px] text-zinc-500 font-mono block">{report.cleanerEmail}</span>
                                </div>
                              </div>
                            </td>

                            {/* Warehouse Column */}
                            <td className="py-4 px-4 text-center">
                              <span className="inline-flex justify-center items-center w-8 h-8 rounded-lg bg-zinc-950 font-black text-zinc-200 border border-zinc-900">
                                {report.warehouse}
                              </span>
                            </td>

                            {/* Description Column */}
                            <td className="py-4 px-4">
                              <p className="text-zinc-300 font-medium leading-relaxed line-clamp-2" title={report.description}>
                                {report.description}
                              </p>
                              {report.feedback && (
                                <span className="inline-block mt-1 text-[10px] text-emerald-400 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10 italic">
                                  Komentar: &quot;{report.feedback}&quot;
                                </span>
                              )}
                            </td>

                            {/* Photo Attachments Column */}
                            <td className="py-4 px-4">
                              <div className="flex justify-center items-center space-x-3">
                                <div className="relative cursor-pointer group" onClick={() => setSelectedReport(report)}>
                                  <img
                                    src={report.photoBefore}
                                    alt="Sebelum"
                                    className="w-12 h-12 rounded object-cover border border-zinc-900 hover:border-zinc-700 transition-all shadow-sm"
                                    referrerPolicy="no-referrer"
                                  />
                                  <span className="absolute bottom-0 right-0 bg-rose-600 text-[6px] text-white font-extrabold px-0.5 rounded">BEFORE</span>
                                </div>
                                <div className="relative cursor-pointer group" onClick={() => setSelectedReport(report)}>
                                  <img
                                    src={report.photoAfter}
                                    alt="Sesudah"
                                    className="w-12 h-12 rounded object-cover border border-zinc-900 hover:border-zinc-700 transition-all shadow-sm"
                                    referrerPolicy="no-referrer"
                                  />
                                  <span className="absolute bottom-0 right-0 bg-emerald-600 text-[6px] text-white font-extrabold px-0.5 rounded">AFTER</span>
                                </div>
                              </div>
                            </td>

                            {/* Timestamp Column */}
                            <td className="py-4 px-4 text-zinc-450 font-medium">
                              <span className="block text-zinc-200">
                                {new Date(report.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                              </span>
                              <span className="block text-[10px] text-zinc-550 mt-0.5 font-mono">
                                {new Date(report.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                              </span>
                            </td>

                            {/* Status Column */}
                            <td className="py-4 px-4 text-center">
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${getReportStatusBadgeClass(report.status)}`}>
                                {getReportStatusLabel(report.status)}
                              </span>
                            </td>

                            {/* Action Column */}
                            <td className="py-4 px-5 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                {report.status === 'PENDING' ? (
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setSelectedReport(report)}
                                    className="inline-flex items-center space-x-1.5 py-1.5 px-3.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-[10px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer border-none"
                                    id={`verify-btn-${report.id}`}
                                  >
                                    <span>Periksa</span>
                                    <Eye className="w-3.5 h-3.5" />
                                  </motion.button>
                                ) : (
                                  <button
                                    onClick={() => setSelectedReport(report)}
                                    className="p-1.5 hover:bg-zinc-800 text-zinc-350 hover:text-zinc-100 rounded-lg transition-all inline-flex cursor-pointer"
                                    title="Tinjau Laporan"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onDeleteReport(report.id)}
                                  className="p-1.5 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 rounded-lg transition-all inline-flex cursor-pointer"
                                  title="Hapus Laporan"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* MOBILE RESPONSIVE CARD VIEW (Fits standard mobile constraints gracefully) */}
                    <div className="grid grid-cols-1 gap-4 p-4 md:hidden" id="mobile-reports-list">
                      {filteredReports.map((report) => (
                        <div
                          key={report.id}
                          className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-3"
                          id={`mobile-report-card-${report.id}`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-300 text-xs">
                                {report.cleanerName.charAt(0)}
                              </div>
                              <div>
                                <span className="font-bold text-white text-xs block">{report.cleanerName}</span>
                                <span className="text-[9px] text-zinc-550 font-mono block">
                                  {new Date(report.timestamp).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })} WIB
                                </span>
                              </div>
                            </div>
                            <span className="inline-flex items-center w-7 h-7 rounded bg-zinc-950 font-extrabold text-zinc-200 border border-zinc-900 text-xs justify-center shrink-0">
                              {report.warehouse}
                            </span>
                          </div>

                          <p className="text-zinc-300 text-xs font-medium leading-relaxed pl-1">
                            {report.description}
                          </p>

                          {/* Previews before &amp; after */}
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="relative cursor-pointer rounded-lg overflow-hidden border border-zinc-900" onClick={() => setSelectedReport(report)}>
                              <img
                                src={report.photoBefore}
                                alt="Sebelum"
                                className="w-full h-20 object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <span className="absolute bottom-1 right-1 bg-rose-600 text-[6px] text-white font-extrabold px-1 rounded">BEFORE</span>
                            </div>
                            <div className="relative cursor-pointer rounded-lg overflow-hidden border border-zinc-900" onClick={() => setSelectedReport(report)}>
                              <img
                                src={report.photoAfter}
                                alt="Sesudah"
                                className="w-full h-20 object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <span className="absolute bottom-1 right-1 bg-emerald-600 text-[6px] text-white font-extrabold px-1 rounded">AFTER</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-zinc-850 pt-2.5">
                            <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${getReportStatusBadgeClass(report.status)}`}>
                              {getReportStatusLabel(report.status)}
                            </span>
                            
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => setSelectedReport(report)}
                                className="py-1 px-2.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-[10px] font-bold rounded-lg transition-all cursor-pointer border border-zinc-800"
                                id={`mobile-action-${report.id}`}
                              >
                                {report.status === 'PENDING' ? 'Periksa Laporan' : 'Lihat Detail'}
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteReport(report.id)}
                                className="p-1.5 bg-rose-950/15 border border-rose-900/30 text-rose-400 hover:bg-rose-500 hover:text-zinc-950 rounded-lg transition-all cursor-pointer"
                                title="Hapus Laporan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'TASKS' && (
          <motion.div
            key="tasks-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="max-w-xl mx-auto w-full"
          >
            {/* Form to Assign Task */}
            <div className="space-y-4">
              <div className="p-5 bg-zinc-900/20 border border-zinc-900/80 rounded-2xl space-y-4">
                <div>
                  <h3 className="font-extrabold font-display text-white text-base flex items-center space-x-2">
                    <Plus className="w-4.5 h-4.5 text-emerald-400" />
                    <span>Buat Instruksi Baru</span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Kirim tugas kebersihan ke daftar tugas harian petugas secara real-time.
                  </p>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!newTaskName.trim()) {
                    setTaskFormError('Nama tugas wajib diisi.');
                    return;
                  }
                  
                  // Find selected user by ID or email (for backward compatibility)
                  const selectedUser = users.find(u => u.id === newTaskCleaner || u.email === newTaskCleaner);
                  if (!selectedUser) {
                    setTaskFormError('Silakan pilih petugas kebersihan.');
                    return;
                  }

                  setTaskFormError('');
                  onAddTask({
                    warehouse: newTaskWarehouse,
                    taskName: newTaskName,
                    description: newTaskDescription,
                    assignedToEmail: selectedUser.email,
                    assignedToUserId: selectedUser.id,
                    assignedToName: selectedUser.name
                  });
                  setNewTaskName('');
                  setNewTaskDescription('');
                }} className="space-y-4">
                  
                  {/* Error Validation Message */}
                  {taskFormError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-semibold">
                      {taskFormError}
                    </div>
                  )}

                  {/* Select Warehouse */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      Pilih Gudang (A - L)
                    </label>
                    <select
                      value={newTaskWarehouse}
                      onChange={(e) => setNewTaskWarehouse(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl text-xs text-zinc-200 outline-none cursor-pointer transition-all"
                    >
                      {alphabetList.map((code) => (
                        <option key={code} value={code}>Gudang {code}</option>
                      ))}
                    </select>
                  </div>

                  {/* Select Cleaner */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      Petugas Kebersihan
                    </label>
                    <div className="space-y-2">
                      {users.filter(u => u.role === 'PETUGAS_KEBERSIHAN').length === 0 ? (
                        <p className="text-xs text-zinc-500 py-2 italic font-sans leading-relaxed">
                          Belum ada petugas kebersihan yang terdaftar dalam sistem. Mintalah petugas untuk membuat akun baru pada halaman login agar dapat ditugaskan.
                        </p>
                      ) : (
                        users.filter(u => u.role === 'PETUGAS_KEBERSIHAN').map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => setNewTaskCleaner(u.id)}
                            className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                              newTaskCleaner === u.id
                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                : 'bg-zinc-950/50 border-zinc-900 text-zinc-400 hover:border-zinc-800'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5">
                              <img
                                src={u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=80'}
                                alt={u.name}
                                className="w-6 h-6 rounded-full object-cover border border-zinc-850"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <span className="text-xs font-bold block text-zinc-100">{u.name}</span>
                                <span className="text-[9px] text-emerald-400/80 font-bold uppercase block tracking-wide mt-0.5">Petugas Gudang</span>
                              </div>
                            </div>
                            {newTaskCleaner === u.id && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Task Name */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      Nama Tugas
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Sapu Lorong Elektronik"
                      value={newTaskName}
                      onChange={(e) => {
                        setNewTaskName(e.target.value);
                        if (taskFormError) setTaskFormError('');
                      }}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl text-xs text-zinc-200 placeholder-zinc-700 outline-none transition-all"
                      required
                    />
                  </div>

                  {/* Task Description */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      Instruksi Khusus / Detail (Opsional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Tulis instruksi pengerjaan secara detail..."
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl text-xs text-zinc-200 placeholder-zinc-700 outline-none transition-all resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/10 transition-all border-none flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Kirim Instruksi Tugas</span>
                  </motion.button>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'PETUGAS' && (
          <motion.div
            key="petugas-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-5">
                <div>
                  <h3 className="font-extrabold font-display text-white text-lg flex items-center space-x-2">
                    <UserCheck className="w-5 h-5 text-emerald-400" />
                    <span>Daftar Petugas Kebersihan</span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Kelola seluruh petugas kebersihan yang terdaftar dalam sistem. Anda dapat mengedit nama petugas atau menghapus akun dari sistem.
                  </p>
                </div>

                {/* Cleaner Search Input */}
                <div className="flex items-center space-x-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="w-4 h-4 text-zinc-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={cleanerSearch}
                      onChange={(e) => setCleanerSearch(e.target.value)}
                      placeholder="Cari nama atau email..."
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-700 outline-none transition-all font-medium"
                    />
                  </div>
                  {cleanerSearch && (
                    <button
                      onClick={() => setCleanerSearch('')}
                      className="px-2.5 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {(() => {
                const cleaners = users.filter(u => u.role === 'PETUGAS_KEBERSIHAN');
                const filtered = cleaners.filter(u => {
                  const q = cleanerSearch.toLowerCase();
                  return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
                });

                if (cleaners.length === 0) {
                  return (
                    <div className="p-12 text-center bg-zinc-900/10 rounded-xl border border-zinc-900">
                      <AlertTriangle className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                      <h4 className="font-bold text-white mb-1">Tidak Ada Petugas Terdaftar</h4>
                      <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                        Belum ada petugas kebersihan yang terdaftar. Petugas baru dapat membuat akun melalui formulir pendaftaran di halaman login.
                      </p>
                    </div>
                  );
                }

                if (filtered.length === 0) {
                  return (
                    <div className="p-10 text-center bg-zinc-900/10 rounded-xl border border-zinc-900 border-dashed">
                      <Search className="w-10 h-10 text-zinc-700 mx-auto mb-2.5" />
                      <h4 className="font-bold text-zinc-300 text-sm mb-1">Petugas Tidak Ditemukan</h4>
                      <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                        Tidak ada petugas kebersihan yang sesuai dengan kata kunci pencarian "{cleanerSearch}".
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((u) => {
                      const totalCleanerReports = reports.filter(r => r.cleanerEmail === u.email || r.cleanerName === u.name).length;
                      const totalCleanerTasks = tasks.filter(t => t.assignedToUserId === u.id || t.assignedToEmail === u.email).length;
                      const totalCleanerAttendance = attendanceList.filter(a => a.userId === u.id || a.userEmail === u.email).length;

                      return (
                        <div 
                          key={u.id}
                          className="p-4.5 bg-zinc-950/40 border border-zinc-900 rounded-xl flex flex-col justify-between hover:border-zinc-800 transition-all space-y-4 group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="relative">
                                <img
                                  src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
                                  alt={u.name}
                                  className="w-12 h-12 rounded-full object-cover border border-zinc-800 shadow-md"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-zinc-950 rounded-full" />
                              </div>
                              <div>
                                <h4 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">
                                  {u.name}
                                </h4>
                                <span className="text-[10px] text-zinc-500 block font-mono leading-relaxed truncate max-w-[170px]">
                                  {u.email}
                                </span>
                                <span className="inline-block text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase mt-1 border border-emerald-500/10">
                                  Petugas Kebersihan
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Quick Stats Grid */}
                          <div className="grid grid-cols-3 gap-2 py-2 px-2.5 bg-zinc-900/30 rounded-lg border border-zinc-900/60 text-center">
                            <div>
                              <span className="block text-[10px] text-zinc-500 uppercase font-mono">Laporan</span>
                              <span className="font-bold text-xs text-zinc-200 font-mono">{totalCleanerReports}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-zinc-500 uppercase font-mono">Tugas</span>
                              <span className="font-bold text-xs text-zinc-200 font-mono">{totalCleanerTasks}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-zinc-500 uppercase font-mono">Absen</span>
                              <span className="font-bold text-xs text-zinc-200 font-mono">{totalCleanerAttendance}</span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-2 border-t border-zinc-900 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditCleaner(u)}
                              className="flex-1 py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-zinc-950 border border-emerald-500/20 hover:border-emerald-500 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-sm"
                              title="Edit Nama Petugas"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit Nama</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onDeleteUser(u.id)}
                              className="p-1.5 px-2.5 hover:bg-rose-500/15 hover:text-rose-400 text-zinc-500 rounded-lg transition-all cursor-pointer border border-transparent hover:border-rose-900/30"
                              title="Hapus Petugas"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}

        {activeTab === 'ABSENSI' && (
          <motion.div
            key="absensi-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-5">
                <div>
                  <h3 className="font-extrabold font-display text-white text-lg flex items-center space-x-2">
                    <UserCheck className="w-5 h-5 text-emerald-400" />
                    <span>Buku Absen Petugas Gudang</span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Catatan kehadiran dan foto diri petugas kebersihan saat masuk dan pulang kerja.
                  </p>
                </div>
                
                {/* Search & Filter Controls */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  {/* Search Input */}
                  <input
                    type="text"
                    value={attendanceSearch}
                    onChange={(e) => setAttendanceSearch(e.target.value)}
                    placeholder="Cari petugas atau lokasi..."
                    className="flex-1 md:w-56 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-xs text-zinc-200 placeholder-zinc-700 outline-none transition-all font-medium"
                  />
                  
                  {/* Type Filter Dropdown */}
                  <select
                    value={attendanceTypeFilter}
                    onChange={(e) => setAttendanceTypeFilter(e.target.value as any)}
                    className="bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none transition-all font-medium cursor-pointer"
                  >
                    <option value="ALL">Semua Tipe</option>
                    <option value="MASUK">Masuk Kerja</option>
                    <option value="KELUAR">Pulang Kerja</option>
                  </select>
                </div>
              </div>

              {/* Attendance Records List */}
              {(() => {
                const filteredAttendance = attendanceList.filter((log) => {
                  const query = attendanceSearch.toLowerCase();
                  const matchesSearch =
                    log.userName.toLowerCase().includes(query) ||
                    log.location.toLowerCase().includes(query);
                  const matchesType =
                    attendanceTypeFilter === 'ALL' || log.type === attendanceTypeFilter;
                  return matchesSearch && matchesType;
                }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                if (filteredAttendance.length === 0) {
                  return (
                    <div className="p-12 text-center bg-zinc-900/10 rounded-xl border border-zinc-900 border-dashed">
                      <UserCheck className="w-12 h-12 text-zinc-800 mx-auto mb-3 animate-pulse" />
                      <h4 className="font-bold text-zinc-300 text-sm mb-1">Tidak Ada Catatan Absensi</h4>
                      <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                        Belum ada data absensi yang sesuai dengan pencarian atau filter yang Anda terapkan.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900/10 border border-zinc-900 rounded-xl p-4">
                      <div className="flex items-center space-x-2 text-xs font-medium text-zinc-400">
                        <span>Terpilih:</span>
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 px-2 py-0.5 rounded font-bold font-mono">
                          {selectedAttendanceIds.length} dari {filteredAttendance.length}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Download PDF Button */}
                        <button
                          onClick={() => handleDownloadAttendancePDF(filteredAttendance)}
                          className="flex items-center space-x-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer shadow-lg shadow-emerald-500/5"
                        >
                          <Download className="w-4 h-4" />
                          <span>Unduh Buku Absen (PDF)</span>
                        </button>

                        {/* Hapus Terpilih Button */}
                        <button
                          disabled={selectedAttendanceIds.length === 0}
                          onClick={() => {
                            if (onDeleteAttendance) {
                              onDeleteAttendance(selectedAttendanceIds);
                              setSelectedAttendanceIds([]);
                            }
                          }}
                          className={`flex items-center space-x-2 border rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                            selectedAttendanceIds.length === 0
                              ? 'bg-zinc-950 border-zinc-900 text-zinc-600 cursor-not-allowed'
                              : 'bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border-rose-500/20 shadow-lg shadow-rose-500/5'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Hapus Terpilih</span>
                        </button>

                        {/* Hapus Semua Button */}
                        <button
                          onClick={() => {
                            if (onDeleteAttendance) {
                              onDeleteAttendance(filteredAttendance.map(f => f.id));
                              setSelectedAttendanceIds([]);
                            }
                          }}
                          className="flex items-center space-x-2 bg-rose-500/5 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-950/40 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer hover:border-transparent"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          <span>Hapus Semua</span>
                        </button>
                      </div>
                    </div>

                    {/* Table Container */}
                    <div className="w-full overflow-hidden border border-zinc-900 rounded-xl bg-zinc-950/20">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-900 bg-zinc-900/40 text-[10px] font-black uppercase tracking-wider text-zinc-500 font-mono">
                              <th className="py-3.5 px-4 text-center w-10">
                                <input
                                  type="checkbox"
                                  checked={filteredAttendance.length > 0 && selectedAttendanceIds.length === filteredAttendance.length}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedAttendanceIds(filteredAttendance.map(f => f.id));
                                    } else {
                                      setSelectedAttendanceIds([]);
                                    }
                                  }}
                                  className="accent-emerald-500 rounded border-zinc-800 bg-zinc-950 text-emerald-500 h-3.5 w-3.5 cursor-pointer focus:ring-0"
                                />
                              </th>
                              <th className="py-3.5 px-4 text-center w-12">No</th>
                              <th className="py-3.5 px-4">Nama Petugas</th>
                              <th className="py-3.5 px-4 text-center">Tipe Absen</th>
                              <th className="py-3.5 px-4">Lokasi</th>
                              <th className="py-3.5 px-4">Tanggal & Waktu</th>
                              <th className="py-3.5 px-4 text-center w-28">Foto Selfie</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900/60 text-xs">
                            {filteredAttendance.map((log, index) => {
                              const isMasuk = log.type === 'MASUK';
                              const dateObj = new Date(log.timestamp);
                              const formattedDate = dateObj.toLocaleDateString('id-ID', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              });

                              return (
                                <tr
                                  key={log.id}
                                  className={`hover:bg-zinc-900/20 transition-all group ${
                                    selectedAttendanceIds.includes(log.id) ? 'bg-zinc-900/10' : ''
                                  }`}
                                >
                                  <td className="py-3.5 px-4 text-center w-10">
                                    <input
                                      type="checkbox"
                                      checked={selectedAttendanceIds.includes(log.id)}
                                      onChange={() => {
                                        if (selectedAttendanceIds.includes(log.id)) {
                                          setSelectedAttendanceIds(selectedAttendanceIds.filter(id => id !== log.id));
                                        } else {
                                          setSelectedAttendanceIds([...selectedAttendanceIds, log.id]);
                                        }
                                      }}
                                      className="accent-emerald-500 rounded border-zinc-800 bg-zinc-950 text-emerald-500 h-3.5 w-3.5 cursor-pointer focus:ring-0"
                                    />
                                  </td>
                                  <td className="py-3.5 px-4 text-center font-mono font-bold text-zinc-600">
                                    {index + 1}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <div>
                                      <span className="font-bold text-zinc-200 block group-hover:text-emerald-400 transition-colors">
                                        {log.userName}
                                      </span>
                                      <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                                        {log.userEmail}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded ${
                                      isMasuk
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                                    }`}>
                                      {isMasuk ? 'MASUK' : 'KELUAR'}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center space-x-1.5 text-zinc-300 font-medium">
                                      <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                      <span>{log.location}</span>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <div>
                                      <span className="text-zinc-300 font-semibold block">{formattedDate}</span>
                                      <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">{log.time} WIB</span>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <div className="flex justify-center">
                                      <div
                                        onClick={() => setSelectedAttendancePhoto(log.photo)}
                                        className="relative w-12 h-9 rounded overflow-hidden border border-zinc-900 cursor-pointer group/att-pic shrink-0"
                                      >
                                        <img
                                          src={log.photo}
                                          alt={`Selfie ${log.userName}`}
                                          className="w-full h-full object-cover transition-transform duration-300 group-hover/att-pic:scale-110"
                                          referrerPolicy="no-referrer"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/att-pic:opacity-100 flex items-center justify-center transition-all">
                                          <Eye className="w-3.5 h-3.5 text-white" />
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
                );
              })()}
            </div>
          </motion.div>
        )}

        {activeTab === 'SETTINGS' && (
          <motion.div
            key="settings-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <DashboardSettings
              systemSettings={systemSettings}
              warehouses={warehouses}
              users={users}
              reports={reports}
              tasks={tasks}
              attendanceList={attendanceList}
              onSaveSettings={onSaveSettings || (async () => {})}
              onUpdateWarehouseArea={onUpdateWarehouseArea || (async () => {})}
              onResetDatabase={onResetDatabase || (() => {})}
              onImportDatabase={onImportDatabase}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verification / Expand Detail Modal (Lightbox) */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedReport(null);
                setFeedbackText('');
              }}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-[#12131a] border border-zinc-800 rounded-2xl shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-y-auto p-6"
              id="verification-modal"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800 mb-4">
                <div className="flex items-center space-x-2.5 text-emerald-400">
                  <LayoutDashboard className="w-5 h-5" />
                  <div>
                    <h3 className="font-bold text-white text-base">Verifikasi Laporan Kebersihan</h3>
                    <span className="text-[10px] text-zinc-400 block font-medium">Gudang {selectedReport.warehouse}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedReport(null);
                    setFeedbackText('');
                  }}
                  className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Photos Side by Side */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Before */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Foto Sebelum (Kondisi Kotor)</span>
                    </div>
                    <div className="aspect-[4/3] rounded-xl overflow-hidden border border-rose-950/30 relative">
                      <img
                        src={selectedReport.photoBefore}
                        alt="Sebelum"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  {/* After */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Foto Sesudah (Hasil Pembersihan)</span>
                    </div>
                    <div className="aspect-[4/3] rounded-xl overflow-hidden border border-emerald-950/30 relative">
                      <img
                        src={selectedReport.photoAfter}
                        alt="Sesudah"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                </div>

                {/* Details Column */}
                <div className="p-4 bg-zinc-950/40 rounded-xl border border-zinc-850 space-y-3.5 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-zinc-500 font-semibold uppercase text-[9px] tracking-wider block">Petugas Kebersihan</span>
                      <span className="text-zinc-200 font-bold block mt-0.5">{selectedReport.cleanerName}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-semibold uppercase text-[9px] tracking-wider block">Waktu Pengiriman</span>
                      <span className="text-zinc-200 font-medium block mt-0.5 font-mono">
                        {new Date(selectedReport.timestamp).toLocaleString('id-ID')} WIB
                      </span>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-zinc-500 font-semibold uppercase text-[9px] tracking-wider block">Status Laporan</span>
                      <span className={`inline-block font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded mt-1 ${getReportStatusBadgeClass(selectedReport.status)}`}>
                        {getReportStatusLabel(selectedReport.status)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80">
                    <span className="text-zinc-500 font-semibold uppercase text-[9px] tracking-wider block">Keterangan Pekerjaan</span>
                    <p className="text-zinc-200 font-medium leading-relaxed block mt-0.5">
                      {selectedReport.description}
                    </p>
                  </div>
                </div>

                {/* Verification Actions (Only show if status is PENDING) */}
                {selectedReport.status === 'PENDING' ? (
                  <div className="pt-3 border-t border-zinc-800 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                        Tanggapan / Catatan Evaluasi (Opsional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Masukkan tanggapan atau evaluasi Anda (wajib diisi jika ditolak)..."
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl text-xs text-zinc-200 placeholder-zinc-700 outline-none transition-all resize-none"
                        id="verification-feedback"
                      />
                    </div>

                    <div className="flex items-center justify-end space-x-3">
                      {/* Reject Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!feedbackText.trim()) {
                            alert('Harap tuliskan alasan penolakan pada kolom tanggapan.');
                            return;
                          }
                          handleReject(selectedReport.id);
                        }}
                        className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs rounded-xl transition-all cursor-pointer border border-rose-500/20 flex items-center space-x-1.5"
                        id="reject-action-btn"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Tolak / Minta Revisi</span>
                      </button>

                      {/* Approve Button */}
                      <button
                        type="button"
                        onClick={() => handleApprove(selectedReport.id)}
                        className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/10 flex items-center space-x-1.5 transition-all cursor-pointer border-none"
                        id="approve-action-btn"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Setujui & Tandai Bersih</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  // Review Mode (Closed state show feedback if any)
                  selectedReport.feedback && (
                    <div className="p-3.5 bg-zinc-950/30 rounded-xl border border-zinc-800">
                      <span className="text-zinc-500 font-semibold uppercase text-[9px] tracking-wider block mb-1">Catatan Verifikasi Anda</span>
                      <p className="text-xs text-zinc-300 italic">
                        "{selectedReport.feedback}"
                      </p>
                    </div>
                  )
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Edit Status Gudang */}
      <AnimatePresence>
        {editingWarehouse && (
          <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingWarehouse(null)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-[#12131a] border border-zinc-800 rounded-2xl shadow-2xl z-10 flex flex-col p-6"
              id="edit-warehouse-modal"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800 mb-4">
                <div className="flex items-center space-x-2.5 text-emerald-400">
                  <SlidersHorizontal className="w-5 h-5" />
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Atur Status Gudang</h3>
                    <span className="text-[10px] text-zinc-400 block font-medium">Gudang {editingWarehouse.id} • {editingWarehouse.area}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingWarehouse(null)}
                  className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Selector Options */}
              <div className="space-y-4 my-2">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Pilih Status Kebersihan Baru
                </label>
                
                <div className="grid grid-cols-1 gap-2.5">
                  {/* Status BERSIH */}
                  <button
                    type="button"
                    onClick={() => setTempStatus('BERSIH')}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      tempStatus === 'BERSIH'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/5'
                        : 'bg-zinc-950/50 border-zinc-900 text-zinc-400 hover:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div>
                        <span className="text-xs font-bold block text-white">Bersih &amp; Rapi</span>
                        <span className="text-[10px] text-zinc-500 block mt-0.5">Lolos verifikasi kelayakan operasional.</span>
                      </div>
                    </div>
                    {tempStatus === 'BERSIH' && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </button>

                  {/* Status DALAM_PENGERJAAN */}
                  <button
                    type="button"
                    onClick={() => setTempStatus('DALAM_PENGERJAAN')}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      tempStatus === 'DALAM_PENGERJAAN'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-md shadow-amber-500/5'
                        : 'bg-zinc-950/50 border-zinc-900 text-zinc-400 hover:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div>
                        <span className="text-xs font-bold block text-white">Sedang Dibersihkan</span>
                        <span className="text-[10px] text-zinc-500 block mt-0.5">Petugas sedang melakukan pembersihan.</span>
                      </div>
                    </div>
                    {tempStatus === 'DALAM_PENGERJAAN' && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                  </button>

                  {/* Status KOTOR */}
                  <button
                    type="button"
                    onClick={() => setTempStatus('KOTOR')}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      tempStatus === 'KOTOR'
                        ? 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-md shadow-rose-500/5'
                        : 'bg-zinc-950/50 border-zinc-900 text-zinc-400 hover:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div>
                        <span className="text-xs font-bold block text-white">Kotor / Perlu Tindakan</span>
                        <span className="text-[10px] text-zinc-500 block mt-0.5">Area kotor dan butuh ditugaskan ke petugas.</span>
                      </div>
                    </div>
                    {tempStatus === 'KOTOR' && <Check className="w-4 h-4 text-rose-400 shrink-0" />}
                  </button>
                </div>
              </div>

              {/* Conditional Input for last cleaned by if state is BERSIH */}
              {tempStatus === 'BERSIH' && (
                <div className="space-y-2 mt-3 animate-none">
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Dibersihkan Oleh (Opsional)
                  </label>
                  <input
                    type="text"
                    value={tempCleanedBy}
                    onChange={(e) => setTempCleanedBy(e.target.value)}
                    placeholder="Masukkan nama petugas kebersihan..."
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl text-xs text-zinc-200 placeholder-zinc-700 outline-none transition-all"
                  />
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingWarehouse(null)}
                  className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl transition-all cursor-pointer border border-zinc-800"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onUpdateWarehouseStatus) {
                      onUpdateWarehouseStatus(editingWarehouse.id, tempStatus, tempCleanedBy || undefined);
                    }
                    setEditingWarehouse(null);
                  }}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/10 flex items-center space-x-1.5 transition-all cursor-pointer border-none"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Export Reports Modal for SIBA Logbook */}
      <AnimatePresence>
        {isExportModalOpen && (
          <ExportReportsModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            reports={reports}
            warehouses={warehouses}
            users={users}
            currentUser={currentUser}
            systemSettings={systemSettings}
          />
        )}
      </AnimatePresence>

      {/* Lightbox Modal for expanded Attendance Photo */}
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
                <span className="text-xs font-bold text-zinc-400">Pratinjau Foto Absensi</span>
                <button
                  onClick={() => setSelectedAttendancePhoto(null)}
                  className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="rounded-xl overflow-hidden aspect-[4/3] border border-zinc-850">
                <img
                  src={selectedAttendancePhoto}
                  alt="Foto Selfie Absen"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Cleaner Name Modal */}
      <AnimatePresence>
        {editingCleaner && (
          <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isUpdatingCleaner) {
                  setEditingCleaner(null);
                }
              }}
              className="absolute inset-0 bg-zinc-950/85 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-[#12131a] border border-zinc-800 rounded-2xl shadow-2xl p-6 z-10 flex flex-col"
              id="edit-cleaner-modal"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-5">
                <div className="flex items-center space-x-2.5 text-emerald-400">
                  <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Edit Nama Petugas</h3>
                    <span className="text-[10px] text-zinc-400 block font-mono">
                      {editingCleaner.email}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isUpdatingCleaner}
                  onClick={() => setEditingCleaner(null)}
                  className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Edit Cleaner Form */}
              <form onSubmit={handleSaveCleanerName} className="space-y-4">
                {/* Profile Snapshot */}
                <div className="flex items-center space-x-3.5 p-3.5 bg-zinc-950/60 border border-zinc-900 rounded-xl">
                  <img
                    src={editingCleaner.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
                    alt={editingCleaner.name}
                    className="w-12 h-12 rounded-full object-cover border border-zinc-800"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <span className="text-[10px] text-zinc-500 font-mono uppercase block">Identitas Akun</span>
                    <span className="font-bold text-white text-sm block">{editingCleaner.name}</span>
                    <span className="text-[10px] text-emerald-400 block font-medium">Petugas Kebersihan Gudang</span>
                  </div>
                </div>

                {/* Input Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-300">
                    Nama Lengkap Petugas <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={cleanerNameInput}
                    onChange={(e) => {
                      setCleanerNameInput(e.target.value);
                      if (cleanerUpdateError) setCleanerUpdateError('');
                    }}
                    placeholder="Contoh: Budi Santoso"
                    disabled={isUpdatingCleaner}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl text-sm text-zinc-200 placeholder-zinc-700 outline-none transition-all font-medium disabled:opacity-50"
                  />
                </div>

                {/* Error Banner */}
                {cleanerUpdateError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{cleanerUpdateError}</span>
                  </div>
                )}

                {/* Info Note */}
                <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl text-[11px] text-zinc-400 flex items-start space-x-2">
                  <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Perubahan nama akan otomatis diperbarui pada daftar penugasan, riwayat laporan kebersihan, dan log absensi.
                  </span>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-zinc-800/80 mt-4">
                  <button
                    type="button"
                    disabled={isUpdatingCleaner}
                    onClick={() => setEditingCleaner(null)}
                    className="px-4 py-2.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl transition-all cursor-pointer border border-zinc-800 disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingCleaner || !cleanerNameInput.trim()}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/10 flex items-center space-x-1.5 transition-all cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingCleaner ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Simpan Nama Petugas</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
