import React, { useState, useRef, useMemo } from 'react';
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
  Pencil,
  Camera,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  RotateCcw,
  Calendar,
  CalendarDays,
  Users,
  FileText,
  Layers,
  Filter,
  Briefcase,
  CheckSquare,
  CheckCheck
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Report, Warehouse, User, Task, Attendance, SystemSettings } from '../types';
import { defaultSystemSettings } from '../mockData';
import ExportReportsModal from './ExportReportsModal';
import DashboardSettings from './DashboardSettings';
import { AttendanceLocationModal } from './AttendanceLocationModal';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=300',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=300',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=300',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=300',
];

const compressAvatar = (base64Str: string, maxDim = 400, quality = 0.8): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

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
  onUpdateUser?: (id: string, updates: { name?: string; avatarUrl?: string }) => Promise<void> | void;
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
  
  // Date & Period Filter State (Per Tanggal)
  const [dateFilterMode, setDateFilterMode] = useState<'TODAY' | 'YESTERDAY' | 'LAST_7' | 'LAST_30' | 'CUSTOM' | 'ALL'>('TODAY');
  const [customSelectedDate, setCustomSelectedDate] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [monitoringSubTab, setMonitoringSubTab] = useState<'REPORTS_AND_AREAS' | 'SUMMARY_BY_CLEANER' | 'SUMMARY_BY_WAREHOUSE'>('REPORTS_AND_AREAS');
  const [cleanerFilter, setCleanerFilter] = useState<string>('ALL');

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportPeriod, setExportPeriod] = useState<'TODAY' | 'WEEK' | 'MONTH'>('TODAY');

  // Cleaner management state
  const [cleanerSearch, setCleanerSearch] = useState('');
  const [editingCleaner, setEditingCleaner] = useState<User | null>(null);
  const [cleanerNameInput, setCleanerNameInput] = useState('');
  const [cleanerAvatarInput, setCleanerAvatarInput] = useState('');
  const [avatarTab, setAvatarTab] = useState<'UPLOAD' | 'PRESET' | 'URL'>('UPLOAD');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [isUpdatingCleaner, setIsUpdatingCleaner] = useState(false);
  const [cleanerUpdateError, setCleanerUpdateError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Attendance logbook filters & state
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceTypeFilter, setAttendanceTypeFilter] = useState<'ALL' | 'MASUK' | 'KELUAR'>('ALL');
  const [selectedAttendanceForLocationModal, setSelectedAttendanceForLocationModal] = useState<Attendance | null>(null);
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

  // Helper to format Date to YYYY-MM-DD in local time
  const formatToLocalDateString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatToLocalDateString(new Date());
  const yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterdayStr = formatToLocalDateString(yesterdayObj);

  const isSingleDateMode = dateFilterMode === 'TODAY' || dateFilterMode === 'YESTERDAY' || dateFilterMode === 'CUSTOM';
  const effectiveSingleDateStr = 
    dateFilterMode === 'TODAY' ? todayStr :
    dateFilterMode === 'YESTERDAY' ? yesterdayStr :
    dateFilterMode === 'CUSTOM' ? customSelectedDate : null;

  const getIsReportInDateFilter = (timestamp: string) => {
    if (!timestamp) return false;
    if (dateFilterMode === 'ALL') return true;

    const repDate = new Date(timestamp);
    const repDateStr = formatToLocalDateString(repDate);

    if (dateFilterMode === 'TODAY') {
      return repDateStr === todayStr;
    }
    if (dateFilterMode === 'YESTERDAY') {
      return repDateStr === yesterdayStr;
    }
    if (dateFilterMode === 'CUSTOM') {
      return repDateStr === customSelectedDate;
    }

    const now = new Date();
    const diffMs = now.getTime() - repDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (dateFilterMode === 'LAST_7') {
      return diffDays >= 0 && diffDays <= 7;
    }
    if (dateFilterMode === 'LAST_30') {
      return diffDays >= 0 && diffDays <= 30;
    }
    return true;
  };

  // Dynamic Warehouse list for selected date/period:
  // When looking at a single day (e.g. today or a past date), the warehouse status reflects that day's cleanliness and reports
  const dynamicWarehouses = warehouses.map((wh) => {
    if (isSingleDateMode && effectiveSingleDateStr) {
      const reportsOnDate = reports.filter(r => {
        if (!r.timestamp) return false;
        const rDate = formatToLocalDateString(new Date(r.timestamp));
        return r.warehouse === wh.id && rDate === effectiveSingleDateStr;
      }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      if (reportsOnDate.length > 0) {
        const latestReport = reportsOnDate[0];
        const status: Warehouse['status'] = 
          latestReport.status === 'APPROVED' ? 'BERSIH' :
          latestReport.status === 'PENDING' ? 'BERSIH' : 'KOTOR';

        return {
          ...wh,
          status,
          lastCleaned: latestReport.timestamp,
          lastCleanedBy: latestReport.cleanerName,
          dateReportCount: reportsOnDate.length,
          latestReportStatus: latestReport.status,
          latestReportId: latestReport.id
        };
      } else {
        return {
          ...wh,
          status: 'KOTOR' as Warehouse['status'],
          lastCleaned: undefined,
          lastCleanedBy: undefined,
          dateReportCount: 0,
          latestReportStatus: undefined,
          latestReportId: undefined
        };
      }
    }

    // Multi-day or ALL mode
    const reportsForWh = reports.filter(r => r.warehouse === wh.id && getIsReportInDateFilter(r.timestamp));
    return {
      ...wh,
      dateReportCount: reportsForWh.length
    };
  });

  // Comprehensive cleaner list incorporating users with PETUGAS_KEBERSIHAN role, plus any cleaner found in reports and tasks
  const cleanersList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string; avatarUrl?: string }>();
    
    // 1. Users with role PETUGAS_KEBERSIHAN indexed by Name
    users.forEach(u => {
      if (u.role === 'PETUGAS_KEBERSIHAN' && u.name) {
        const nameKey = u.name.trim().toLowerCase();
        if (!map.has(nameKey)) {
          map.set(nameKey, {
            id: u.id,
            name: u.name.trim(),
            email: u.email || '',
            avatarUrl: u.avatarUrl
          });
        }
      }
    });

    // 2. Incorporate any cleaner in reports indexed by cleanerName
    reports.forEach(r => {
      const name = (r.cleanerName || '').trim();
      if (name) {
        const nameKey = name.toLowerCase();
        if (!map.has(nameKey)) {
          map.set(nameKey, {
            id: r.cleanerName,
            name: name,
            email: r.cleanerEmail || '',
            avatarUrl: undefined
          });
        }
      }
    });

    // 3. Incorporate any cleaner in tasks indexed by assignedToName
    tasks.forEach(t => {
      const name = (t.assignedToName || '').trim();
      if (name) {
        const nameKey = name.toLowerCase();
        if (!map.has(nameKey)) {
          map.set(nameKey, {
            id: t.assignedToUserId || name,
            name: name,
            email: t.assignedToEmail || '',
            avatarUrl: undefined
          });
        }
      }
    });

    return Array.from(map.values());
  }, [users, reports, tasks]);

  // Selected cleaner object
  const selectedCleanerObj = useMemo(() => {
    if (cleanerFilter === 'ALL') return null;
    const target = cleanerFilter.trim().toLowerCase();
    return cleanersList.find(c => 
      c.name.toLowerCase() === target ||
      c.name.toLowerCase().includes(target) ||
      c.id.toLowerCase() === target || 
      c.email.toLowerCase() === target
    ) || {
      id: cleanerFilter,
      name: cleanerFilter,
      email: cleanerFilter,
      avatarUrl: undefined
    };
  }, [cleanerFilter, cleanersList]);

  // Cleaner matching helper - based strictly on cleaner's account name
  const isCleanerMatch = (reportCleanerName?: string, _reportCleanerEmail?: string) => {
    if (cleanerFilter === 'ALL') return true;
    if (!selectedCleanerObj) return true;

    const selName = selectedCleanerObj.name.trim().toLowerCase();
    const rName = (reportCleanerName || '').trim().toLowerCase();

    if (selName && rName) {
      return rName === selName || rName.includes(selName) || selName.includes(rName);
    }

    return false;
  };

  // Real-time search matching helper
  const searchTokens = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const isSearchMatch = (report: Report) => {
    if (searchTokens.length === 0) return true;
    const corpus = [
      report.cleanerName || '',
      report.cleanerEmail || '',
      report.warehouse || '',
      `gudang ${report.warehouse || ''}`,
      `gd ${report.warehouse || ''}`,
      report.description || '',
      report.status || '',
      report.feedback || ''
    ].join(' ').toLowerCase();

    return searchTokens.every(token => corpus.includes(token));
  };

  // Filter reports
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const matchesSearch = isSearchMatch(report);
      const matchesWarehouse = warehouseFilter === 'ALL' || report.warehouse === warehouseFilter;
      const matchesCleaner = isCleanerMatch(report.cleanerName, report.cleanerEmail);
      const matchesStatus = statusFilter === 'ALL' || report.status === statusFilter;
      const matchesPeriod = getIsReportInDateFilter(report.timestamp);

      return matchesSearch && matchesWarehouse && matchesCleaner && matchesStatus && matchesPeriod;
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
  }, [reports, searchTerm, warehouseFilter, cleanerFilter, statusFilter, dateFilterMode, customSelectedDate, sortField, sortDirection, selectedCleanerObj]);

  // Tasks assigned to selected cleaner
  const selectedCleanerTasks = useMemo(() => {
    if (!selectedCleanerObj) return [];
    const selEmail = selectedCleanerObj.email.trim().toLowerCase();
    const selName = selectedCleanerObj.name.trim().toLowerCase();
    const selId = selectedCleanerObj.id.trim().toLowerCase();

    return tasks.filter(t => {
      const tEmail = (t.assignedToEmail || '').trim().toLowerCase();
      const tName = (t.assignedToName || '').trim().toLowerCase();
      const tId = (t.assignedToUserId || '').trim().toLowerCase();

      if (selEmail && tEmail && (tEmail === selEmail || tEmail.includes(selEmail))) return true;
      if (selName && tName && (tName === selName || tName.includes(selName))) return true;
      if (selId && (tId === selId || tEmail === selId)) return true;
      return false;
    });
  }, [tasks, selectedCleanerObj]);

  // Calculate Metrics based on dynamicWarehouses and filteredReports
  const totalWarehouses = dynamicWarehouses.length;
  const cleanCount = dynamicWarehouses.filter(w => w.status === 'BERSIH').length;
  const dirtyCount = dynamicWarehouses.filter(w => w.status === 'KOTOR').length;
  const inProgressCount = dynamicWarehouses.filter(w => w.status === 'DALAM_PENGERJAAN').length;
  const cleanPercentage = totalWarehouses > 0 ? Math.round((cleanCount / totalWarehouses) * 100) : 0;

  const dateFilteredAllReports = reports.filter(r => getIsReportInDateFilter(r.timestamp));
  const pendingReportsCount = dateFilteredAllReports.filter(r => r.status === 'PENDING').length;
  const approvedReportsCount = dateFilteredAllReports.filter(r => r.status === 'APPROVED').length;
  const rejectedReportsCount = dateFilteredAllReports.filter(r => r.status === 'REJECTED').length;

  // Cleaner summaries for the Sub-Tab
  const cleanerSummaries = useMemo(() => {
    return cleanersList.map(cleaner => {
      const selName = cleaner.name.trim().toLowerCase();
      const selEmail = cleaner.email.trim().toLowerCase();

      const cleanerReports = reports.filter(r => {
        const rName = (r.cleanerName || '').trim().toLowerCase();
        const isMatch = selName && (rName === selName || rName.includes(selName) || selName.includes(rName));
        return isMatch && getIsReportInDateFilter(r.timestamp) && (warehouseFilter === 'ALL' || r.warehouse === warehouseFilter);
      });

      const approvedCount = cleanerReports.filter(r => r.status === 'APPROVED').length;
      const pendingCount = cleanerReports.filter(r => r.status === 'PENDING').length;
      const rejectedCount = cleanerReports.filter(r => r.status === 'REJECTED').length;
      const distinctWarehouses = Array.from(new Set(cleanerReports.map(r => r.warehouse))).sort();

      let attendanceStatus: 'HADIR' | 'SELESAI_SHIFT' | 'BELUM_ABSEN' = 'BELUM_ABSEN';
      let attendanceTime: string | null = null;
      if (isSingleDateMode && effectiveSingleDateStr) {
        const att = attendanceList.filter(a => {
          const aName = (a.userName || '').trim().toLowerCase();
          const isAttMatch = selName && (aName === selName || aName.includes(selName) || selName.includes(aName));
          return isAttMatch && a.date === effectiveSingleDateStr;
        }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (att.some(a => a.type === 'KELUAR')) {
          attendanceStatus = 'SELESAI_SHIFT';
          attendanceTime = att.find(a => a.type === 'KELUAR')?.time || null;
        } else if (att.some(a => a.type === 'MASUK')) {
          attendanceStatus = 'HADIR';
          attendanceTime = att.find(a => a.type === 'MASUK')?.time || null;
        }
      }

      // Cleaner's assigned tasks
      const cleanerAssignedTasks = tasks.filter(t => {
        const tName = (t.assignedToName || '').trim().toLowerCase();
        return selName && (tName === selName || tName.includes(selName) || selName.includes(tName));
      });

      return {
        cleaner,
        totalReports: cleanerReports.length,
        approvedCount,
        pendingCount,
        rejectedCount,
        distinctWarehouses,
        reports: cleanerReports,
        attendanceStatus,
        attendanceTime,
        assignedTasksCount: cleanerAssignedTasks.length,
        completedTasksCount: cleanerAssignedTasks.filter(t => t.status === 'COMPLETED').length
      };
    });
  }, [cleanersList, reports, warehouseFilter, dateFilterMode, customSelectedDate, isSingleDateMode, effectiveSingleDateStr, attendanceList, tasks]);

  // Warehouse summaries for the Sub-Tab
  const warehouseSummaries = useMemo(() => {
    return dynamicWarehouses.map(w => {
      const wReports = reports.filter(r => 
        r.warehouse === w.id &&
        getIsReportInDateFilter(r.timestamp) &&
        isCleanerMatch(r.cleanerName, r.cleanerEmail)
      );

      const distinctCleaners = Array.from(new Set(wReports.map(r => r.cleanerName).filter(Boolean)));

      return {
        warehouse: w,
        totalReports: wReports.length,
        approvedCount: wReports.filter(r => r.status === 'APPROVED').length,
        pendingCount: wReports.filter(r => r.status === 'PENDING').length,
        rejectedCount: wReports.filter(r => r.status === 'REJECTED').length,
        cleaners: distinctCleaners,
        reports: wReports
      };
    });
  }, [dynamicWarehouses, reports, dateFilterMode, customSelectedDate, cleanerFilter, selectedCleanerObj]);

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

  const handleOpenEditCleaner = (cleaner: User, defaultTab: 'UPLOAD' | 'PRESET' | 'URL' = 'UPLOAD') => {
    setEditingCleaner(cleaner);
    setCleanerNameInput(cleaner.name);
    setCleanerAvatarInput(cleaner.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300');
    setAvatarTab(defaultTab);
    setCustomUrlInput('');
    setCleanerUpdateError('');
  };

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setCleanerUpdateError('Format berkas harus berupa gambar (JPG, PNG, WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setCleanerUpdateError('Ukuran berkas gambar maksimal 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const rawBase64 = reader.result as string;
        const compressed = await compressAvatar(rawBase64, 400, 0.82);
        setCleanerAvatarInput(compressed);
        setCleanerUpdateError('');
      } catch (err) {
        console.error('Error processing avatar image:', err);
        setCleanerUpdateError('Gagal memproses gambar avatar.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = customUrlInput.trim();
    if (!trimmedUrl) {
      setCleanerUpdateError('Masukkan URL gambar terlebih dahulu.');
      return;
    }
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://') && !trimmedUrl.startsWith('data:image')) {
      setCleanerUpdateError('URL harus diawali dengan http:// atau https://');
      return;
    }
    setCleanerAvatarInput(trimmedUrl);
    setCleanerUpdateError('');
  };

  const handleResetAvatar = () => {
    setCleanerAvatarInput('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300');
    setCleanerUpdateError('');
  };

  const handleSaveCleanerProfile = async (e: React.FormEvent) => {
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
        await onUpdateUser(editingCleaner.id, {
          name: trimmed,
          avatarUrl: cleanerAvatarInput || undefined
        });
      }
      setEditingCleaner(null);
    } catch (err) {
      console.error('Failed to update cleaner profile:', err);
      setCleanerUpdateError('Gagal memperbarui data petugas. Silakan coba lagi.');
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
            className="space-y-6"
          >
            {/* DATE & PERIOD FILTER BAR */}
            <div className="p-4 sm:p-5 bg-zinc-900/30 border border-zinc-900/90 rounded-2xl space-y-3.5 shadow-lg">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <CalendarDays className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-extrabold font-display text-white text-base">
                      Pemantauan Berdasarkan Tanggal
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Cek status kebersihan 12 area gudang, rekap kinerja per petugas, dan arsip laporan harian.
                  </p>
                </div>

                {/* Date Quick Presets & Custom Picker */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDateFilterMode('TODAY')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
                      dateFilterMode === 'TODAY'
                        ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                        : 'bg-zinc-950 hover:bg-zinc-850 text-zinc-300 border border-zinc-850'
                    }`}
                    id="date-filter-today"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Hari Ini</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDateFilterMode('YESTERDAY')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
                      dateFilterMode === 'YESTERDAY'
                        ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                        : 'bg-zinc-950 hover:bg-zinc-850 text-zinc-300 border border-zinc-850'
                    }`}
                    id="date-filter-yesterday"
                  >
                    <span>Kemarin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDateFilterMode('LAST_7')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      dateFilterMode === 'LAST_7'
                        ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                        : 'bg-zinc-950 hover:bg-zinc-850 text-zinc-300 border border-zinc-850'
                    }`}
                    id="date-filter-7days"
                  >
                    <span>7 Hari</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDateFilterMode('LAST_30')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      dateFilterMode === 'LAST_30'
                        ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                        : 'bg-zinc-950 hover:bg-zinc-850 text-zinc-300 border border-zinc-850'
                    }`}
                    id="date-filter-30days"
                  >
                    <span>30 Hari</span>
                  </button>

                  {/* Custom Specific Date Picker Input */}
                  <div className="flex items-center bg-zinc-950 border border-zinc-850 rounded-xl px-2.5 py-1 text-xs space-x-2 focus-within:border-emerald-500">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <input
                      type="date"
                      value={customSelectedDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          setCustomSelectedDate(e.target.value);
                          setDateFilterMode('CUSTOM');
                        }
                      }}
                      className="bg-transparent text-zinc-200 text-xs outline-none cursor-pointer"
                      id="custom-date-picker-input"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setDateFilterMode('ALL')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
                      dateFilterMode === 'ALL'
                        ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                        : 'bg-zinc-950 hover:bg-zinc-850 text-zinc-300 border border-zinc-850'
                    }`}
                    id="date-filter-all"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Semua Data</span>
                  </button>
                </div>
              </div>

              {/* Informative Active Date Context Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 border-t border-zinc-850/70 text-xs">
                <div className="flex items-center space-x-2 text-zinc-300 font-medium">
                  <span className="text-zinc-500">Periode Aktif:</span>
                  <span className="font-bold text-white font-mono bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                    {dateFilterMode === 'TODAY' && `Hari Ini (${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })})`}
                    {dateFilterMode === 'YESTERDAY' && `Kemarin (${yesterdayObj.toLocaleDateString('id-ID', { dateStyle: 'full' })})`}
                    {dateFilterMode === 'CUSTOM' && `Tanggal Terpilih: ${new Date(customSelectedDate + 'T00:00:00').toLocaleDateString('id-ID', { dateStyle: 'full' })}`}
                    {dateFilterMode === 'LAST_7' && 'Rentang 7 Hari Terakhir'}
                    {dateFilterMode === 'LAST_30' && 'Rentang 30 Hari Terakhir'}
                    {dateFilterMode === 'ALL' && 'Seluruh Riwayat Arsip'}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-[11px] text-zinc-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  <span>
                    {isSingleDateMode 
                      ? 'Status 12 area gudang disesuaikan otomatis dengan laporan pada tanggal ini.'
                      : 'Menampilkan data agregat laporan sepanjang periode terpilih.'}
                  </span>
                </div>
              </div>
            </div>

            {/* SUB-TABS: (1) Laporan & Area Gudang, (2) Rekap Per Petugas, (3) Rekap Per Gudang */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-900 pb-3">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setMonitoringSubTab('REPORTS_AND_AREAS')}
                  className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
                    monitoringSubTab === 'REPORTS_AND_AREAS'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 border border-zinc-900'
                  }`}
                  id="subtab-reports-and-areas"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Daftar Laporan &amp; 12 Area Gudang</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMonitoringSubTab('SUMMARY_BY_CLEANER')}
                  className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
                    monitoringSubTab === 'SUMMARY_BY_CLEANER'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 border border-zinc-900'
                  }`}
                  id="subtab-summary-cleaner"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Rekap Per Petugas ({cleanersList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMonitoringSubTab('SUMMARY_BY_WAREHOUSE')}
                  className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
                    monitoringSubTab === 'SUMMARY_BY_WAREHOUSE'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 border border-zinc-900'
                  }`}
                  id="subtab-summary-warehouse"
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Rekap Per Gudang (A - L)</span>
                </button>
              </div>

              {/* Unduh Laporan Modal Trigger */}
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-extrabold rounded-xl flex items-center space-x-1.5 cursor-pointer transition-all shadow-md shadow-emerald-500/10 hover:scale-[1.02] active:scale-[0.98]"
                id="btn-trigger-export-reports"
              >
                <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                <span>Unduh Laporan Audit</span>
              </button>
            </div>

            {/* Overview / Metrics Cards (Calculated based on Selected Date) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Unified Cleanliness & Status Breakdown Card */}
              <div className="p-5 bg-zinc-900/20 border border-zinc-900/80 rounded-2xl flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">
                    {isSingleDateMode ? 'Standar Bersih Tanggal Ini' : 'Standar Kebersihan Rata-rata'}
                  </span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-extrabold text-white tracking-tight font-mono">{cleanPercentage}%</span>
                    <span className="text-xs text-emerald-400 font-bold">Lolos Standar</span>
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

              {/* Reports Breakdown Card */}
              <div className="p-5 bg-zinc-900/20 border border-zinc-900/80 rounded-2xl flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">
                    Total Laporan ({dateFilteredAllReports.length})
                  </span>
                  <div className="flex items-center space-x-3.5">
                    <span className={`text-3xl font-black font-mono tracking-tight ${pendingReportsCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {dateFilteredAllReports.length}
                    </span>
                    <span className="text-xs text-zinc-400 font-medium leading-snug">
                      {pendingReportsCount > 0 
                        ? `${pendingReportsCount} laporan perlu diverifikasi`
                        : 'Semua laporan telah disetujui / tidak ada pending'}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-850/60 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase font-bold">Menunggu</span>
                    <span className="text-xs font-bold text-amber-400 font-mono">{pendingReportsCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase font-bold">Disetujui</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">{approvedReportsCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase font-bold">Ditolak</span>
                    <span className="text-xs font-bold text-rose-400 font-mono">{rejectedReportsCount}</span>
                  </div>
                </div>
              </div>

              {/* Active Cleaners Info Card */}
              <div className="p-5 bg-zinc-900/20 border border-zinc-900/80 rounded-2xl flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">
                    Petugas Kebersihan Aktif
                  </span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-extrabold text-white font-mono">
                      {cleanerSummaries.filter(c => c.totalReports > 0 || c.attendanceStatus === 'HADIR' || c.attendanceStatus === 'SELESAI_SHIFT').length}
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">dari {cleanersList.length} Petugas Terdaftar</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-850/60 flex items-center justify-between text-xs text-zinc-400">
                  <span>Status Absensi</span>
                  <span className="text-emerald-400 font-bold font-mono">
                    {attendanceList.filter(a => a.date === (effectiveSingleDateStr || todayStr) && a.type === 'MASUK').length} Petugas Hadir
                  </span>
                </div>
              </div>
            </div>

            {/* VIEW 1: REPORTS & 12 AREA GRID */}
            {monitoringSubTab === 'REPORTS_AND_AREAS' && (
              <div className="space-y-6">
                {/* Grid Gudang A - L */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-zinc-200">
                      <LayoutDashboard className="w-5 h-5 text-emerald-400" />
                      <span className="font-extrabold text-white text-base">Status 12 Area Gudang (A - L)</span>
                    </div>
                    {warehouseFilter !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => setWarehouseFilter('ALL')}
                        className="text-xs text-emerald-400 hover:underline font-semibold cursor-pointer"
                      >
                        Reset Pilihan Gudang ({warehouseFilter})
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
                    {dynamicWarehouses.map((w) => {
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
                              ? 'bg-emerald-950/20 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30' 
                              : 'bg-zinc-900/30 hover:bg-zinc-900/60 border-zinc-900'
                          }`}
                          id={`warehouse-card-${w.id}`}
                        >
                          {/* Cleanliness Indicator */}
                          <div className="absolute top-4 right-4">
                            <span className={`w-2.5 h-2.5 rounded-full block ${
                              w.status === 'BERSIH' ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 
                              w.status === 'DALAM_PENGERJAAN' ? 'bg-amber-400 shadow-sm shadow-amber-400/50' : 'bg-rose-500 shadow-sm'
                            }`} />
                          </div>

                          <span className="block font-black text-white text-lg tracking-tight font-display">Gudang {w.id}</span>
                          <span className="block text-[10px] text-zinc-500 mt-0.5 truncate font-sans max-w-[80%]" title={w.area}>
                            {w.area}
                          </span>

                          {w.lastCleanedBy && (
                            <span className="block text-[9px] text-zinc-400 mt-1 truncate">
                              Oleh: <strong className="text-zinc-200">{w.lastCleanedBy}</strong>
                            </span>
                          )}

                          <div className="mt-3.5 pt-2.5 border-t border-zinc-900 flex items-center justify-between">
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
                              className="p-1 px-2 bg-zinc-800/80 hover:bg-emerald-500 hover:text-zinc-950 text-zinc-300 text-[9px] font-bold rounded-lg transition-all cursor-pointer border border-zinc-700/40 uppercase tracking-wider flex items-center"
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
                <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl shadow-xl overflow-hidden" id="reports-table-container">
                  
                  {/* Table Filters & Search Header */}
                  <div className="p-5 border-b border-zinc-900 bg-zinc-950/20 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3.5 md:space-y-0">
                      <div>
                        <h3 className="font-extrabold font-display text-white text-lg flex items-center space-x-2">
                          <span>Daftar Laporan &amp; Pemantauan</span>
                          {warehouseFilter !== 'ALL' && (
                            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold font-mono uppercase">
                              Gudang {warehouseFilter}
                            </span>
                          )}
                          {cleanerFilter !== 'ALL' && selectedCleanerObj && (
                            <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-bold font-mono">
                              Petugas: {selectedCleanerObj.name}
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Pantau pekerjaan, verifikasi laporan foto, dan periksa progres tugas petugas kebersihan.
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 self-stretch md:self-auto">
                        {/* Reset filter */}
                        {(warehouseFilter !== 'ALL' || statusFilter !== 'ALL' || cleanerFilter !== 'ALL' || searchTerm) && (
                          <button
                            onClick={() => {
                              setWarehouseFilter('ALL');
                              setCleanerFilter('ALL');
                              setStatusFilter('ALL');
                              setSearchTerm('');
                            }}
                            className="px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-lg border border-zinc-850 flex items-center space-x-1 cursor-pointer transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Reset Semua Filter</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quick Cleaner Selector Chips Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400 font-bold flex items-center space-x-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Pilih Petugas (Filter Cepat):</span>
                        </span>
                        {cleanerFilter !== 'ALL' && (
                          <button
                            type="button"
                            onClick={() => setCleanerFilter('ALL')}
                            className="text-[11px] text-cyan-400 hover:underline font-semibold cursor-pointer"
                          >
                            Tampilkan Semua ({cleanersList.length} Petugas)
                          </button>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
                        {/* All Cleaners Pill */}
                        <button
                          type="button"
                          onClick={() => setCleanerFilter('ALL')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 ${
                            cleanerFilter === 'ALL'
                              ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                              : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-850 hover:border-zinc-700'
                          }`}
                        >
                          <span>Semua Petugas</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-extrabold ${
                            cleanerFilter === 'ALL' ? 'bg-zinc-950/20 text-zinc-950' : 'bg-zinc-850 text-zinc-400'
                          }`}>
                            {cleanersList.length}
                          </span>
                        </button>

                        {/* Individual Cleaner Pills */}
                        {cleanersList.map((cleaner) => {
                          const isSelected = cleanerFilter.toLowerCase() === cleaner.name.toLowerCase();
                          
                          // Count reports on current date filter for this cleaner by Name
                          const cleanerReportsCount = reports.filter(r => 
                            r.cleanerName?.toLowerCase() === cleaner.name.toLowerCase() &&
                            getIsReportInDateFilter(r.timestamp)
                          ).length;

                          return (
                            <button
                              key={cleaner.name}
                              type="button"
                              onClick={() => {
                                setCleanerFilter(isSelected ? 'ALL' : cleaner.name);
                              }}
                              className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
                                isSelected
                                  ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20 ring-2 ring-cyan-400'
                                  : 'bg-zinc-950 text-zinc-300 hover:text-white border border-zinc-850 hover:border-zinc-700'
                              }`}
                              title={`Klik untuk melihat seluruh pekerjaan ${cleaner.name}`}
                            >
                              <img
                                src={cleaner.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'}
                                alt={cleaner.name}
                                className="w-5 h-5 rounded-full object-cover border border-zinc-800 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <span className="truncate max-w-[120px]">{cleaner.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-extrabold ${
                                isSelected 
                                  ? 'bg-zinc-950/20 text-zinc-950' 
                                  : cleanerReportsCount > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-850 text-zinc-500'
                              }`}>
                                {cleanerReportsCount} Lap
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Filter Inputs Grid: Search, Cleaner, Warehouse, Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Search keyword with instant clear button */}
                      <div className="relative flex items-center">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 pointer-events-none">
                          <Search className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          placeholder="Cari petugas, gudang, keterangan..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-9 py-2 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-xl text-xs text-zinc-200 placeholder-zinc-700 outline-none transition-all"
                          id="search-reports-input"
                        />
                        {searchTerm && (
                          <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 p-1 text-zinc-500 hover:text-white rounded-md cursor-pointer transition-colors"
                            title="Hapus pencarian"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Filter by Cleaner (Per Petugas) */}
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-zinc-500 text-xs font-semibold">Petugas:</span>
                        <select
                          value={cleanerFilter}
                          onChange={(e) => setCleanerFilter(e.target.value)}
                          className="w-full pl-18 pr-4 py-2 bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl text-xs text-zinc-200 outline-none appearance-none cursor-pointer transition-all truncate"
                          id="cleaner-filter-select"
                        >
                          <option value="ALL">Semua Petugas ({cleanersList.length})</option>
                          {cleanersList.map((cleaner) => (
                            <option key={cleaner.name} value={cleaner.name}>
                              {cleaner.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Filter by Warehouse (Per Gudang) */}
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

                      {/* Filter by Status */}
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

                    {/* DEDICATED CLEANER WORK & TASKS PANEL (When a cleaner is selected) */}
                    {cleanerFilter !== 'ALL' && selectedCleanerObj && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-zinc-900/50 border border-cyan-500/30 rounded-2xl space-y-3.5 shadow-lg shadow-cyan-950/20"
                        id="selected-cleaner-dedicated-panel"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                          <div className="flex items-center space-x-3">
                            <img
                              src={selectedCleanerObj.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'}
                              alt={selectedCleanerObj.name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-cyan-400 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="font-extrabold text-white text-base font-display">
                                  {selectedCleanerObj.name}
                                </h4>
                                <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded text-[10px] font-bold font-mono">
                                  Petugas Terpilih
                                </span>
                              </div>
                              <span className="text-xs text-zinc-400 font-medium block">
                                Petugas Kebersihan Gudang
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {/* Attendance badge for this cleaner by Name */}
                            {(() => {
                              const selName = selectedCleanerObj.name.toLowerCase();
                              const attToday = attendanceList.filter(a => {
                                const aName = (a.userName || '').toLowerCase();
                                const isMatch = aName === selName || aName.includes(selName) || selName.includes(aName);
                                return isMatch && a.date === (effectiveSingleDateStr || todayStr);
                              }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                              const hasKeluar = attToday.some(a => a.type === 'KELUAR');
                              const hasMasuk = attToday.some(a => a.type === 'MASUK');
                              const masukTime = attToday.find(a => a.type === 'MASUK')?.time;
                              const keluarTime = attToday.find(a => a.type === 'KELUAR')?.time;

                              return (
                                <div className="px-3 py-1.5 bg-zinc-950 rounded-xl border border-zinc-800 text-xs flex items-center space-x-1.5">
                                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                                  <span className="text-zinc-400">Absensi:</span>
                                  <span className={`font-bold font-mono ${
                                    hasKeluar ? 'text-cyan-400' : hasMasuk ? 'text-emerald-400' : 'text-zinc-500'
                                  }`}>
                                    {hasKeluar ? `Selesai Shift (${keluarTime || ''} WIB)` : hasMasuk ? `Hadir (${masukTime || ''} WIB)` : 'Belum Absen'}
                                  </span>
                                </div>
                              );
                            })()}

                            <button
                              type="button"
                              onClick={() => setCleanerFilter('ALL')}
                              className="px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-xl border border-zinc-700/50 flex items-center space-x-1 cursor-pointer transition-colors"
                            >
                              <X className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Tutup Pilihan</span>
                            </button>
                          </div>
                        </div>

                        {/* Cleaner Job Metrics Breakdown */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          {/* 1. Warehouses Cleaned */}
                          <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-850/60 space-y-1.5">
                            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block flex items-center space-x-1">
                              <LayoutDashboard className="w-3 h-3 text-emerald-400" />
                              <span>Area Gudang Dikerjakan</span>
                            </span>
                            {(() => {
                              const distinctWhs = Array.from(new Set(filteredReports.map(r => r.warehouse))).sort();
                              if (distinctWhs.length === 0) {
                                return <span className="text-zinc-600 text-xs italic block">Belum ada laporan area pada filter tanggal ini</span>;
                              }
                              return (
                                <div className="flex flex-wrap gap-1">
                                  {distinctWhs.map(wh => (
                                    <span key={wh} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold rounded text-[11px]">
                                      Gudang {wh}
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>

                          {/* 2. Reports Summary */}
                          <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-850/60 space-y-1.5">
                            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block flex items-center space-x-1">
                              <FileText className="w-3 h-3 text-cyan-400" />
                              <span>Status Laporan Kebersihan</span>
                            </span>
                            <div className="flex items-center space-x-3 pt-0.5">
                              <div>
                                <span className="text-[10px] text-zinc-500 block">Total</span>
                                <span className="font-extrabold text-white font-mono text-sm">{filteredReports.length}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-emerald-500 block">Disetujui</span>
                                <span className="font-extrabold text-emerald-400 font-mono text-sm">
                                  {filteredReports.filter(r => r.status === 'APPROVED').length}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-amber-500 block">Menunggu</span>
                                <span className="font-extrabold text-amber-400 font-mono text-sm">
                                  {filteredReports.filter(r => r.status === 'PENDING').length}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-rose-500 block">Ditolak</span>
                                <span className="font-extrabold text-rose-400 font-mono text-sm">
                                  {filteredReports.filter(r => r.status === 'REJECTED').length}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 3. Assigned Checklist Tasks */}
                          <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-850/60 space-y-1.5">
                            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block flex items-center space-x-1">
                              <ClipboardList className="w-3 h-3 text-amber-400" />
                              <span>Checklist Tugas Terjadwal</span>
                            </span>
                            <div className="flex items-baseline space-x-2 pt-0.5">
                              <span className="text-sm font-extrabold font-mono text-amber-400">
                                {selectedCleanerTasks.filter(t => t.status === 'COMPLETED').length} / {selectedCleanerTasks.length}
                              </span>
                              <span className="text-[11px] text-zinc-400">Tugas Selesai</span>
                            </div>
                          </div>
                        </div>

                        {/* List of Tasks Assigned to Selected Cleaner */}
                        {selectedCleanerTasks.length > 0 && (
                          <div className="p-3 bg-zinc-950/40 rounded-xl border border-zinc-850/50 space-y-2">
                            <span className="text-[11px] font-bold text-zinc-300 flex items-center space-x-1.5">
                              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Daftar Tugas Khusus Petugas Ini:</span>
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {selectedCleanerTasks.map(t => (
                                <div
                                  key={t.id}
                                  className="p-2.5 bg-zinc-900/60 border border-zinc-800 rounded-lg flex items-center justify-between text-xs"
                                >
                                  <div className="space-y-0.5">
                                    <div className="flex items-center space-x-1.5">
                                      <span className="px-1.5 py-0.2 bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 rounded font-bold font-mono text-[10px]">
                                        GD {t.warehouse}
                                      </span>
                                      <span className="font-bold text-white text-xs">{t.taskName}</span>
                                    </div>
                                    {t.description && (
                                      <p className="text-[11px] text-zinc-400 truncate max-w-[240px]">{t.description}</p>
                                    )}
                                  </div>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                    t.status === 'COMPLETED'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  }`}>
                                    {t.status === 'COMPLETED' ? 'Selesai' : 'Belum Dikerjakan'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>

                  {/* Reports List / Table Grid */}
                  <div className="overflow-x-auto">
                    {filteredReports.length === 0 ? (
                      <div className="p-12 text-center bg-zinc-900/10">
                        <AlertTriangle className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                        <h4 className="font-bold text-white mb-1">Laporan Tidak Ditemukan</h4>
                        <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                          Tidak ada laporan yang sesuai dengan filter tanggal, petugas, atau gudang yang dipilih. Silakan ubah filter atau tanggal Anda.
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
                              <th className="py-3.5 px-4 w-[38%]">Keterangan Pengerjaan</th>
                              <th className="py-3.5 px-4 text-center">Lampiran Foto</th>
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
                                    {new Date(report.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
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

                        {/* MOBILE RESPONSIVE CARD VIEW */}
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

                              {/* Previews before & after */}
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
              </div>
            )}

            {/* VIEW 2: REKAP PER PETUGAS (Performance Breakdown by Cleaner on Selected Date) */}
            {monitoringSubTab === 'SUMMARY_BY_CLEANER' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold font-display text-white text-base flex items-center space-x-2">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span>Rekap Kinerja Petugas Kebersihan</span>
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Rangkuman jumlah gudang yang dibersihkan, status verifikasi laporan, dan catatan absensi.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cleanerSummaries.map((item) => (
                    <div
                      key={item.cleaner.id}
                      className="p-5 bg-zinc-900/30 border border-zinc-900 rounded-2xl space-y-4 hover:border-zinc-800 transition-all flex flex-col justify-between"
                      id={`cleaner-summary-card-${item.cleaner.id}`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <img
                              src={item.cleaner.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'}
                              alt={item.cleaner.name}
                              className="w-11 h-11 rounded-full object-cover border border-zinc-800"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <h4 className="font-bold text-white text-sm">{item.cleaner.name}</h4>
                              <span className="text-[11px] text-zinc-500 font-mono block">{item.cleaner.email}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status Absensi & Waktu */}
                        <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-900 flex items-center justify-between text-xs">
                          <span className="text-zinc-400 text-[11px]">Kehadiran:</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            item.attendanceStatus === 'HADIR' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            item.attendanceStatus === 'SELESAI_SHIFT' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>
                            {item.attendanceStatus === 'HADIR' && `Hadir (${item.attendanceTime || ''} WIB)`}
                            {item.attendanceStatus === 'SELESAI_SHIFT' && `Selesai Shift (${item.attendanceTime || ''} WIB)`}
                            {item.attendanceStatus === 'BELUM_ABSEN' && 'Belum Absen'}
                          </span>
                        </div>

                        {/* Areas Cleaned */}
                        <div className="space-y-1.5 text-xs">
                          <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider block">Area yang Dibersihkan:</span>
                          {item.distinctWarehouses.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {item.distinctWarehouses.map((wh) => (
                                <span key={wh} className="px-2 py-0.5 bg-emerald-950/30 text-emerald-400 border border-emerald-500/20 font-bold rounded text-[11px]">
                                  Gudang {wh}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-zinc-600 text-xs italic">Belum ada laporan area pada periode ini</span>
                          )}
                        </div>

                        {/* Report Counts breakdown */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-850/60 text-center text-xs">
                          <div className="p-1.5 bg-zinc-950/40 rounded-lg">
                            <span className="text-[10px] text-zinc-500 block">Total</span>
                            <span className="font-extrabold text-white font-mono">{item.totalReports}</span>
                          </div>
                          <div className="p-1.5 bg-zinc-950/40 rounded-lg">
                            <span className="text-[10px] text-emerald-500 block">Disetujui</span>
                            <span className="font-extrabold text-emerald-400 font-mono">{item.approvedCount}</span>
                          </div>
                          <div className="p-1.5 bg-zinc-950/40 rounded-lg">
                            <span className="text-[10px] text-amber-500 block">Menunggu</span>
                            <span className="font-extrabold text-amber-400 font-mono">{item.pendingCount}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setCleanerFilter(item.cleaner.email || item.cleaner.name || item.cleaner.id);
                          setMonitoringSubTab('REPORTS_AND_AREAS');
                        }}
                        className="w-full py-2.5 bg-zinc-850 hover:bg-cyan-500 hover:text-zinc-950 text-zinc-300 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Pekerjaan &amp; Laporan Petugas Ini</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 3: REKAP PER GUDANG (Summary by Warehouse A - L on Selected Date) */}
            {monitoringSubTab === 'SUMMARY_BY_WAREHOUSE' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold font-display text-white text-base flex items-center space-x-2">
                      <Grid className="w-4 h-4 text-emerald-400" />
                      <span>Rekap Status &amp; Riwayat Per Gudang</span>
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Rincian status kebersihan 12 area gudang beserta petugas yang bertanggung jawab pada periode terpilih.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {warehouseSummaries.map((ws) => (
                    <div
                      key={ws.warehouse.id}
                      className="p-5 bg-zinc-900/30 border border-zinc-900 rounded-2xl space-y-3.5 hover:border-zinc-800 transition-all flex flex-col justify-between"
                      id={`warehouse-summary-card-${ws.warehouse.id}`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-white text-lg font-display">Gudang {ws.warehouse.id}</span>
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${getStatusBadgeClass(ws.warehouse.status)}`}>
                            {ws.warehouse.status === 'BERSIH' ? 'Bersih' : ws.warehouse.status === 'DALAM_PENGERJAAN' ? 'Proses' : 'Kotor'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">{ws.warehouse.area}</p>

                        <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-900 space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-zinc-500 text-[11px]">Total Laporan:</span>
                            <span className="font-bold text-white font-mono">{ws.totalReports}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500 text-[11px]">Petugas Pelaksana:</span>
                            <span className="font-bold text-zinc-200 text-right truncate max-w-[120px]">
                              {ws.cleaners.length > 0 ? ws.cleaners.join(', ') : '-'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setWarehouseFilter(ws.warehouse.id);
                          setMonitoringSubTab('REPORTS_AND_AREAS');
                        }}
                        className="w-full py-2 bg-zinc-850 hover:bg-emerald-500 hover:text-zinc-950 text-zinc-300 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Filter Laporan Gudang {ws.warehouse.id}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                            <div className="flex items-center space-x-3.5">
                              <div className="relative group/avatar cursor-pointer" onClick={() => handleOpenEditCleaner(u, 'UPLOAD')}>
                                <img
                                  src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
                                  alt={u.name}
                                  className="w-13 h-13 rounded-full object-cover border-2 border-zinc-800 group-hover/avatar:border-emerald-500 shadow-md transition-all"
                                  referrerPolicy="no-referrer"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditCleaner(u, 'UPLOAD');
                                  }}
                                  className="absolute -bottom-1 -right-1 p-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-full shadow-lg border-2 border-zinc-950 transition-all cursor-pointer group-hover/avatar:scale-110"
                                  title="Ganti Foto Petugas"
                                >
                                  <Camera className="w-3 h-3" />
                                </button>
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
                              onClick={() => handleOpenEditCleaner(u, 'UPLOAD')}
                              className="flex-1 py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-zinc-950 border border-emerald-500/20 hover:border-emerald-500 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-sm"
                              title="Edit Profil dan Foto Petugas"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit Profil & Foto</span>
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
                              <th className="py-3.5 px-4 text-center w-24">Foto Selfie</th>
                              <th className="py-3.5 px-4 text-center">Cek Lokasi & Foto</th>
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
                                    {log.latitude && (
                                      <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                                        GPS: {log.latitude.toFixed(4)}, {log.longitude?.toFixed(4)}
                                      </div>
                                    )}
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
                                        onClick={() => setSelectedAttendanceForLocationModal(log)}
                                        className="relative w-12 h-9 rounded overflow-hidden border border-zinc-900 cursor-pointer group/att-pic shrink-0"
                                        title="Klik untuk cek detail lokasi & foto"
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
                                  <td className="py-3.5 px-4 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedAttendanceForLocationModal(log)}
                                      className="inline-flex items-center space-x-1.5 bg-zinc-900/80 hover:bg-emerald-500/10 text-zinc-300 hover:text-emerald-400 border border-zinc-800 hover:border-emerald-500/30 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all cursor-pointer shadow-sm"
                                    >
                                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>Cek Lokasi & Foto</span>
                                    </button>
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

      {/* Edit Cleaner Profile & Photo Modal */}
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
              className="relative w-full max-w-lg bg-[#12131a] border border-zinc-800 rounded-2xl shadow-2xl p-6 z-10 flex flex-col max-h-[90vh] overflow-y-auto"
              id="edit-cleaner-modal"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-5">
                <div className="flex items-center space-x-2.5 text-emerald-400">
                  <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Edit Profil & Foto Petugas</h3>
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
              <form onSubmit={handleSaveCleanerProfile} className="space-y-5">
                {/* Live Preview Card */}
                <div className="p-4 bg-zinc-950/70 border border-zinc-800/80 rounded-2xl flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-3.5">
                    <div className="relative group/live">
                      <img
                        src={cleanerAvatarInput || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
                        alt={cleanerNameInput || editingCleaner.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-lg"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/50 text-white rounded-full flex flex-col items-center justify-center opacity-0 group-hover/live:opacity-100 transition-opacity cursor-pointer text-[9px] font-bold"
                        title="Klik untuk unggah foto baru"
                      >
                        <Camera className="w-4 h-4 mb-0.5" />
                        <span>Ganti</span>
                      </button>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 font-mono uppercase block">Pratinjau Profil</span>
                      <h4 className="font-bold text-white text-sm block truncate max-w-[180px]">
                        {cleanerNameInput.trim() || editingCleaner.name}
                      </h4>
                      <span className="text-[10px] text-emerald-400 font-medium block mt-0.5">
                        Petugas Kebersihan Gudang
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetAvatar}
                    className="p-2 hover:bg-zinc-850 text-zinc-500 hover:text-zinc-300 rounded-xl transition-all text-[11px] flex items-center space-x-1 cursor-pointer border border-zinc-850"
                    title="Kembalikan ke foto bawaan"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Reset Foto</span>
                  </button>
                </div>

                {/* Photo Selector Section */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-zinc-300">
                      Foto Profil Petugas
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">Pilih metode penggantian</span>
                  </div>

                  {/* Photo Source Tabs */}
                  <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-850 text-xs">
                    <button
                      type="button"
                      onClick={() => setAvatarTab('UPLOAD')}
                      className={`py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                        avatarTab === 'UPLOAD'
                          ? 'bg-emerald-500 text-zinc-950 shadow'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Unggah File</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarTab('PRESET')}
                      className={`py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                        avatarTab === 'PRESET'
                          ? 'bg-emerald-500 text-zinc-950 shadow'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Preset Avatar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarTab('URL')}
                      className={`py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                        avatarTab === 'URL'
                          ? 'bg-emerald-500 text-zinc-950 shadow'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                      }`}
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>Link URL</span>
                    </button>
                  </div>

                  {/* Tab Content 1: Upload File */}
                  {avatarTab === 'UPLOAD' && (
                    <div className="space-y-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarFileUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="p-5 border-2 border-dashed border-zinc-800 hover:border-emerald-500/60 rounded-xl bg-zinc-950/40 hover:bg-zinc-950 text-center cursor-pointer transition-all group/upload"
                      >
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-2 group-hover/upload:scale-110 transition-transform">
                          <Upload className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-zinc-200">
                          Klik untuk memilih foto baru dari perangkat
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-1">
                          Mendukung JPG, PNG, WEBP (Otomatis dikompresi)
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Tab Content 2: Preset Avatars */}
                  {avatarTab === 'PRESET' && (
                    <div className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-xl space-y-2">
                      <span className="text-[11px] text-zinc-400 block font-medium">
                        Pilih salah satu avatar profesional di bawah ini:
                      </span>
                      <div className="grid grid-cols-5 gap-2.5">
                        {PRESET_AVATARS.map((url, idx) => {
                          const isSelected = cleanerAvatarInput === url;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setCleanerAvatarInput(url);
                                setCleanerUpdateError('');
                              }}
                              className={`relative aspect-square rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-emerald-400 ring-2 ring-emerald-500/30 scale-105'
                                  : 'border-zinc-800 hover:border-zinc-500 opacity-70 hover:opacity-100'
                              }`}
                            >
                              <img
                                src={url}
                                alt={`Preset ${idx + 1}`}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              {isSelected && (
                                <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                                  <Check className="w-3.5 h-3.5 text-emerald-300 drop-shadow" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tab Content 3: URL Link */}
                  {avatarTab === 'URL' && (
                    <div className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-xl space-y-2">
                      <div className="flex space-x-2">
                        <input
                          type="url"
                          value={customUrlInput}
                          onChange={(e) => setCustomUrlInput(e.target.value)}
                          placeholder="https://images.unsplash.com/..."
                          className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-lg text-xs text-zinc-200 placeholder-zinc-700 outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCustomUrl}
                          className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold rounded-lg transition-all cursor-pointer"
                        >
                          Terapkan
                        </button>
                      </div>
                      <span className="text-[10px] text-zinc-500 block">
                        Tempel URL gambar langsung untuk menerapkan sebagai foto profil.
                      </span>
                    </div>
                  )}
                </div>

                {/* Name Input Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-300">
                    Nama Lengkap Petugas <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
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
                    Perubahan foto dan nama akan langsung diperbarui di database dan disinkronkan ke seluruh sistem (penugasan, laporan kebersihan, dan log absensi).
                  </span>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-zinc-800/80">
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
                        <span>Simpan Perubahan</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full Location & Photo Verification Modal */}
      {selectedAttendanceForLocationModal && (
        <AttendanceLocationModal
          attendance={selectedAttendanceForLocationModal}
          allAttendances={attendanceList}
          onClose={() => setSelectedAttendanceForLocationModal(null)}
        />
      )}

    </div>
  );
}
