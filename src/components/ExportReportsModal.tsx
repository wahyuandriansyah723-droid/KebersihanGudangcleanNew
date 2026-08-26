import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  FileText, 
  FileSpreadsheet, 
  Printer, 
  SlidersHorizontal, 
  CalendarDays, 
  Building, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  FileCode,
  Info,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { Report, Warehouse, User } from '../types';

interface ExportReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: Report[];
  warehouses: Warehouse[];
  users: User[];
  currentUser: User;
}

export default function ExportReportsModal({
  isOpen,
  onClose,
  reports,
  warehouses,
  users,
  currentUser
}: ExportReportsModalProps) {
  // Filters State
  const [exportWarehouse, setExportWarehouse] = useState<string>('ALL');
  const [exportStatus, setExportStatus] = useState<string>('ALL');
  const [exportPeriod, setExportPeriod] = useState<string>('ALL');
  
  // Custom Audit Document Metadata (maintained silently)
  const [docNumber] = useState<string>(() => `GC-AUDIT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [auditorName] = useState<string>('Ahmad Subarjo, M.T.');
  const [companyName] = useState<string>('PT Logistik Prima Nusantara');
  const [includePhotos] = useState<boolean>(true);
  const [includeSignatures] = useState<boolean>(false);
  const [docTemplate] = useState<'SIBA_LOGBOOK' | 'DETAILED_AUDIT' | 'SIMPLE_LIST'>('SIBA_LOGBOOK');

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

  // Filtered reports specifically for export
  const getFilteredReportsForExport = () => {
    return reports.filter(report => {
      const matchesWarehouse = exportWarehouse === 'ALL' || report.warehouse === exportWarehouse;
      const matchesStatus = exportStatus === 'ALL' || report.status === exportStatus;
      const matchesPeriod = getIsInPeriod(report.timestamp, exportPeriod);
      return matchesWarehouse && matchesStatus && matchesPeriod;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const filteredExportData = getFilteredReportsForExport();

  // 1. GENERATE EXCEL (Styled HTML spreadsheet XML format)
  const handleExportExcel = () => {
    const data = filteredExportData;
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const periodText = exportPeriod === 'ALL' ? 'Semua Periode' : 
                       exportPeriod === 'TODAY' ? 'Hari Ini' : 
                       exportPeriod === 'WEEK' ? '7 Hari Terakhir' : '30 Hari Terakhir';
    const warehouseText = exportWarehouse === 'ALL' ? 'Semua Gudang (A-L)' : `Gudang ${exportWarehouse}`;

    let html = `
      <html xmlns:o="urn:schemas-microsoft-excel:office:office" xmlns:x="urn:schemas-microsoft-excel:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Log Book GudangClean</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; }
          .title { font-size: 16pt; font-weight: bold; text-align: center; color: #0f172a; }
          .subtitle { font-size: 11pt; text-align: center; color: #475569; margin-bottom: 20px; }
          .meta-table { border: none; margin-bottom: 20px; font-size: 10pt; }
          .meta-label { font-weight: bold; width: 150px; background-color: #f1f5f9; padding: 4px; }
          .meta-value { padding: 4px; }
          
          .data-table { border-collapse: collapse; width: 100%; margin-top: 15px; }
          .data-table th { background-color: #059669; color: white; font-weight: bold; text-align: center; border: 1px solid #10b981; padding: 8px; font-size: 10pt; }
          .data-table td { border: 1px solid #cbd5e1; padding: 8px; font-size: 9pt; vertical-align: top; }
          
          .status-approved { background-color: #d1fae5; color: #065f46; font-weight: bold; text-align: center; }
          .status-pending { background-color: #fef3c7; color: #92400e; font-weight: bold; text-align: center; }
          .status-rejected { background-color: #fee2e2; color: #991b1b; font-weight: bold; text-align: center; }
          
          .summary-card { font-size: 10pt; padding: 10px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
          .footer-section { margin-top: 35px; font-size: 10pt; }
        </style>
      </head>
      <body>
        <div class="title">LOG BOOK PEMELIHARAAN KEBERSIHAN GUDANG</div>
        <div class="subtitle">Sistem Pemantauan Kebersihan Terpadu - Gudang A sampai L</div>
        
        <table class="meta-table">
          <tr>
            <td class="meta-label">Nomor Dokumen</td>
            <td class="meta-value">${docNumber}</td>
            <td style="width: 50px;"></td>
            <td class="meta-label">Total Gudang</td>
            <td class="meta-value">${warehouses.length} Gudang (A-L)</td>
          </tr>
          <tr>
            <td class="meta-label">Tanggal Cetak</td>
            <td class="meta-value">${dateStr}</td>
            <td></td>
            <td class="meta-label">Total Laporan</td>
            <td class="meta-value">${data.length} Transaksi</td>
          </tr>
          <tr>
            <td class="meta-label">Perusahaan</td>
            <td class="meta-value">${companyName}</td>
            <td></td>
            <td class="meta-label">Filter Wilayah</td>
            <td class="meta-value">${warehouseText}</td>
          </tr>
          <tr>
            <td class="meta-label">Auditor Utama</td>
            <td class="meta-value">${auditorName}</td>
            <td></td>
            <td class="meta-label">Filter Waktu</td>
            <td class="meta-value">${periodText} (${exportStatus === 'ALL' ? 'Semua Status' : exportStatus})</td>
          </tr>
        </table>

        <div class="summary-card">
          <strong>RINGKASAN STATUS GUDANG SAAT INI:</strong><br/>
          • Bersih: ${warehouses.filter(w => w.status === 'BERSIH').length} Gudang | 
          • Sedang Proses: ${warehouses.filter(w => w.status === 'DALAM_PENGERJAAN').length} Gudang | 
          • Kotor/Butuh Tindakan: ${warehouses.filter(w => w.status === 'KOTOR').length} Gudang
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 30px;">No</th>
              <th style="width: 130px;">Tanggal & Waktu</th>
              <th style="width: 80px;">Gudang</th>
              <th style="width: 150px;">Area Spesifik</th>
              <th style="width: 150px;">Petugas Kebersihan</th>
              <th style="width: 250px;">Keterangan Pekerjaan</th>
              <th style="width: 120px;">Lampiran Sebelum</th>
              <th style="width: 120px;">Lampiran Sesudah</th>
              <th style="width: 200px;">Catatan Korektif / Feedback</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (data.length === 0) {
      html += `
        <tr>
          <td colspan="9" style="text-align: center; color: #64748b; font-style: italic; padding: 20px;">
            Tidak ada data logbook kebersihan yang sesuai dengan kriteria filter.
          </td>
        </tr>
      `;
    } else {
      data.forEach((r, idx) => {
        const whObj = warehouses.find(w => w.id === r.warehouse);
        const areaName = whObj ? whObj.area : 'Area Logistik';
        const dateFormatted = new Date(r.timestamp).toLocaleString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        html += `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td>${dateFormatted} WIB</td>
            <td style="text-align: center; font-weight: bold;">Gudang ${r.warehouse}</td>
            <td>${areaName}</td>
            <td>${r.cleanerName}<br/><span style="color: #64748b; font-size: 8pt;">${r.cleanerEmail}</span></td>
            <td>${r.description}</td>
            <td style="text-align: center; vertical-align: middle;">
              <img src="${r.photoBefore}" style="width: 100px; height: 70px; object-fit: cover;" />
            </td>
            <td style="text-align: center; vertical-align: middle;">
              <img src="${r.photoAfter}" style="width: 100px; height: 70px; object-fit: cover;" />
            </td>
            <td>${r.feedback || '-'}</td>
          </tr>
        `;
      });
    }

    html += `
          </tbody>
        </table>

        ${includeSignatures ? `
        <table class="footer-section" style="width: 100%; border: none; margin-top: 50px;">
          <tr style="border: none;">
            <td style="width: 33%; border: none; text-align: center;">
              Disiapkan Oleh,<br/>
              <strong>Tim Petugas Kebersihan</strong><br/><br/><br/><br/>
              ( .................................... )
            </td>
            <td style="width: 34%; border: none; text-align: center;">
              Diverifikasi Oleh,<br/>
              <strong>Kepala Gudang</strong><br/><br/><br/><br/>
              <strong>${currentUser.name}</strong><br/>
              NIP. GC-309102-K
            </td>
            <td style="width: 33%; border: none; text-align: center;">
              Disetujui Untuk Audit,<br/>
              <strong>Auditor Eksternal</strong><br/><br/><br/><br/>
              <strong>${auditorName}</strong><br/>
              ${companyName}
            </td>
          </tr>
        </table>
        ` : ''}
      </body>
      </html>
    `;

    // Download flow
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${docNumber}_Log_Book_Kebersihan.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. GENERATE WORD (Styled HTML-to-Word .doc document format)
  const handleExportWord = () => {
    const data = filteredExportData;
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const periodText = exportPeriod === 'ALL' ? 'Semua Periode' : 
                       exportPeriod === 'TODAY' ? 'Hari Ini' : 
                       exportPeriod === 'WEEK' ? '7 Hari Terakhir' : '30 Hari Terakhir';
    const warehouseText = exportWarehouse === 'ALL' ? 'Semua Gudang (A-L)' : `Gudang ${exportWarehouse}`;

    let html = `
      <html xmlns:o="urn:schemas-microsoft-word:office:office" xmlns:w="urn:schemas-microsoft-word:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4 portrait;
            margin: 1.0in 1.0in 1.0in 1.0in;
          }
          body { font-family: 'Georgia', 'Times New Roman', serif; line-height: 1.6; color: #1e293b; }
          
          .cop-surat { text-align: center; border-bottom: 3px double #10b981; padding-bottom: 12px; margin-bottom: 25px; }
          .cop-company { font-family: 'Arial', sans-serif; font-size: 16pt; font-weight: bold; color: #049669; letter-spacing: 1px; }
          .cop-sub { font-family: 'Arial', sans-serif; font-size: 9pt; color: #475569; margin-top: 2px; }
          
          .doc-title { text-align: center; font-size: 15pt; font-weight: bold; font-family: 'Arial', sans-serif; margin-bottom: 5px; color: #0f172a; text-transform: uppercase; }
          .doc-subtitle { text-align: center; font-size: 10pt; font-style: italic; color: #475569; margin-bottom: 25px; }
          
          .meta-box { border: 1px solid #cbd5e1; width: 100%; margin-bottom: 20px; font-size: 9.5pt; font-family: 'Arial', sans-serif; }
          .meta-box td { padding: 6px; border: 1px solid #e2e8f0; }
          .meta-hdr { background-color: #f8fafc; font-weight: bold; width: 140px; }
          
          h2 { font-size: 12pt; font-family: 'Arial', sans-serif; color: #0f172a; border-left: 4px solid #10b981; padding-left: 8px; margin-top: 20px; margin-bottom: 10px; }
          
          .item-table { border-collapse: collapse; width: 100%; margin-top: 10px; margin-bottom: 25px; }
          .item-table th { background-color: #f1f5f9; border: 1px solid #94a3b8; padding: 7px; font-size: 9pt; font-family: 'Arial', sans-serif; font-weight: bold; text-align: left; }
          .item-table td { border: 1px solid #cbd5e1; padding: 7px; font-size: 9pt; vertical-align: top; }
          
          .item-detail-block { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 20px; background-color: #fcfcfc; }
          .img-placeholder { border: 1px solid #e2e8f0; background-color: #f8fafc; text-align: center; padding: 8px; font-size: 8pt; color: #64748b; font-family: 'Arial', sans-serif; }
          
          .status-tag { font-family: 'Arial', sans-serif; font-size: 8pt; font-weight: bold; padding: 2px 6px; border-radius: 4px; display: inline-block; text-transform: uppercase; }
          .status-approved { background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
          .status-pending { background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
          .status-rejected { background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
          
          .signature-table { width: 100%; margin-top: 40px; font-size: 9.5pt; font-family: 'Arial', sans-serif; }
          .signature-table td { text-align: center; padding: 10px; width: 33%; vertical-align: top; }
        </style>
      </head>
      <body>
        <!-- Kop Surat -->
        <div class="cop-surat">
          <div class="cop-company">GUDANGCLEAN MANAGEMENT SYSTEM</div>
          <div class="cop-sub">Layanan Pemeliharaan Kebersihan & Standardisasi Mutu Gudang Logistik Terpadu</div>
          <div class="cop-sub" style="font-style: italic;">Situs Operasional: Gudang A sampai Gudang L | Telp: (021) 8092-1029 | Email: audit@gudangclean.com</div>
        </div>

        <div class="doc-title">Berita Acara &amp; Logbook Kebersihan Gudang</div>
        <div class="doc-subtitle">Sesuai Dokumen Penjaminan Mutu GudangClean</div>

        <table class="meta-box" cellspacing="0">
          <tr>
            <td class="meta-hdr">No. Dokumen Audit</td>
            <td>${docNumber}</td>
            <td class="meta-hdr">Tanggal Penerbitan</td>
            <td>${dateStr}</td>
          </tr>
          <tr>
            <td class="meta-hdr">Instansi / Perusahaan</td>
            <td>${companyName}</td>
            <td class="meta-hdr">Kepala Gudang</td>
            <td>${currentUser.name}</td>
          </tr>
          <tr>
            <td class="meta-hdr">Auditor Eksternal</td>
            <td>${auditorName}</td>
            <td class="meta-hdr">Rentang Filter</td>
            <td>${warehouseText} (${periodText})</td>
          </tr>
        </table>

        <h2>I. Ringkasan Kelaikan Kebersihan Area</h2>
        <p style="font-size: 10pt; margin-bottom: 15px;">
          Berdasarkan hasil log book pemeliharaan harian yang diverifikasi oleh Kepala Gudang, persentase kebersihan dari total 12 gudang (A s/d L) berada pada level 
          <strong>${Math.round((warehouses.filter(w => w.status === 'BERSIH').length / warehouses.length) * 100)}% Lolos Standar Bersih</strong>. 
          Rincian status fisik masing-masing area adalah: 
          <strong>${warehouses.filter(w => w.status === 'BERSIH').length} Gudang (Bersih)</strong>, 
          <strong>${warehouses.filter(w => w.status === 'DALAM_PENGERJAAN').length} Gudang (Pengerjaan)</strong>, dan 
          <strong>${warehouses.filter(w => w.status === 'KOTOR').length} Gudang (Kotor)</strong>.
        </p>

        <h2>II. Riwayat Log Book Harian</h2>
        <table class="item-table">
          <thead>
            <tr>
              <th style="width: 5%;">No</th>
              <th style="width: 15%;">Tanggal/Waktu</th>
              <th style="width: 10%;">Gudang</th>
              <th style="width: 20%;">Petugas Pelaksana</th>
              <th style="width: 20%;">Deskripsi Tugas</th>
              <th style="width: 15%; text-align: center;">Lampiran Sebelum</th>
              <th style="width: 15%; text-align: center;">Lampiran Sesudah</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (data.length === 0) {
      html += `
        <tr>
          <td colspan="7" style="text-align: center; color: #64748b; font-style: italic; padding: 20px;">
            Tidak ditemukan riwayat pengerjaan kebersihan dalam periode ini.
          </td>
        </tr>
      `;
    } else {
      data.forEach((r, idx) => {
        const dateFormatted = new Date(r.timestamp).toLocaleString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        html += `
          <tr>
            <td style="text-align: center; vertical-align: middle;">${idx + 1}</td>
            <td style="vertical-align: middle;">${dateFormatted} WIB</td>
            <td style="font-weight: bold; text-align: center; vertical-align: middle;">Gudang ${r.warehouse}</td>
            <td style="vertical-align: middle;"><strong>${r.cleanerName}</strong><br/><span style="color:#555;font-size:8pt;">${r.cleanerEmail}</span></td>
            <td style="vertical-align: middle;">${r.description}</td>
            <td style="text-align: center; vertical-align: middle; padding: 4px;">
              <img src="${r.photoBefore}" style="width: 100px; height: 70px; object-fit: cover;" />
            </td>
            <td style="text-align: center; vertical-align: middle; padding: 4px;">
              <img src="${r.photoAfter}" style="width: 100px; height: 70px; object-fit: cover;" />
            </td>
          </tr>
        `;
      });
    }

    html += `
          </tbody>
        </table>
    `;

    // Include detailed reports with images if requested
    if (includePhotos && data.length > 0) {
      html += `
        <div style="page-break-before: always; margin-top: 30px;">
          <h2 style="font-size: 14pt; font-family: 'Arial', sans-serif; font-weight: bold; color: #0f172a; border-bottom: 2px solid #10b981; padding-bottom: 8px; text-transform: uppercase;">
            LAMPIRAN RINCIAN DOKUMENTASI LAPORAN
          </h2>
          <p style="font-size: 9.5pt; font-family: 'Arial', sans-serif; color: #475569; margin-top: 5px; margin-bottom: 25px;">
            Berikut adalah rekaman audit kebersihan harian yang diisi oleh petugas dan diverifikasi oleh Kepala Gudang.
          </p>
      `;
      
      data.forEach((r, idx) => {
        let statusBadge = r.status === 'APPROVED' 
          ? '<span style="background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; font-weight: bold; font-size: 8pt; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">DISETUJUI / BERSIH</span>' 
          : r.status === 'REJECTED'
          ? '<span style="background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; font-weight: bold; font-size: 8pt; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">DITOLAK / REVISI</span>'
          : '<span style="background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a; font-weight: bold; font-size: 8pt; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">MENUNGGU VERIFIKASI</span>';

        html += `
          <div style="margin-bottom: 30px; page-break-inside: avoid; border: 1px solid #cbd5e1; padding: 15px; border-radius: 8px; background-color: #fcfcfc;">
            <!-- Card Header -->
            <table style="width: 100%; border: none; margin-bottom: 15px; background-color: #f1f5f9; padding: 8px 12px; border-radius: 4px;">
              <tr style="border: none;">
                <td style="border: none; font-weight: bold; font-size: 11pt; color: #0f172a; font-family: 'Arial', sans-serif;">
                  ${idx + 1}. Laporan Kebersihan Gudang ${r.warehouse}
                </td>
                <td style="border: none; text-align: right; font-family: 'Courier New', monospace; font-size: 8.5pt; color: #64748b;">
                  ID: ${r.id}
                </td>
              </tr>
            </table>

            <!-- Metadata Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9.5pt; font-family: 'Arial', sans-serif;">
              <tr style="border: none;">
                <td style="width: 150px; font-weight: bold; color: #475569; padding: 4px 0; border: none; vertical-align: top;">Nama Petugas:</td>
                <td style="color: #1e293b; padding: 4px 0; border: none; vertical-align: top;">
                  ${r.cleanerName} <span style="color: #64748b; font-weight: normal;">(${r.cleanerEmail})</span>
                </td>
              </tr>
              <tr style="border: none;">
                <td style="font-weight: bold; color: #475569; padding: 4px 0; border: none; vertical-align: top;">Tanggal Kirim:</td>
                <td style="color: #1e293b; padding: 4px 0; border: none; vertical-align: top;">
                  ${formatIndonesianDateTime(r.timestamp)}
                </td>
              </tr>
              <tr style="border: none;">
                <td style="font-weight: bold; color: #475569; padding: 4px 0; border: none; vertical-align: top;">Status Laporan:</td>
                <td style="padding: 4px 0; border: none; vertical-align: top;">
                  ${statusBadge}
                </td>
              </tr>
              <tr style="border: none;">
                <td style="font-weight: bold; color: #475569; padding: 4px 0; border: none; vertical-align: top;">Keterangan:</td>
                <td style="color: #1e293b; padding: 4px 0; border: none; vertical-align: top; font-style: italic;">
                  ${r.description || '-'}
                </td>
              </tr>
              <tr style="border: none;">
                <td style="font-weight: bold; color: #475569; padding: 4px 0; border: none; vertical-align: top;">Catatan Kepala:</td>
                <td style="color: #1e293b; padding: 4px 0; border: none; vertical-align: top;">
                  ${r.feedback || '-'}
                </td>
              </tr>
            </table>

            <!-- Images Side-by-Side -->
            <table style="width: 100%; border: none;">
              <tr style="border: none;">
                <td style="width: 50%; border: none; padding-right: 8px; text-align: center;">
                  <div style="font-size: 9pt; font-weight: bold; color: #ef4444; margin-bottom: 5px; font-family: 'Arial', sans-serif;">SEBELUM (KOTOR)</div>
                  <div style="border: 1px solid #fca5a5; border-radius: 6px; padding: 5px; background-color: #ffffff;">
                    <img src="${r.photoBefore}" style="width: 100%; max-height: 160px; object-fit: cover;" />
                  </div>
                </td>
                <td style="width: 50%; border: none; padding-left: 8px; text-align: center;">
                  <div style="font-size: 9pt; font-weight: bold; color: #10b981; margin-bottom: 5px; font-family: 'Arial', sans-serif;">SESUDAH (BERSIH)</div>
                  <div style="border: 1px solid #6ee7b7; border-radius: 6px; padding: 5px; background-color: #ffffff;">
                    <img src="${r.photoAfter}" style="width: 100%; max-height: 160px; object-fit: cover;" />
                  </div>
                </td>
              </tr>
            </table>
          </div>
        `;
      });
      html += `</div>`;
    }

    // Signatures
    if (includeSignatures) {
      html += `
        <table class="signature-table" cellspacing="0" style="page-break-inside: avoid;">
          <tr>
            <td>
              Dibuat Oleh,<br/>
              <strong>Tim Pelaksana Lapangan</strong><br/><br/><br/><br/>
              ( ........................................... )<br/>
              Staf Kebersihan Gudang
            </td>
            <td>
              Disetujui Oleh Kepala Gudang,<br/>
              <strong>GudangClean Management</strong><br/><br/><br/><br/>
              <strong>${currentUser.name}</strong><br/>
              NIP. GC-309102-K
            </td>
            <td>
              Diverifikasi Untuk Laporan Audit,<br/>
              <strong>Auditor Independen</strong><br/><br/><br/><br/>
              <strong>${auditorName}</strong><br/>
              ${companyName}
            </td>
          </tr>
        </table>
      `;
    }

    html += `
      </body>
      </html>
    `;

    // Download file
    const blob = new Blob([html], { type: 'application/msword;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${docNumber}_Log_Book_Audit.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 3. GENERATE PDF (Beautiful Printable Web Page Document layout)
  const handlePrintPDF = () => {
    const data = filteredExportData;
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Gagal membuka jendela cetak. Pastikan pop-up blocker browser Anda dinonaktifkan.');
      return;
    }

    const periodText = exportPeriod === 'ALL' ? 'Semua Periode' : 
                       exportPeriod === 'TODAY' ? 'Hari Ini' : 
                       exportPeriod === 'WEEK' ? '7 Hari Terakhir' : '30 Hari Terakhir';
    const warehouseText = exportWarehouse === 'ALL' ? 'Semua Gudang (A-L)' : `Gudang ${exportWarehouse}`;

    const cleanCount = warehouses.filter(w => w.status === 'BERSIH').length;
    const inProgressCount = warehouses.filter(w => w.status === 'DALAM_PENGERJAAN').length;
    const dirtyCount = warehouses.filter(w => w.status === 'KOTOR').length;
    const cleanPercentage = Math.round((cleanCount / warehouses.length) * 100);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>LOG BOOK GUDANGCLEAN - AUDIT REPORT</title>
        <meta charset="utf-8" />
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
          
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 20mm 15mm;
          }
          
          body {
            font-family: 'Inter', sans-serif;
            color: #0f172a;
            line-height: 1.5;
            background-color: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 10pt;
          }

          /* Header / Kop */
          .cop-container {
            display: flex;
            align-items: center;
            border-bottom: 3px double #10b981;
            padding-bottom: 12px;
            margin-bottom: 25px;
          }
          
          .logo-box {
            width: 48px;
            height: 48px;
            background-color: #10b981;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 18pt;
            font-weight: 800;
            margin-right: 15px;
          }
          
          .cop-text {
            flex-grow: 1;
          }
          
          .company-name {
            font-size: 16pt;
            font-weight: 800;
            color: #049669;
            letter-spacing: -0.5px;
          }
          
          .company-tagline {
            font-size: 8pt;
            color: #475569;
            font-weight: 500;
          }

          .doc-number-badge {
            font-size: 8.5pt;
            font-weight: 700;
            color: #1e293b;
            background-color: #f1f5f9;
            padding: 4px 10px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            text-align: right;
          }

          /* Main Document Title */
          .doc-title-section {
            text-align: center;
            margin-bottom: 25px;
          }
          
          .doc-title {
            font-size: 15pt;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: -0.5px;
          }
          
          .doc-subtitle {
            font-size: 9pt;
            color: #64748b;
            margin-top: 4px;
            font-weight: 500;
          }

          /* Metadata Block */
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 25px;
          }
          
          .meta-card {
            border: 1px solid #e2e8f0;
            background-color: #f8fafc;
            border-radius: 10px;
            padding: 12px 15px;
          }
          
          .meta-title {
            font-size: 8pt;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
          }
          
          .meta-item {
            display: flex;
            justify-content: space-between;
            font-size: 8.5pt;
            padding: 3px 0;
          }
          
          .meta-label {
            color: #64748b;
            font-weight: 500;
          }
          
          .meta-value {
            color: #1e293b;
            font-weight: 600;
          }

          /* Stat Metrics Row */
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 25px;
          }
          
          .metric-card {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 10px 12px;
            text-align: center;
          }
          
          .metric-val {
            font-size: 14pt;
            font-weight: 800;
          }
          
          .metric-card.success { border-color: #a7f3d0; background-color: #f0fdf4; color: #15803d; }
          .metric-card.warning { border-color: #fde68a; background-color: #fffbeb; color: #b45309; }
          .metric-card.danger { border-color: #fecaca; background-color: #fef2f2; color: #b91c1c; }
          .metric-card.neutral { border-color: #cbd5e1; background-color: #f8fafc; color: #475569; }
          
          .metric-lbl {
            font-size: 7.5pt;
            font-weight: 600;
            text-transform: uppercase;
            color: #64748b;
            margin-top: 3px;
          }

          h2 {
            font-size: 11pt;
            font-weight: 700;
            color: #0f172a;
            border-left: 4px solid #10b981;
            padding-left: 8px;
            margin-top: 25px;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: -0.2px;
          }

          /* Main Table */
          .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5pt;
            margin-bottom: 30px;
          }
          
          .data-table th {
            background-color: #f1f5f9;
            color: #475569;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 7.5pt;
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            text-align: left;
            letter-spacing: 0.3px;
          }
          
          .data-table td {
            border: 1px solid #e2e8f0;
            padding: 8px 10px;
            vertical-align: top;
          }
          
          .data-table tr:nth-child(even) {
            background-color: #f8fafc;
          }
          
          /* Badges */
          .badge {
            font-size: 7pt;
            font-weight: 700;
            text-transform: uppercase;
            padding: 2px 6px;
            border-radius: 4px;
            display: inline-block;
          }
          
          .badge-approved { background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
          .badge-pending { background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
          .badge-rejected { background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

          /* Photo Proof Elements */
          .photo-section {
            page-break-before: auto;
          }
          
          .photo-item-card {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 12px;
            margin-bottom: 15px;
            background-color: #ffffff;
            page-break-inside: avoid;
          }
          
          .photo-item-header {
            display: flex;
            justify-content: space-between;
            font-size: 8.5pt;
            font-weight: 600;
            color: #334155;
            margin-bottom: 8px;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 5px;
          }
          
          .photo-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          
          .photo-container {
            border: 1.5px solid #cbd5e1;
            border-radius: 8px;
            overflow: hidden;
            text-align: center;
            background-color: #f8fafc;
          }
          
          .photo-container.before { border-color: #fca5a5; }
          .photo-container.after { border-color: #6ee7b7; }
          
          .photo-img {
            width: 100%;
            height: 125px;
            object-fit: cover;
            display: block;
          }
          
          .photo-lbl {
            font-size: 7.5pt;
            font-weight: 700;
            padding: 4px;
            text-transform: uppercase;
          }
          
          .photo-container.before .photo-lbl { background-color: #fef2f2; color: #b91c1c; }
          .photo-container.after .photo-lbl { background-color: #f0fdf4; color: #15803d; }

          /* Signatures */
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            page-break-inside: avoid;
          }
          
          .signature-box {
            text-align: center;
            width: 30%;
            font-size: 8.5pt;
          }
          
          .signature-title {
            color: #64748b;
            font-weight: 500;
            margin-bottom: 45px;
          }
          
          .signature-name {
            font-weight: 700;
            color: #1e293b;
            text-decoration: underline;
          }
          
          .signature-sub {
            font-size: 7.5pt;
            color: #64748b;
            margin-top: 2px;
          }

          /* Print helpers */
          @media print {
            .no-print { display: none; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <!-- Header / Kop -->
        <div class="cop-container">
          <div class="logo-box">GC</div>
          <div class="cop-text">
            <div class="company-name">GUDANGCLEAN SYSTEM</div>
            <div class="company-tagline">Integrated Logistical Maintenance & Hygiene Quality Standardisation</div>
          </div>
          <div class="doc-number-badge">
            <div style="font-size: 7.5pt; color: #64748b; font-weight: 500;">No. Dokumen Audit</div>
            <div>${docNumber}</div>
          </div>
        </div>

        <!-- Title -->
        <div class="doc-title-section">
          <div class="doc-title">Log Book Pemeliharaan Kebersihan Gudang</div>
          <div class="doc-subtitle">Laporan Verifikasi dan Kelaikan Kebersihan Area Gudang A s/d Gudang L</div>
        </div>

        <!-- Metrics Row -->
        <div class="metrics-grid">
          <div class="metric-card success">
            <div class="metric-val">${cleanPercentage}%</div>
            <div class="metric-lbl">Lolos Standar</div>
          </div>
          <div class="metric-card neutral">
            <div class="metric-val">${cleanCount}</div>
            <div class="metric-lbl">Gudang Bersih</div>
          </div>
          <div class="metric-card warning">
            <div class="metric-val">${inProgressCount}</div>
            <div class="metric-lbl">Proses Rapi</div>
          </div>
          <div class="metric-card danger">
            <div class="metric-val">${dirtyCount}</div>
            <div class="metric-lbl">Butuh Tindakan</div>
          </div>
        </div>

        <h2>I. Riwayat Log Book Harian</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 4%; text-align: center;">No</th>
              <th style="width: 14%;">Tanggal & Waktu</th>
              <th style="width: 8%; text-align: center;">Gudang</th>
              <th style="width: 16%;">Pelaksana Kerja</th>
              <th style="width: 22%;">Keterangan & Spesifikasi Tugas</th>
              <th style="width: 18%; text-align: center;">Lampiran Sebelum</th>
              <th style="width: 18%; text-align: center;">Lampiran Sesudah</th>
            </tr>
          </thead>
          <tbody>
      `);

    if (data.length === 0) {
      printWindow.document.write(`
        <tr>
          <td colspan="7" style="text-align: center; color: #64748b; font-style: italic; padding: 25px;">
            Tidak ditemukan riwayat logbook kebersihan yang sesuai filter untuk periode cetak.
          </td>
        </tr>
      `);
    } else {
      data.forEach((r, idx) => {
        const whObj = warehouses.find(w => w.id === r.warehouse);
        const areaName = whObj ? whObj.area : 'Penyimpanan Utama';
        const dateFormatted = new Date(r.timestamp).toLocaleString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        printWindow.document.write(`
          <tr>
            <td style="text-align: center; vertical-align: middle;">${idx + 1}</td>
            <td style="vertical-align: middle;">${dateFormatted} WIB</td>
            <td style="font-weight: 700; text-align: center; vertical-align: middle;">Gudang ${r.warehouse}</td>
            <td style="vertical-align: middle;">
              <div style="font-weight: 600; color: #1e293b;">${r.cleanerName}</div>
              <div style="font-size: 7.5pt; color: #64748b;">${r.cleanerEmail}</div>
            </td>
            <td style="vertical-align: middle;">
              <div style="font-weight: 500; color: #334155;">${r.description}</div>
              <div style="font-size: 7.5pt; color: #64748b; font-style: italic; margin-top: 3px;">Area: ${areaName}</div>
              ${r.feedback ? `<div style="font-size: 7.5pt; color: #059669; margin-top: 4px; padding-left: 6px; border-left: 2px solid #10b981;">Catatan: "${r.feedback}"</div>` : ''}
            </td>
            <td style="text-align: center; vertical-align: middle; padding: 4px;">
              <img src="${r.photoBefore}" style="width: 100%; max-height: 70px; object-fit: cover; border-radius: 4px; border: 1px solid #fca5a5; display: block; margin: 0 auto;" />
            </td>
            <td style="text-align: center; vertical-align: middle; padding: 4px;">
              <img src="${r.photoAfter}" style="width: 100%; max-height: 70px; object-fit: cover; border-radius: 4px; border: 1px solid #6ee7b7; display: block; margin: 0 auto;" />
            </td>
          </tr>
        `);
      });
    }

    printWindow.document.write(`
          </tbody>
        </table>
    `);

    // Include detailed photos section if active
    if (includePhotos && data.length > 0) {
      printWindow.document.write(`
        <div class="photo-section" style="page-break-before: always; margin-top: 30px;">
          <h2 style="font-size: 14pt; font-weight: 800; color: #0f172a; border-left: none; padding-left: 0; margin-bottom: 5px; text-transform: uppercase; letter-spacing: -0.3px; border-bottom: 2px solid #10b981; padding-bottom: 8px;">
            LAMPIRAN RINCIAN DOKUMENTASI LAPORAN
          </h2>
          <p style="font-size: 9pt; color: #475569; margin-top: 8px; margin-bottom: 25px;">
            Berikut adalah rekaman audit kebersihan harian yang diisi oleh petugas dan diverifikasi oleh Kepala Gudang.
          </p>
      `);

      data.forEach((r, idx) => {
        printWindow.document.write(`
          <div class="photo-item-card" style="margin-bottom: 30px; page-break-inside: avoid;">
            <!-- Card Header gray background -->
            <div style="background-color: #f8fafc; border-radius: 6px; padding: 10px 15px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border: 1px solid #f1f5f9;">
              <span style="font-size: 11pt; font-weight: 800; color: #0f172a;">${idx + 1}. Laporan Kebersihan Gudang ${r.warehouse}</span>
              <span style="font-size: 8.5pt; font-family: monospace; color: #94a3b8; font-weight: 600;">ID: ${r.id}</span>
            </div>

            <!-- Metadata Grid -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9.5pt;">
              <tr style="border: none;">
                <td style="width: 150px; font-weight: 700; color: #475569; padding: 4px 0; border: none; vertical-align: top;">Nama Petugas:</td>
                <td style="color: #1e293b; padding: 4px 0; border: none; vertical-align: top;">
                  ${r.cleanerName} <span style="color: #64748b; font-weight: normal;">(${r.cleanerEmail})</span>
                </td>
              </tr>
              <tr style="border: none;">
                <td style="font-weight: 700; color: #475569; padding: 4px 0; border: none; vertical-align: top;">Tanggal Kirim:</td>
                <td style="color: #1e293b; padding: 4px 0; border: none; vertical-align: top;">
                  ${formatIndonesianDateTime(r.timestamp)}
                </td>
              </tr>
              <tr style="border: none;">
                <td style="font-weight: 700; color: #475569; padding: 4px 0; border: none; vertical-align: top;">Status Laporan:</td>
                <td style="padding: 4px 0; border: none; vertical-align: top;">
                  ${r.status === 'APPROVED' 
                    ? '<span style="background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; font-weight: 700; font-size: 8pt; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">DISETUJUI / BERSIH</span>' 
                    : r.status === 'REJECTED'
                    ? '<span style="background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; font-weight: 700; font-size: 8pt; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">DITOLAK / REVISI</span>'
                    : '<span style="background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a; font-weight: 700; font-size: 8pt; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">MENUNGGU VERIFIKASI</span>'
                  }
                </td>
              </tr>
              <tr style="border: none;">
                <td style="font-weight: 700; color: #475569; padding: 4px 0; border: none; vertical-align: top;">Keterangan:</td>
                <td style="color: #1e293b; padding: 4px 0; border: none; vertical-align: top; font-style: italic;">
                  ${r.description || '-'}
                </td>
              </tr>
              <tr style="border: none;">
                <td style="font-weight: 700; color: #475569; padding: 4px 0; border: none; vertical-align: top;">Catatan Kepala:</td>
                <td style="color: #1e293b; padding: 4px 0; border: none; vertical-align: top;">
                  ${r.feedback || '-'}
                </td>
              </tr>
            </table>

            <!-- Side-by-Side Images -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px;">
              <!-- Sebelum (Kotor) -->
              <div style="text-align: center;">
                <div style="font-size: 9pt; font-weight: 800; color: #ef4444; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">SEBELUM (KOTOR)</div>
                <div style="border: 1px solid #fca5a5; border-radius: 6px; overflow: hidden; background-color: #f8fafc; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                  <img src="${r.photoBefore}" style="width: 100%; height: 180px; object-fit: cover; display: block;" />
                </div>
              </div>
              
              <!-- Sesudah (Bersih) -->
              <div style="text-align: center;">
                <div style="font-size: 9pt; font-weight: 800; color: #10b981; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">SESUDAH (BERSIH)</div>
                <div style="border: 1px solid #6ee7b7; border-radius: 6px; overflow: hidden; background-color: #f8fafc; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                  <img src="${r.photoAfter}" style="width: 100%; height: 180px; object-fit: cover; display: block;" />
                </div>
              </div>
            </div>
          </div>
        `);
      });

      printWindow.document.write(`</div>`);
    }

    // Signatures
    if (includeSignatures) {
      printWindow.document.write(`
        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-title">Disiapkan &amp; Dilaporkan,</div>
            <div style="height: 40px;"></div>
            <div class="signature-name">Tim Pelaksana Lapangan</div>
            <div class="signature-sub">GudangClean Cleaning Crew</div>
          </div>
          <div class="signature-box">
            <div class="signature-title">Diverifikasi &amp; Disahkan,</div>
            <div style="height: 40px;"></div>
            <div class="signature-name">${currentUser.name}</div>
            <div class="signature-sub">Kepala Gudang Terdaftar</div>
          </div>
          <div class="signature-box">
            <div class="signature-title">Disetujui Penilaian Mutu,</div>
            <div style="height: 40px;"></div>
            <div class="signature-name">${auditorName}</div>
            <div class="signature-sub">${companyName}</div>
          </div>
        </div>
      `);
    }

    printWindow.document.write(`
        <div style="text-align: center; color: #94a3b8; font-size: 7.5pt; margin-top: 50px; font-family: sans-serif; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          Dokumen ini diterbitkan secara elektronik oleh Sistem Informasi Bersih Area (GudangClean SIBA) dan sah digunakan untuk keperluan audit mutu internal & eksternal.
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    
    // Auto trigger print after images load
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      // Keep it open for a bit so they can save or look, then they can close manually
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-3xl bg-[#0f1016] border border-zinc-800/80 rounded-2xl shadow-2xl z-10 flex flex-col max-h-[92vh] overflow-hidden font-sans"
        id="export-reports-modal-body"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-900 bg-zinc-950/40">
          <div className="flex items-center space-x-3 text-emerald-400">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base font-display tracking-tight flex items-center space-x-2">
                <span>Unduh Laporan PDF saja</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
                  LAPORAN AUDIT
                </span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Konfigurasi ekspor logbook pemeliharaan gudang terformat rapi dalam format PDF untuk keperluan audit operasional.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 max-h-[60vh] scrollbar-thin scrollbar-thumb-zinc-800">
          
          {/* Section 1: Filters & Scope */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center space-x-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>1. Atur Cakupan & Filter Laporan</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-zinc-950/40 rounded-xl border border-zinc-900/60">
              {/* Select Warehouse Scope */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  Cakupan Gudang
                </label>
                <select
                  value={exportWarehouse}
                  onChange={(e) => setExportWarehouse(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-900 hover:border-zinc-850 focus:border-emerald-500 rounded-lg text-xs text-zinc-200 outline-none cursor-pointer transition-colors"
                >
                  <option value="ALL">Semua Gudang (A - L)</option>
                  {alphabetList.map((code) => (
                    <option key={code} value={code}>Gudang {code}</option>
                  ))}
                </select>
              </div>

              {/* Select Status Scope */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  Status Verifikasi
                </label>
                <select
                  value={exportStatus}
                  onChange={(e) => setExportStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-900 hover:border-zinc-850 focus:border-emerald-500 rounded-lg text-xs text-zinc-200 outline-none cursor-pointer transition-colors"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="APPROVED">Disetujui Saja (Lolos Audit)</option>
                  <option value="PENDING">Menunggu Verifikasi</option>
                  <option value="REJECTED">Ditolak / Minta Revisi</option>
                </select>
              </div>

              {/* Select Period Scope */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  Rentang Waktu
                </label>
                <select
                  value={exportPeriod}
                  onChange={(e) => setExportPeriod(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-900 hover:border-zinc-850 focus:border-emerald-500 rounded-lg text-xs text-zinc-200 outline-none cursor-pointer transition-colors"
                >
                  <option value="ALL">Semua Log Riwayat</option>
                  <option value="TODAY">Hari Ini Saja</option>
                  <option value="WEEK">7 Hari Terakhir</option>
                  <option value="MONTH">30 Hari Terakhir</option>
                </select>
              </div>
            </div>
          </div>

          {/* Statistics Check */}
          <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2.5 text-zinc-300">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
              <span>
                Menyiapkan ekspor sebanyak <strong className="text-white font-mono">{filteredExportData.length} baris laporan</strong> kebersihan.
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 font-medium">Ready for Audit</span>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-zinc-900 bg-zinc-950/40 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center space-x-1 text-[10px] text-zinc-500">
            <Info className="w-3.5 h-3.5 text-zinc-600" />
            <span>Format ini telah lolos standarisasi laporan audit mutu industri.</span>
          </div>

          <div className="flex items-center space-x-2.5 self-stretch sm:self-auto">
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer border border-zinc-800/60"
            >
              Batal
            </button>

            {/* PDF PRINT / EXPORT BUTTON */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handlePrintPDF}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer border-none shadow-md shadow-emerald-500/10"
              title="Unduh Laporan / Simpan PDF"
              id="btn-download-pdf-only"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>Unduh Laporan (PDF)</span>
            </motion.button>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
