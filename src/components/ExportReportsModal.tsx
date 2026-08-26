import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  FileText, 
  FileSpreadsheet, 
  SlidersHorizontal, 
  Building, 
  CheckCircle2, 
  Info, 
  Download, 
  Check, 
  PenTool, 
  Trash2, 
  FileCheck2, 
  LayoutDashboard, 
  Eye, 
  BarChart3, 
  AlertTriangle, 
  Search, 
  Layers, 
  RotateCcw
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Report, Warehouse, User as UserType, SystemSettings } from '../types';
import SignaturePadModal from './SignaturePadModal';

interface ExportReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: Report[];
  warehouses: Warehouse[];
  users: UserType[];
  currentUser: UserType;
  systemSettings?: SystemSettings;
}

type TabType = 'DASHBOARD' | 'PREVIEW_SHEET' | 'SIGNERS' | 'FILTER';

export default function ExportReportsModal({
  isOpen,
  onClose,
  reports,
  warehouses,
  currentUser,
  systemSettings
}: ExportReportsModalProps) {
  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<TabType>('DASHBOARD');

  // Filters State
  const [exportWarehouse, setExportWarehouse] = useState<string>('ALL');
  const [exportStatus, setExportStatus] = useState<string>('ALL');
  const [exportPeriod, setExportPeriod] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Custom Signers & Signature States (Live Editable for this Export)
  const [cleanerName, setCleanerName] = useState<string>(
    systemSettings?.cleanerSignerName || 'Budi Santoso & Tim Kebersihan'
  );
  const [cleanerTitle, setCleanerTitle] = useState<string>(
    systemSettings?.cleanerSignerTitle || 'Koordinator Pelaksana Bersih Area'
  );
  const [cleanerCompany, setCleanerCompany] = useState<string>(
    systemSettings?.cleanerSignerCompany || 'Divisi Fasilitas & Cleanliness'
  );
  const [cleanerSignature, setCleanerSignature] = useState<string>(
    systemSettings?.cleanerSignature || ''
  );

  const [kepalaName, setKepalaName] = useState<string>(
    systemSettings?.kepalaSignerName || currentUser?.name || 'Wahyu Andriansyah, S.T.'
  );
  const [kepalaTitle, setKepalaTitle] = useState<string>(
    systemSettings?.kepalaSignerTitle || 'Kepala Gudang & Fasilitas Terdaftar'
  );
  const [kepalaCompany, setKepalaCompany] = useState<string>(
    systemSettings?.kepalaSignerCompany || systemSettings?.companyName || 'PT Logistik Prima Nusantara'
  );
  const [kepalaSignature, setKepalaSignature] = useState<string>(
    systemSettings?.kepalaSignature || ''
  );

  const [auditorName, setAuditorName] = useState<string>(
    systemSettings?.auditorName || 'Ahmad Subarjo, M.T.'
  );
  const [auditorTitle, setAuditorTitle] = useState<string>(
    systemSettings?.auditorTitle || 'Lead Logistics & Quality Auditor'
  );
  const [auditorCompany, setAuditorCompany] = useState<string>(
    systemSettings?.auditorCompany || 'PT Inspeksi Mutu Nasional'
  );
  const [auditorSignature, setAuditorSignature] = useState<string>(
    systemSettings?.auditorSignature || ''
  );

  // Signature Modal Target
  const [activeSignatureTarget, setActiveSignatureTarget] = useState<'cleaner' | 'kepala' | 'auditor' | null>(null);

  // Custom Audit Document Metadata
  const docPrefix = systemSettings?.documentPrefix || 'GC-AUDIT';
  const [docNumber] = useState<string>(() => `${docPrefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const companyName = systemSettings?.companyName || 'PT Logistik Prima Nusantara';

  if (!isOpen) return null;

  const alphabetList = Array.from({ length: 12 }, (_, i) => String.fromCharCode(65 + i)); // A to L

  // Format Indonesian Date Time
  const formatIndonesianDateTime = (dateStr: string) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const date = new Date(dateStr);
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${dayName}, ${day} ${monthName} ${year} - ${hours}.${minutes} WIB`;
  };

  // Date period filtering logic
  const getIsInPeriod = (dateStr: string, period: string) => {
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

  // Filtered reports specifically for export & dashboard
  const getFilteredReportsForExport = () => {
    return reports.filter(report => {
      const matchesWarehouse = exportWarehouse === 'ALL' || report.warehouse === exportWarehouse;
      const matchesStatus = exportStatus === 'ALL' || report.status === exportStatus;
      const matchesPeriod = getIsInPeriod(report.timestamp, exportPeriod);
      const matchesSearch = !searchKeyword.trim() || 
        report.warehouse.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        report.description.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (report.feedback && report.feedback.toLowerCase().includes(searchKeyword.toLowerCase())) ||
        report.status.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (report.cleanerName && report.cleanerName.toLowerCase().includes(searchKeyword.toLowerCase()));

      return matchesWarehouse && matchesStatus && matchesPeriod && matchesSearch;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const filteredExportData = getFilteredReportsForExport();

  // Metric calculations
  const totalReportsCount = filteredExportData.length;
  const approvedCount = filteredExportData.filter(r => r.status === 'APPROVED').length;
  const pendingCount = filteredExportData.filter(r => r.status === 'PENDING').length;
  const rejectedCount = filteredExportData.filter(r => r.status === 'REJECTED').length;
  const approvalRate = totalReportsCount > 0 ? Math.round((approvedCount / totalReportsCount) * 100) : 100;

  const cleanWarehousesCount = warehouses.filter(w => w.status === 'BERSIH').length;
  const inProgressWarehousesCount = warehouses.filter(w => w.status === 'DALAM_PENGERJAAN').length;
  const dirtyWarehousesCount = warehouses.filter(w => w.status === 'KOTOR').length;
  const warehouseCleanRate = warehouses.length > 0 ? Math.round((cleanWarehousesCount / warehouses.length) * 100) : 0;

  // DIRECT AUDIT PDF DOWNLOAD (Using jsPDF & AutoTable with Embedded Signatures)
  const handleDownloadAuditPDFDirectly = () => {
    setIsExportingPdf(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const data = filteredExportData;
      const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const company = systemSettings?.companyName || companyName;
      const auditor = auditorName;
      const prefix = systemSettings?.documentPrefix || 'GC-AUDIT';
      const auditDocId = `${prefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const cleanCount = warehouses.filter(w => w.status === 'BERSIH').length;
      const inProgressCount = warehouses.filter(w => w.status === 'DALAM_PENGERJAAN').length;
      const dirtyCount = warehouses.filter(w => w.status === 'KOTOR').length;
      const cleanPercentage = warehouses.length > 0 ? Math.round((cleanCount / warehouses.length) * 100) : 0;

      // Header Dark Top Banner
      doc.setFillColor(15, 16, 22); // #0f1016
      doc.rect(0, 0, 210, 38, 'F');

      // Emerald accent divider
      doc.setFillColor(16, 185, 129); // emerald-500
      doc.rect(0, 37.2, 210, 1.2, 'F');

      // Brand Logo & Title
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(17);
      doc.text("GUDANGCLEAN", 14, 15);

      doc.setFontSize(8.5);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(161, 161, 170); // zinc-400
      doc.text(systemSettings?.systemName || "Sistem Pemantauan Kebersihan Terpadu - Gudang A s/d L", 14, 21);
      doc.text(systemSettings?.tagline || "Layanan Pemeliharaan Kebersihan & Standardisasi Mutu Gudang Logistik", 14, 26);
      doc.text(`Instansi: ${company}  |  Auditor Mutu: ${auditor}`, 14, 31);

      // Document Number Badge on top-right
      doc.setFillColor(24, 24, 32);
      doc.roundedRect(138, 7, 58, 23, 2, 2, 'F');
      doc.setTextColor(110, 231, 183);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text("DOKUMEN AUDIT RESMI", 141, 13);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.text(auditDocId, 141, 19);
      doc.setTextColor(161, 161, 170);
      doc.setFontSize(7);
      doc.setFont("Helvetica", "normal");
      doc.text(`Tgl Cetak: ${dateStr}`, 141, 25);

      // Title Section
      doc.setTextColor(15, 23, 42);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(13);
      doc.text("BERITA ACARA & LAPORAN AUDIT KEBERSIHAN", 14, 46);

      doc.setFontSize(8);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      const periodText = exportPeriod === 'ALL' ? 'Semua Periode' : 
                         exportPeriod === 'TODAY' ? 'Hari Ini' : 
                         exportPeriod === 'WEEK' ? '7 Hari Terakhir' : '30 Hari Terakhir';
      const warehouseText = exportWarehouse === 'ALL' ? 'Semua Gudang (A-L)' : `Gudang ${exportWarehouse}`;
      doc.text(`Filter Cakupan: ${warehouseText}  |  Periode: ${periodText}  |  Total Laporan: ${data.length} data`, 14, 51);

      // Metric Summary Boxes
      // Box 1: Persentase Bersih
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(167, 243, 208);
      doc.roundedRect(14, 56, 42, 15, 1.5, 1.5, 'FD');
      doc.setTextColor(21, 128, 61);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`${cleanPercentage}%`, 18, 64);
      doc.setFontSize(6.5);
      doc.text("Lolos Standar Bersih", 18, 68.5);

      // Box 2: Gudang Bersih
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(60, 56, 42, 15, 1.5, 1.5, 'FD');
      doc.setTextColor(51, 65, 85);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`${cleanCount} Area`, 64, 64);
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Kategori Bersih Terverifikasi", 64, 68.5);

      // Box 3: Gudang Proses
      doc.setFillColor(254, 252, 232);
      doc.setDrawColor(254, 240, 138);
      doc.roundedRect(106, 56, 42, 15, 1.5, 1.5, 'FD');
      doc.setTextColor(161, 98, 7);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`${inProgressCount} Area`, 110, 64);
      doc.setFontSize(6.5);
      doc.text("Dalam Pembersihan", 110, 68.5);

      // Box 4: Gudang Kotor
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(254, 202, 202);
      doc.roundedRect(152, 56, 44, 15, 1.5, 1.5, 'FD');
      doc.setTextColor(185, 28, 28);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`${dirtyCount} Area`, 156, 64);
      doc.setFontSize(6.5);
      doc.text("Perlu Tindak Lanjut Segera", 156, 68.5);

      // Table Header and Body Generation
      const tableHeaders = [
        ["No", "Waktu / Tgl", "Gudang", "Petugas", "Catatan Kebersihan", "Feedback Kepala", "Status"]
      ];

      const tableRows = data.map((item, index) => {
        const dateObj = new Date(item.timestamp);
        const formattedDate = `${dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' })} ${dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
        const statusLabel = item.status === 'APPROVED' ? 'DISETUJUI' : item.status === 'REJECTED' ? 'DITOLAK' : 'MENUNGGU';

        return [
          String(index + 1),
          formattedDate,
          `Gudang ${item.warehouse}`,
          item.cleanerName || "Petugas",
          item.description || "-",
          item.feedback || "-",
          statusLabel
        ];
      });

      // AutoTable Plugin Execution
      autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY: 76,
        theme: 'striped',
        headStyles: {
          fillColor: [15, 16, 22],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold',
          halign: 'left',
          cellPadding: 2.2
        },
        bodyStyles: {
          fontSize: 7,
          cellPadding: 2,
          textColor: [30, 41, 59]
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 26 },
          2: { cellWidth: 18, fontStyle: 'bold' },
          3: { cellWidth: 24 },
          4: { cellWidth: 48 },
          5: { cellWidth: 40 },
          6: { cellWidth: 20, fontStyle: 'bold', halign: 'center' }
        },
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index === 6) {
            const rawVal = data.cell.raw;
            if (rawVal === 'DISETUJUI') {
              data.cell.styles.textColor = [16, 185, 129];
            } else if (rawVal === 'DITOLAK') {
              data.cell.styles.textColor = [239, 68, 68];
            } else {
              data.cell.styles.textColor = [234, 179, 8];
            }
          }
        },
        margin: { left: 14, right: 14 }
      });

      // Signature Block at Bottom / Final Page
      // @ts-ignore
      const finalY = (doc as any).lastAutoTable?.finalY || 160;
      let sigY = finalY + 8;
      if (sigY > 230) {
        doc.addPage();
        sigY = 20;
      }

      doc.setFontSize(8);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("LEMBAR PENGESAHAN & PENJAMIN MUTU AUDIT", 14, sigY);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, sigY + 2, 196, sigY + 2);

      const sigBoxY = sigY + 6;

      // Draw Signatures if present (40mm width x 13mm height)
      if (cleanerSignature && cleanerSignature.startsWith('data:image')) {
        try {
          doc.addImage(cleanerSignature, 'PNG', 16, sigBoxY + 3, 40, 13);
        } catch (e) {
          console.warn('Could not render cleaner signature', e);
        }
      }

      if (kepalaSignature && kepalaSignature.startsWith('data:image')) {
        try {
          doc.addImage(kepalaSignature, 'PNG', 81, sigBoxY + 3, 40, 13);
        } catch (e) {
          console.warn('Could not render kepala signature', e);
        }
      }

      if (auditorSignature && auditorSignature.startsWith('data:image')) {
        try {
          doc.addImage(auditorSignature, 'PNG', 141, sigBoxY + 3, 40, 13);
        } catch (e) {
          console.warn('Could not render auditor signature', e);
        }
      }

      // 1. Disiapkan (Petugas Staf)
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text("Disiapkan & Dilaporkan:", 18, sigBoxY);
      doc.setDrawColor(203, 213, 225);
      doc.line(18, sigBoxY + 17, 68, sigBoxY + 17);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(cleanerName || "Budi Santoso & Tim Kebersihan", 18, sigBoxY + 21);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(cleanerTitle || "Koordinator Pelaksana Bersih Area", 18, sigBoxY + 25);
      doc.text(cleanerCompany || "Divisi Fasilitas & Cleanliness", 18, sigBoxY + 29);

      // 2. Disahkan (Kepala Gudang)
      doc.text("Diverifikasi & Disahkan:", 83, sigBoxY);
      doc.setDrawColor(203, 213, 225);
      doc.line(83, sigBoxY + 17, 133, sigBoxY + 17);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(kepalaName || currentUser.name, 83, sigBoxY + 21);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(kepalaTitle || "Kepala Gudang & Fasilitas Terdaftar", 83, sigBoxY + 25);
      doc.text(kepalaCompany || company, 83, sigBoxY + 29);

      // 3. Auditor Mutu
      doc.text("Diverifikasi Auditor Mutu:", 143, sigBoxY);
      doc.setDrawColor(203, 213, 225);
      doc.line(143, sigBoxY + 17, 193, sigBoxY + 17);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(auditorName || auditor, 143, sigBoxY + 21);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(auditorTitle || "Lead Logistics & Quality Auditor", 143, sigBoxY + 25);
      doc.text(auditorCompany || company, 143, sigBoxY + 29);

      // Footer notes
      const pageCount = (doc.internal as any).getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Dokumen resmi ini di-generate otomatis oleh Sistem GudangClean (${company}) • Hal ${i} dari ${pageCount}`,
          14,
          290
        );
        doc.text(`Kode Verifikasi: ${auditDocId} • Otentik`, 150, 290);
      }

      // DIRECT DOWNLOAD: Triggers instant browser download
      const fileName = `${auditDocId}_Laporan_Audit_Kebersihan.pdf`;
      doc.save(fileName);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4500);
    } catch (err) {
      console.error("PDF Generation error:", err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // 2. EXCEL / SPREADSHEET EXPORT
  const handleExportExcel = () => {
    const data = filteredExportData;
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Logbook Kebersihan</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Calibri, sans-serif; font-size: 11pt; }
          th { background-color: #0f1016; color: #ffffff; font-weight: bold; border: 1px solid #333333; padding: 8px; text-align: left; }
          td { border: 1px solid #cccccc; padding: 6px; }
          .header-title { font-size: 16pt; font-weight: bold; color: #10b981; }
          .sub-title { font-size: 10pt; color: #666666; margin-bottom: 12px; }
        </style>
      </head>
      <body>
        <div class="header-title">LOGBOOK AUDIT KEBERSIHAN GUDANG A s/d L</div>
        <div class="sub-title">Dokumen No: ${docNumber} | Diekspor pada: ${new Date().toLocaleString('id-ID')} | Perusahaan: ${companyName}</div>
        <br/>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Waktu Laporan</th>
              <th>Gudang</th>
              <th>Petugas Pelaksana</th>
              <th>Catatan & Temuan Kebersihan</th>
              <th>Feedback & Catatan Kepala</th>
              <th>Status Verifikasi</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (data.length === 0) {
      html += `<tr><td colspan="7" style="text-align: center; color: #999999;">Tidak ada data laporan pada filter ini</td></tr>`;
    } else {
      data.forEach((r, idx) => {
        html += `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td>${formatIndonesianDateTime(r.timestamp)}</td>
            <td style="font-weight: bold; text-align: center;">Gudang ${r.warehouse}</td>
            <td>${r.cleanerName || '-'}</td>
            <td>${r.description || '-'}</td>
            <td>${r.feedback || '-'}</td>
            <td style="text-align: center; font-weight: bold;">${r.status}</td>
          </tr>
        `;
      });
    }

    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${docNumber}_Log_Book_Kebersihan.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-110 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/85 backdrop-blur-md"
      />

      {/* Modal Container (Expansive & High Performance) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative w-full max-w-5xl bg-[#0f1016] border border-zinc-800/90 rounded-2xl shadow-2xl z-10 flex flex-col max-h-[94vh] overflow-hidden font-sans"
        id="export-reports-modal-body"
      >
        {/* Header with Navigation Tabs */}
        <div className="border-b border-zinc-900 bg-zinc-950/60 p-4 sm:p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-emerald-400">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-inner">
                <FileText className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base sm:text-lg font-display tracking-tight flex items-center space-x-2">
                  <span>Dasbor Laporan & Ekspor Audit PDF</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold hidden sm:inline-block">
                    LIVE DASHBOARD
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Analisis metrik kepatuhan kebersihan, tinjau lembar kertas audit resmi, dan verifikasi tanda tangan sebelum diunduh.
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer outline-none border border-transparent hover:border-zinc-800"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Bar Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none pt-1">
            <button
              type="button"
              onClick={() => setActiveTab('DASHBOARD')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
                activeTab === 'DASHBOARD'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'bg-zinc-900/60 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-850'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>1. Dasbor Ringkasan & Metrik</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PREVIEW_SHEET')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
                activeTab === 'PREVIEW_SHEET'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'bg-zinc-900/60 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-850'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>2. Pratinjau Lembar Audit Cetak</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SIGNERS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
                activeTab === 'SIGNERS'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'bg-zinc-900/60 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-850'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>3. Pengesahan & TTD Digital</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('FILTER')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
                activeTab === 'FILTER'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'bg-zinc-900/60 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-850'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>4. Filter & Cakupan Data</span>
            </button>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 max-h-[65vh] scrollbar-thin scrollbar-thumb-zinc-800">
          
          {/* Success Download Alert Notification */}
          <AnimatePresence>
            {downloadSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg"
              >
                <div className="flex items-center space-x-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Berkas Laporan Audit Resmi (.PDF) berhasil diunduh ke perangkat Anda!</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                  {docNumber}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ================= TAB 1: DASBOR RINGKASAN & METRIK ================= */}
          {activeTab === 'DASHBOARD' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Executive KPI Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* KPI 1 */}
                <div className="p-4 bg-zinc-950/70 border border-zinc-850/80 rounded-xl flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Laporan</span>
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-black text-white font-mono">{totalReportsCount}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      {exportWarehouse === 'ALL' ? 'Semua Gudang (A-L)' : `Gudang ${exportWarehouse}`}
                    </div>
                  </div>
                </div>

                {/* KPI 2 */}
                <div className="p-4 bg-zinc-950/70 border border-zinc-850/80 rounded-xl flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Tingkat Disetujui</span>
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-black text-emerald-400 font-mono">{approvalRate}%</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      {approvedCount} Disetujui • {pendingCount} Menunggu
                    </div>
                  </div>
                </div>

                {/* KPI 3 */}
                <div className="p-4 bg-zinc-950/70 border border-zinc-850/80 rounded-xl flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Kepatuhan Area</span>
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <Building className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-black text-white font-mono">{cleanWarehousesCount} / 12</div>
                    <div className="text-[10px] text-emerald-400 mt-0.5 font-semibold">
                      {warehouseCleanRate}% Gudang Kategori Bersih
                    </div>
                  </div>
                </div>

                {/* KPI 4 */}
                <div className="p-4 bg-zinc-950/70 border border-zinc-850/80 rounded-xl flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Perlu Perhatian</span>
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-black text-amber-400 font-mono">{dirtyWarehousesCount + rejectedCount}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      {dirtyWarehousesCount} Gudang Kotor • {rejectedCount} Laporan Ditolak
                    </div>
                  </div>
                </div>
              </div>

              {/* Matriks Status Kepatuhan 12 Gudang (Gudang A s/d L) */}
              <div className="p-4 sm:p-5 bg-zinc-950/60 border border-zinc-900 rounded-xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Matriks Kondisi 12 Gudang Terpadu (A s/d L)
                    </h4>
                  </div>
                  <div className="flex items-center space-x-3 text-[10px] font-semibold text-zinc-400">
                    <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span>Bersih ({cleanWarehousesCount})</span></span>
                    <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span><span>Proses ({inProgressWarehousesCount})</span></span>
                    <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span><span>Kotor ({dirtyWarehousesCount})</span></span>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {warehouses.map((wh) => {
                    const whReports = filteredExportData.filter(r => r.warehouse === wh.id);
                    const isSelected = exportWarehouse === wh.id;
                    const statusColor = 
                      wh.status === 'BERSIH' 
                        ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400' 
                        : wh.status === 'DALAM_PENGERJAAN' 
                        ? 'border-amber-500/30 bg-amber-950/20 text-amber-400' 
                        : 'border-rose-500/30 bg-rose-950/20 text-rose-400';

                    return (
                      <button
                        key={wh.id}
                        type="button"
                        onClick={() => setExportWarehouse(exportWarehouse === wh.id ? 'ALL' : wh.id)}
                        className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${statusColor} ${
                          isSelected ? 'ring-2 ring-emerald-400 shadow-lg' : 'hover:scale-[1.02]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs">Gudang {wh.id}</span>
                          <span className="text-[9px] font-mono opacity-80">{whReports.length} lap</span>
                        </div>
                        <div className="text-[10px] truncate text-zinc-400 mt-1">{wh.area}</div>
                        <div className="text-[9px] font-bold mt-1 uppercase tracking-tight">
                          {wh.status === 'BERSIH' ? '✓ Bersih' : wh.status === 'DALAM_PENGERJAAN' ? '⏳ Proses' : '⚠️ Kotor'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tabel Pratinjau Rekapitulasi Data Laporan */}
              <div className="p-4 sm:p-5 bg-zinc-950/60 border border-zinc-900 rounded-xl space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Daftar Log Laporan Siap Unduh ({filteredExportData.length} Baris)
                    </h4>
                  </div>
                  
                  {/* Instant Search Bar */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      placeholder="Cari gudang / catatan..."
                      className="pl-8 pr-3 py-1.5 bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 rounded-lg text-xs text-zinc-200 outline-none w-full sm:w-56 transition-colors"
                    />
                  </div>
                </div>

                <div className="border border-zinc-850 rounded-lg overflow-hidden">
                  <div className="max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-900 text-zinc-400 text-[10px] uppercase tracking-wider sticky top-0 z-1">
                        <tr>
                          <th className="px-3 py-2">No</th>
                          <th className="px-3 py-2">Waktu</th>
                          <th className="px-3 py-2">Gudang</th>
                          <th className="px-3 py-2">Petugas</th>
                          <th className="px-3 py-2">Catatan Temuan</th>
                          <th className="px-3 py-2">Feedback Kepala</th>
                          <th className="px-3 py-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-855 text-zinc-300">
                        {filteredExportData.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-zinc-500 italic">
                              Tidak ada laporan yang sesuai dengan filter atau kata kunci pencarian.
                            </td>
                          </tr>
                        ) : (
                          filteredExportData.map((item, index) => (
                            <tr key={item.id} className="hover:bg-zinc-900/40 transition-colors">
                              <td className="px-3 py-2 text-zinc-500 text-[11px]">{index + 1}</td>
                              <td className="px-3 py-2 text-zinc-400 text-[11px] whitespace-nowrap">
                                {new Date(item.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} {new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-3 py-2 font-bold text-white whitespace-nowrap">
                                Gudang {item.warehouse}
                              </td>
                              <td className="px-3 py-2 text-zinc-300 whitespace-nowrap">
                                {item.cleanerName || 'Petugas'}
                              </td>
                              <td className="px-3 py-2 text-zinc-300 max-w-[180px] truncate" title={item.description}>
                                {item.description || '-'}
                              </td>
                              <td className="px-3 py-2 text-zinc-400 max-w-[150px] truncate" title={item.feedback}>
                                {item.feedback || '-'}
                              </td>
                              <td className="px-3 py-2 text-center whitespace-nowrap">
                                {item.status === 'APPROVED' ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    DISETUJUI
                                  </span>
                                ) : item.status === 'REJECTED' ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                    DITOLAK
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    MENUNGGU
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                  <span>Menampilkan {filteredExportData.length} dari {reports.length} total laporan dalam sistem</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('PREVIEW_SHEET')}
                    className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Lihat Tata Letak Cetak PDF</span>
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ================= TAB 2: PRATINJAU LEMBAR AUDIT CETAK ================= */}
          {activeTab === 'PREVIEW_SHEET' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl">
                <div className="flex items-center space-x-2 text-xs text-zinc-300">
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <span>Pratinjau Kertas Format A4 Berstandar ISO / Audit Mutu</span>
                </div>
                <div className="text-[11px] font-mono text-zinc-400">
                  No Dokumen: <span className="text-emerald-400 font-bold">{docNumber}</span>
                </div>
              </div>

              {/* Realistic A4 White Paper Container */}
              <div className="bg-white text-zinc-900 rounded-xl shadow-2xl p-6 sm:p-8 space-y-6 border border-zinc-200">
                {/* Official Paper Header */}
                <div className="border-b-2 border-zinc-900 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded bg-zinc-900 text-emerald-400 flex items-center justify-center font-black text-sm">
                        GC
                      </div>
                      <span className="text-xl font-black tracking-tight text-zinc-950">GUDANGCLEAN</span>
                    </div>
                    <div className="text-xs font-bold text-zinc-700">{systemSettings?.systemName || 'Sistem Pemantauan Kebersihan Terpadu - Gudang A s/d L'}</div>
                    <div className="text-[11px] text-zinc-500">{companyName} • Divisi Audit & Pemeliharaan Fasilitas Logistik</div>
                  </div>

                  <div className="p-3 bg-zinc-50 border border-zinc-300 rounded-lg text-right sm:text-right w-full sm:w-auto">
                    <div className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest">DOKUMEN AUDIT RESMI</div>
                    <div className="text-xs font-mono font-extrabold text-zinc-900 mt-0.5">{docNumber}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Tgl Cetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  </div>
                </div>

                {/* Title & Scope Info */}
                <div className="space-y-1.5">
                  <h3 className="text-base font-extrabold text-zinc-950 uppercase tracking-tight">
                    BERITA ACARA & REKAPITULASI AUDIT KEBERSIHAN
                  </h3>
                  <div className="text-xs text-zinc-600 flex flex-wrap gap-x-4 gap-y-1">
                    <span><strong>Cakupan:</strong> {exportWarehouse === 'ALL' ? 'Semua Gudang (A - L)' : `Gudang ${exportWarehouse}`}</span>
                    <span><strong>Periode:</strong> {exportPeriod === 'ALL' ? 'Semua Waktu' : exportPeriod === 'TODAY' ? 'Hari Ini' : exportPeriod === 'WEEK' ? '7 Hari Terakhir' : '30 Hari Terakhir'}</span>
                    <span><strong>Total Data:</strong> {filteredExportData.length} Catatan Audit</span>
                  </div>
                </div>

                {/* Mini Summary Stat Boxes in Paper */}
                <div className="grid grid-cols-4 gap-2.5 text-center">
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="text-base font-black text-emerald-700">{approvalRate}%</div>
                    <div className="text-[9px] font-bold text-emerald-800 uppercase">Lolos Standar</div>
                  </div>
                  <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg">
                    <div className="text-base font-black text-zinc-800">{cleanWarehousesCount} Area</div>
                    <div className="text-[9px] font-bold text-zinc-600 uppercase">Gudang Bersih</div>
                  </div>
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="text-base font-black text-amber-700">{inProgressWarehousesCount} Area</div>
                    <div className="text-[9px] font-bold text-amber-800 uppercase">Pembersihan</div>
                  </div>
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                    <div className="text-base font-black text-rose-700">{dirtyWarehousesCount} Area</div>
                    <div className="text-[9px] font-bold text-rose-800 uppercase">Perlu Tindakan</div>
                  </div>
                </div>

                {/* Document Table Sample (First 5 Rows Preview) */}
                <div className="border border-zinc-300 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-zinc-900 text-white text-[10px]">
                      <tr>
                        <th className="p-2 text-center w-8">No</th>
                        <th className="p-2">Waktu / Tanggal</th>
                        <th className="p-2">Gudang</th>
                        <th className="p-2">Petugas</th>
                        <th className="p-2">Catatan Kebersihan</th>
                        <th className="p-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 text-zinc-800 text-[11px]">
                      {filteredExportData.slice(0, 5).map((item, index) => (
                        <tr key={item.id} className={index % 2 === 1 ? 'bg-zinc-50' : 'bg-white'}>
                          <td className="p-2 text-center text-zinc-500">{index + 1}</td>
                          <td className="p-2 whitespace-nowrap text-[10px]">
                            {new Date(item.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </td>
                          <td className="p-2 font-bold text-zinc-950">Gudang {item.warehouse}</td>
                          <td className="p-2">{item.cleanerName || 'Petugas'}</td>
                          <td className="p-2 max-w-[200px] truncate">{item.description || '-'}</td>
                          <td className="p-2 text-center font-bold">
                            <span className={item.status === 'APPROVED' ? 'text-emerald-600' : item.status === 'REJECTED' ? 'text-rose-600' : 'text-amber-600'}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredExportData.length > 5 && (
                    <div className="p-2 bg-zinc-100 text-center text-[10px] text-zinc-600 font-medium border-t border-zinc-200">
                      + Menampilkan 5 sampel dari total {filteredExportData.length} baris (seluruh data akan otomatis disertakan dalam berkas PDF).
                    </div>
                  )}
                </div>

                {/* Lembar Pengesahan Tanda Tangan (Live Signature Preview Sheet) */}
                <div className="pt-4 border-t-2 border-zinc-200 space-y-3">
                  <div className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                    Lembar Pengesahan & Tanda Tangan Penjamin Mutu
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    {/* Signer 1: Petugas */}
                    <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-center space-y-1">
                      <div className="text-[10px] font-semibold text-zinc-500">Disiapkan & Dilaporkan:</div>
                      <div className="h-14 flex items-center justify-center my-1">
                        {cleanerSignature ? (
                          <img src={cleanerSignature} alt="TTD Petugas" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <span className="text-[10px] text-zinc-400 italic">Belum ada TTD</span>
                        )}
                      </div>
                      <div className="border-t border-zinc-400 pt-1">
                        <div className="text-xs font-bold text-zinc-900">{cleanerName}</div>
                        <div className="text-[10px] text-zinc-500">{cleanerTitle}</div>
                        <div className="text-[9px] text-zinc-400">{cleanerCompany}</div>
                      </div>
                    </div>

                    {/* Signer 2: Kepala Gudang */}
                    <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-center space-y-1">
                      <div className="text-[10px] font-semibold text-zinc-500">Diverifikasi & Disahkan:</div>
                      <div className="h-14 flex items-center justify-center my-1">
                        {kepalaSignature ? (
                          <img src={kepalaSignature} alt="TTD Kepala" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <span className="text-[10px] text-zinc-400 italic">Belum ada TTD</span>
                        )}
                      </div>
                      <div className="border-t border-zinc-400 pt-1">
                        <div className="text-xs font-bold text-zinc-900">{kepalaName}</div>
                        <div className="text-[10px] text-zinc-500">{kepalaTitle}</div>
                        <div className="text-[9px] text-zinc-400">{kepalaCompany}</div>
                      </div>
                    </div>

                    {/* Signer 3: Auditor */}
                    <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-center space-y-1">
                      <div className="text-[10px] font-semibold text-zinc-500">Diverifikasi Auditor Mutu:</div>
                      <div className="h-14 flex items-center justify-center my-1">
                        {auditorSignature ? (
                          <img src={auditorSignature} alt="TTD Auditor" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <span className="text-[10px] text-zinc-400 italic">Belum ada TTD</span>
                        )}
                      </div>
                      <div className="border-t border-zinc-400 pt-1">
                        <div className="text-xs font-bold text-zinc-900">{auditorName}</div>
                        <div className="text-[10px] text-zinc-500">{auditorTitle}</div>
                        <div className="text-[9px] text-zinc-400">{auditorCompany}</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* ================= TAB 3: PENGESAHAN & TTD DIGITAL ================= */}
          {activeTab === 'SIGNERS' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center space-x-1.5">
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>Kustomisasi Nama & Tanda Tangan Penjamin Mutu</span>
                </h4>
                <span className="text-[10px] text-zinc-400 font-medium">
                  Disematkan otomatis ke lembar akhir dokumen PDF
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                {/* Card 1: Petugas Staf Kebersihan */}
                <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-900/80 space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Petugas Staf Gudang</div>
                      <div className="text-[10px] text-zinc-400">Pelaksana Kebersihan</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        Nama Petugas
                      </label>
                      <input
                        type="text"
                        value={cleanerName}
                        onChange={(e) => setCleanerName(e.target.value)}
                        className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 outline-none transition-colors"
                        placeholder="Nama Petugas Staf"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        Jabatan / Divisi
                      </label>
                      <input
                        type="text"
                        value={cleanerTitle}
                        onChange={(e) => setCleanerTitle(e.target.value)}
                        className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 outline-none transition-colors"
                        placeholder="Jabatan"
                      />
                    </div>
                  </div>

                  {/* Signature Preview & Action */}
                  <div className="pt-2 border-t border-zinc-900">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-zinc-400">Tanda Tangan Digital (TTD)</span>
                      {cleanerSignature && (
                        <button
                          type="button"
                          onClick={() => setCleanerSignature('')}
                          className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors flex items-center space-x-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>

                    <div className="h-16 w-full bg-zinc-900/40 border border-dashed border-zinc-800 rounded-lg flex items-center justify-center p-2 relative overflow-hidden">
                      {cleanerSignature ? (
                        <img
                          src={cleanerSignature}
                          alt="TTD Petugas"
                          className="max-h-full max-w-full object-contain filter invert brightness-125"
                        />
                      ) : (
                        <span className="text-[10px] text-zinc-400 italic">Belum ada TTD</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveSignatureTarget('cleaner')}
                      className="w-full mt-2 py-1.5 px-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>{cleanerSignature ? 'Ubah / Gores Ulang TTD' : 'Tambah Tanda Tangan'}</span>
                    </button>
                  </div>
                </div>

                {/* Card 2: Kepala Gudang */}
                <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-900/80 space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Kepala Gudang</div>
                      <div className="text-[10px] text-zinc-400">Verifikator & Pengesah</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        Nama Kepala Gudang
                      </label>
                      <input
                        type="text"
                        value={kepalaName}
                        onChange={(e) => setKepalaName(e.target.value)}
                        className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 outline-none transition-colors"
                        placeholder="Nama Kepala Gudang"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        Jabatan / Instansi
                      </label>
                      <input
                        type="text"
                        value={kepalaTitle}
                        onChange={(e) => setKepalaTitle(e.target.value)}
                        className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 outline-none transition-colors"
                        placeholder="Jabatan"
                      />
                    </div>
                  </div>

                  {/* Signature Preview & Action */}
                  <div className="pt-2 border-t border-zinc-900">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-zinc-400">Tanda Tangan Digital (TTD)</span>
                      {kepalaSignature && (
                        <button
                          type="button"
                          onClick={() => setKepalaSignature('')}
                          className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors flex items-center space-x-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>

                    <div className="h-16 w-full bg-zinc-900/40 border border-dashed border-zinc-800 rounded-lg flex items-center justify-center p-2 relative overflow-hidden">
                      {kepalaSignature ? (
                        <img
                          src={kepalaSignature}
                          alt="TTD Kepala"
                          className="max-h-full max-w-full object-contain filter invert brightness-125"
                        />
                      ) : (
                        <span className="text-[10px] text-zinc-400 italic">Belum ada TTD</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveSignatureTarget('kepala')}
                      className="w-full mt-2 py-1.5 px-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>{kepalaSignature ? 'Ubah / Gores Ulang TTD' : 'Tambah Tanda Tangan'}</span>
                    </button>
                  </div>
                </div>

                {/* Card 3: Auditor Mutu */}
                <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-900/80 space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      3
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Auditor Mutu</div>
                      <div className="text-[10px] text-zinc-400">Penjamin Mutu Eksternal / QA</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        Nama Auditor
                      </label>
                      <input
                        type="text"
                        value={auditorName}
                        onChange={(e) => setAuditorName(e.target.value)}
                        className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 outline-none transition-colors"
                        placeholder="Nama Auditor"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        Badan Audit / Perusahaan
                      </label>
                      <input
                        type="text"
                        value={auditorCompany}
                        onChange={(e) => setAuditorCompany(e.target.value)}
                        className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 outline-none transition-colors"
                        placeholder="Badan Audit"
                      />
                    </div>
                  </div>

                  {/* Signature Preview & Action */}
                  <div className="pt-2 border-t border-zinc-900">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-zinc-400">Tanda Tangan Digital (TTD)</span>
                      {auditorSignature && (
                        <button
                          type="button"
                          onClick={() => setAuditorSignature('')}
                          className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors flex items-center space-x-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>

                    <div className="h-16 w-full bg-zinc-900/40 border border-dashed border-zinc-800 rounded-lg flex items-center justify-center p-2 relative overflow-hidden">
                      {auditorSignature ? (
                        <img
                          src={auditorSignature}
                          alt="TTD Auditor"
                          className="max-h-full max-w-full object-contain filter invert brightness-125"
                        />
                      ) : (
                        <span className="text-[10px] text-zinc-400 italic">Belum ada TTD</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveSignatureTarget('auditor')}
                      className="w-full mt-2 py-1.5 px-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>{auditorSignature ? 'Ubah / Gores Ulang TTD' : 'Tambah Tanda Tangan'}</span>
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* ================= TAB 4: FILTER & CAKUPAN DATA ================= */}
          {activeTab === 'FILTER' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center space-x-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Pengaturan Cakupan & Filter Data Dokumen</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 bg-zinc-950/60 rounded-xl border border-zinc-900">
                {/* Select Warehouse Scope */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Cakupan Gudang
                  </label>
                  <select
                    value={exportWarehouse}
                    onChange={(e) => setExportWarehouse(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500 rounded-lg text-xs text-zinc-200 outline-none cursor-pointer transition-colors"
                  >
                    <option value="ALL">Semua Gudang (A - L)</option>
                    {alphabetList.map((code) => (
                      <option key={code} value={code}>Gudang {code}</option>
                    ))}
                  </select>
                </div>

                {/* Select Status Scope */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Status Verifikasi
                  </label>
                  <select
                    value={exportStatus}
                    onChange={(e) => setExportStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500 rounded-lg text-xs text-zinc-200 outline-none cursor-pointer transition-colors"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="APPROVED">Disetujui Saja (Lolos Audit)</option>
                    <option value="PENDING">Menunggu Verifikasi</option>
                    <option value="REJECTED">Ditolak / Minta Revisi</option>
                  </select>
                </div>

                {/* Select Period Scope */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Rentang Waktu Laporan
                  </label>
                  <select
                    value={exportPeriod}
                    onChange={(e) => setExportPeriod(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500 rounded-lg text-xs text-zinc-200 outline-none cursor-pointer transition-colors"
                  >
                    <option value="ALL">Semua Catatan Historis</option>
                    <option value="TODAY">Hari Ini Saja</option>
                    <option value="WEEK">7 Hari Terakhir</option>
                    <option value="MONTH">30 Hari Terakhir</option>
                  </select>
                </div>
              </div>

              {/* Reset Filter Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setExportWarehouse('ALL');
                    setExportStatus('ALL');
                    setExportPeriod('ALL');
                    setSearchKeyword('');
                  }}
                  className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 text-xs font-semibold rounded-lg border border-zinc-800 transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Semua Filter ke Default</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Bottom Summary Bar & Alternative Format */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 bg-zinc-950/60 rounded-xl border border-zinc-900 gap-3 text-xs">
            <div className="flex items-center space-x-2 text-zinc-400 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Dokumen siap cetak: <strong>{filteredExportData.length} laporan terpilih</strong> ({exportWarehouse === 'ALL' ? 'Semua Gudang A-L' : `Gudang ${exportWarehouse}`})</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-emerald-400 font-semibold rounded-lg border border-emerald-500/20 text-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Unduh Excel (.xls)</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-zinc-900 bg-zinc-950/60 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center space-x-1.5 text-[10px] text-zinc-400">
            <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Dokumen PDF audit resmi diunduh langsung ke folder unduhan browser Anda.</span>
          </div>

          <div className="flex items-center space-x-2.5 self-stretch sm:self-auto">
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer border border-zinc-800/60"
            >
              Tutup
            </button>

            {/* DIRECT PDF DOWNLOAD BUTTON */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              disabled={isExportingPdf}
              onClick={handleDownloadAuditPDFDirectly}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer border-none shadow-lg shadow-emerald-600/25"
              title="Unduh Berkas Laporan PDF Langsung Tanpa Print"
              id="btn-download-pdf-direct"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>{isExportingPdf ? 'Membuat PDF...' : 'Unduh Laporan Audit (PDF)'}</span>
            </motion.button>
          </div>
        </div>

      </motion.div>

      {/* Signature Pad Modal inside ExportReportsModal */}
      {activeSignatureTarget && (
        <SignaturePadModal
          isOpen={!!activeSignatureTarget}
          onClose={() => setActiveSignatureTarget(null)}
          title={
            activeSignatureTarget === 'cleaner'
              ? 'Tanda Tangan Petugas Staf Kebersihan'
              : activeSignatureTarget === 'kepala'
              ? 'Tanda Tangan Kepala Gudang'
              : 'Tanda Tangan Penjamin Mutu / Auditor'
          }
          subtitle={
            activeSignatureTarget === 'cleaner'
              ? `Penandatangan: ${cleanerName}`
              : activeSignatureTarget === 'kepala'
              ? `Penandatangan: ${kepalaName}`
              : `Penandatangan: ${auditorName}`
          }
          signerName={
            activeSignatureTarget === 'cleaner'
              ? cleanerName
              : activeSignatureTarget === 'kepala'
              ? kepalaName
              : auditorName
          }
          initialSignature={
            activeSignatureTarget === 'cleaner'
              ? cleanerSignature
              : activeSignatureTarget === 'kepala'
              ? kepalaSignature
              : auditorSignature
          }
          onSave={(signatureDataUrl) => {
            if (activeSignatureTarget === 'cleaner') {
              setCleanerName(cleanerName);
              setCleanerSignature(signatureDataUrl);
            } else if (activeSignatureTarget === 'kepala') {
              setKepalaSignature(signatureDataUrl);
            } else if (activeSignatureTarget === 'auditor') {
              setAuditorSignature(signatureDataUrl);
            }
          }}
        />
      )}
    </div>
  );
}
