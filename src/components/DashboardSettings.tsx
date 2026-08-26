import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Settings,
  Building,
  ShieldCheck,
  Clock,
  Database,
  Save,
  RotateCcw,
  Download,
  Upload,
  Check,
  AlertTriangle,
  Info,
  Layers,
  FileText,
  Mail,
  Phone,
  UserCheck,
  Sparkles,
  MapPin,
  Edit2,
  PenTool,
  Trash2,
  FileCheck2,
  User
} from 'lucide-react';
import { SystemSettings, Warehouse, User as UserType, Report, Task, Attendance } from '../types';
import SignaturePadModal from './SignaturePadModal';

interface DashboardSettingsProps {
  systemSettings: SystemSettings;
  warehouses: Warehouse[];
  users: UserType[];
  reports: Report[];
  tasks: Task[];
  attendanceList: Attendance[];
  onSaveSettings: (settings: SystemSettings) => Promise<void>;
  onUpdateWarehouseArea: (id: string, newArea: string) => Promise<void>;
  onResetDatabase: () => void;
  onImportDatabase?: (data: {
    warehouses?: Warehouse[];
    users?: UserType[];
    reports?: Report[];
    tasks?: Task[];
    attendance?: Attendance[];
    systemSettings?: SystemSettings;
  }) => Promise<void>;
}

export default function DashboardSettings({
  systemSettings,
  warehouses,
  users,
  reports,
  tasks,
  attendanceList,
  onSaveSettings,
  onUpdateWarehouseArea,
  onResetDatabase,
  onImportDatabase
}: DashboardSettingsProps) {
  const [formData, setFormData] = useState<SystemSettings>(systemSettings);
  const [warehouseAreas, setWarehouseAreas] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    warehouses.forEach(w => {
      map[w.id] = w.area || `Area Gudang ${w.id}`;
    });
    return map;
  });

  const [activeSection, setActiveSection] = useState<'IDENTITY' | 'SIGNATURES' | 'WAREHOUSES' | 'OPERATIONAL' | 'DATABASE'>('SIGNATURES');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [warehouseSaveSuccess, setWarehouseSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Signature Pad Modal State
  const [activeSignatureTarget, setActiveSignatureTarget] = useState<'cleaner' | 'kepala' | 'auditor' | null>(null);

  // Keep formData in sync if systemSettings changes externally
  React.useEffect(() => {
    setFormData(systemSettings);
  }, [systemSettings]);

  // Keep warehouse areas in sync
  React.useEffect(() => {
    const map: Record<string, string> = {};
    warehouses.forEach(w => {
      map[w.id] = w.area || `Area Gudang ${w.id}`;
    });
    setWarehouseAreas(map);
  }, [warehouses]);

  const handleChange = (field: keyof SystemSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveAllSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setErrorMessage('');
    try {
      await onSaveSettings(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setErrorMessage('Gagal menyimpan pengaturan ke database.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveWarehouseArea = async (warehouseId: string) => {
    const newArea = warehouseAreas[warehouseId];
    if (!newArea) return;
    try {
      await onUpdateWarehouseArea(warehouseId, newArea);
      setWarehouseSaveSuccess(warehouseId);
      setTimeout(() => setWarehouseSaveSuccess(null), 2500);
    } catch (err) {
      console.error(`Failed to update area for warehouse ${warehouseId}:`, err);
    }
  };

  // Export full database JSON backup
  const handleExportBackup = () => {
    const backupData = {
      backupTimestamp: new Date().toISOString(),
      appName: 'GudangClean Management System',
      systemSettings: formData,
      warehouses,
      users,
      reports,
      tasks,
      attendance: attendanceList
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `gudangclean_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON backup
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (onImportDatabase) {
          await onImportDatabase(parsed);
          alert('Data cadangan berhasil dipulihkan ke sistem!');
        } else {
          alert('Fitur pemulihan sedang disiapkan.');
        }
      } catch (err) {
        console.error('Error importing JSON backup:', err);
        alert('File JSON cadangan tidak valid atau rusak.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans" id="dashboard-settings-root">
      
      {/* Header Banner */}
      <div className="bg-[#0f1016] border border-zinc-800/80 rounded-2xl p-6 relative overflow-hidden shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-extrabold text-white tracking-tight font-display">
                  Pengaturan Sistem
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                  ADMIN KEPALA
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Kelola identitas instansi, kustomisasi master area gudang, jadwal shift kerja, dan pemeliharaan database.
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center space-x-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSaveAllSettings()}
              disabled={isSaving}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer border-none shadow-md shadow-emerald-500/10 disabled:opacity-50"
              id="btn-save-system-settings"
            >
              {isSaving ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Success Alert Notification */}
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-semibold flex items-center space-x-2"
          >
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Pengaturan sistem berhasil disimpan secara permanen ke database Firestore!</span>
          </motion.div>
        )}

        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-900 pb-3">
        <button
          onClick={() => setActiveSection('SIGNATURES')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSection === 'SIGNATURES'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 border border-zinc-900'
          }`}
          id="btn-tab-signatures"
        >
          <PenTool className="w-4 h-4" />
          <span>Lembar Pengesahan & TTD Audit</span>
        </button>

        <button
          onClick={() => setActiveSection('IDENTITY')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSection === 'IDENTITY'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 border border-zinc-900'
          }`}
          id="btn-tab-identity"
        >
          <Building className="w-4 h-4" />
          <span>Identitas & Instansi</span>
        </button>

        <button
          onClick={() => setActiveSection('WAREHOUSES')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSection === 'WAREHOUSES'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 border border-zinc-900'
          }`}
          id="btn-tab-warehouses"
        >
          <Layers className="w-4 h-4" />
          <span>Master Area Gudang (A-L)</span>
        </button>

        <button
          onClick={() => setActiveSection('OPERATIONAL')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSection === 'OPERATIONAL'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 border border-zinc-900'
          }`}
          id="btn-tab-operational"
        >
          <Clock className="w-4 h-4" />
          <span>Kebijakan & Shift Kerja</span>
        </button>

        <button
          onClick={() => setActiveSection('DATABASE')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSection === 'DATABASE'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 border border-zinc-900'
          }`}
          id="btn-tab-database"
        >
          <Database className="w-4 h-4" />
          <span>Database & Cadangan</span>
        </button>
      </div>

      {/* SECTION 0: LEMBAR PENGESAHAN & PENJAMIN MUTU AUDIT (TTD & NAMA) */}
      {activeSection === 'SIGNATURES' && (
        <div className="space-y-6">
          <div className="bg-[#0f1016] border border-zinc-800/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Kustomisasi Lembar Pengesahan & Tanda Tangan Audit
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Atur nama penandatangan, gelar, instansi, serta bubuhkan tanda tangan digital (TTD) untuk Staf Petugas, Kepala Gudang, dan Auditor Mutu.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg font-medium flex items-center space-x-1">
                <Check className="w-3.5 h-3.5" />
                <span>Otomatis Masuk di PDF</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. PETUGAS STAF GUDANG */}
            <div className="bg-[#0f1016] border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-zinc-700/80 transition-colors">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Petugas Staf Kebersihan</h4>
                      <p className="text-[10px] text-zinc-400">Pihak Pelaksana Pembersihan</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">DISIAPKAN</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                      Nama Petugas / Tim Staf
                    </label>
                    <input
                      type="text"
                      value={formData.cleanerSignerName ?? 'Budi Santoso & Tim Kebersihan'}
                      onChange={(e) => handleChange('cleanerSignerName', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none"
                      placeholder="Contoh: Budi Santoso & Tim Kebersihan"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                      Jabatan / Peran
                    </label>
                    <input
                      type="text"
                      value={formData.cleanerSignerTitle ?? 'Koordinator Pelaksana Bersih Area'}
                      onChange={(e) => handleChange('cleanerSignerTitle', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none"
                      placeholder="Contoh: Koordinator Pelaksana Bersih Area"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                      Divisi / Instansi
                    </label>
                    <input
                      type="text"
                      value={formData.cleanerSignerCompany ?? 'Divisi Fasilitas & Cleanliness'}
                      onChange={(e) => handleChange('cleanerSignerCompany', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none"
                      placeholder="Contoh: Divisi Fasilitas & Cleanliness"
                    />
                  </div>
                </div>

                {/* Signature Preview Box */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Tanda Tangan Digital (TTD)
                  </label>
                  <div className="relative bg-white rounded-xl border border-zinc-700 h-28 flex items-center justify-center p-2 overflow-hidden">
                    {formData.cleanerSignature ? (
                      <img
                        src={formData.cleanerSignature}
                        alt="TTD Petugas"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-zinc-400 space-y-1">
                        <PenTool className="w-5 h-5 mx-auto text-zinc-300" />
                        <span className="text-[11px] block font-medium">Belum ada TTD digital</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* TTD Buttons */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setActiveSignatureTarget('cleaner')}
                  className="flex-1 py-1.5 px-2 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 font-bold rounded-lg text-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Gores / Unggah TTD</span>
                </button>
                {formData.cleanerSignature && (
                  <button
                    type="button"
                    onClick={() => handleChange('cleanerSignature', '')}
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg transition-colors cursor-pointer"
                    title="Hapus Tanda Tangan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 2. KEPALA GUDANG */}
            <div className="bg-[#0f1016] border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-zinc-700/80 transition-colors">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Kepala Gudang & Fasilitas</h4>
                      <p className="text-[10px] text-zinc-400">Pihak Verifikator & Pengesah</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">DISAHKAN</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                      Nama Kepala Gudang & Gelar
                    </label>
                    <input
                      type="text"
                      value={formData.kepalaSignerName ?? 'Wahyu Andriansyah, S.T.'}
                      onChange={(e) => handleChange('kepalaSignerName', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none"
                      placeholder="Contoh: Wahyu Andriansyah, S.T."
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                      Jabatan
                    </label>
                    <input
                      type="text"
                      value={formData.kepalaSignerTitle ?? 'Kepala Gudang & Fasilitas Terdaftar'}
                      onChange={(e) => handleChange('kepalaSignerTitle', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none"
                      placeholder="Contoh: Kepala Gudang & Fasilitas Terdaftar"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                      Instansi / Perusahaan
                    </label>
                    <input
                      type="text"
                      value={formData.kepalaSignerCompany ?? formData.companyName}
                      onChange={(e) => handleChange('kepalaSignerCompany', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none"
                      placeholder="Contoh: PT Logistik Prima Nusantara"
                    />
                  </div>
                </div>

                {/* Signature Preview Box */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Tanda Tangan Digital (TTD)
                  </label>
                  <div className="relative bg-white rounded-xl border border-zinc-700 h-28 flex items-center justify-center p-2 overflow-hidden">
                    {formData.kepalaSignature ? (
                      <img
                        src={formData.kepalaSignature}
                        alt="TTD Kepala Gudang"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-zinc-400 space-y-1">
                        <PenTool className="w-5 h-5 mx-auto text-zinc-300" />
                        <span className="text-[11px] block font-medium">Belum ada TTD digital</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* TTD Buttons */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setActiveSignatureTarget('kepala')}
                  className="flex-1 py-1.5 px-2 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 font-bold rounded-lg text-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Gores / Unggah TTD</span>
                </button>
                {formData.kepalaSignature && (
                  <button
                    type="button"
                    onClick={() => handleChange('kepalaSignature', '')}
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg transition-colors cursor-pointer"
                    title="Hapus Tanda Tangan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 3. AUDITOR MUTU INDEPENDEN */}
            <div className="bg-[#0f1016] border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-zinc-700/80 transition-colors">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-xs">
                      3
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Penjamin Mutu / Auditor</h4>
                      <p className="text-[10px] text-zinc-400">Pihak Pengawas Mutu & Kepatuhan</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">AUDITOR</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                      Nama Auditor & Gelar
                    </label>
                    <input
                      type="text"
                      value={formData.auditorName ?? 'Ahmad Subarjo, M.T.'}
                      onChange={(e) => handleChange('auditorName', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none"
                      placeholder="Contoh: Ahmad Subarjo, M.T."
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                      Jabatan Auditor
                    </label>
                    <input
                      type="text"
                      value={formData.auditorTitle ?? 'Lead Logistics & Quality Auditor'}
                      onChange={(e) => handleChange('auditorTitle', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none"
                      placeholder="Contoh: Lead Logistics & Quality Auditor"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                      Instansi / Badan Audit
                    </label>
                    <input
                      type="text"
                      value={formData.auditorCompany ?? 'PT Inspeksi Mutu Nasional'}
                      onChange={(e) => handleChange('auditorCompany', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none"
                      placeholder="Contoh: PT Inspeksi Mutu Nasional"
                    />
                  </div>
                </div>

                {/* Signature Preview Box */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Tanda Tangan Digital (TTD)
                  </label>
                  <div className="relative bg-white rounded-xl border border-zinc-700 h-28 flex items-center justify-center p-2 overflow-hidden">
                    {formData.auditorSignature ? (
                      <img
                        src={formData.auditorSignature}
                        alt="TTD Auditor"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-zinc-400 space-y-1">
                        <PenTool className="w-5 h-5 mx-auto text-zinc-300" />
                        <span className="text-[11px] block font-medium">Belum ada TTD digital</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* TTD Buttons */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setActiveSignatureTarget('auditor')}
                  className="flex-1 py-1.5 px-2 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 font-bold rounded-lg text-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Gores / Unggah TTD</span>
                </button>
                {formData.auditorSignature && (
                  <button
                    type="button"
                    onClick={() => handleChange('auditorSignature', '')}
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg transition-colors cursor-pointer"
                    title="Hapus Tanda Tangan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SECTION 1: IDENTITAS & INSTANSI */}
      {activeSection === 'IDENTITY' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card: Profil Perusahaan */}
          <div className="bg-[#0f1016] border border-zinc-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Building className="w-4 h-4 text-emerald-400" />
              <span>Profil Instansi & Perusahaan</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Informasi ini dicantumkan pada kop surat dan berita acara laporan audit PDF resmi.
            </p>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Nama Perusahaan / Instansi
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-zinc-100 outline-none transition-colors"
                  placeholder="Contoh: PT Logistik Prima Nusantara"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Judul Aplikasi Sistem
                </label>
                <input
                  type="text"
                  value={formData.systemName}
                  onChange={(e) => handleChange('systemName', e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-zinc-100 outline-none transition-colors"
                  placeholder="Contoh: GudangClean Management System"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Tagline / Slogan Operasional
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => handleChange('tagline', e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-zinc-100 outline-none transition-colors"
                  placeholder="Contoh: Layanan Pemeliharaan Kebersihan Terpadu"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center space-x-1">
                    <Mail className="w-3 h-3 text-emerald-400" />
                    <span>Email Resmi</span>
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => handleChange('contactEmail', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none"
                    placeholder="audit@gudangclean.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center space-x-1">
                    <Phone className="w-3 h-3 text-emerald-400" />
                    <span>Telepon Kantor</span>
                  </label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => handleChange('contactPhone', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none"
                    placeholder="(021) 8092-1029"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Auditor Mutu & Pengesahan Dokumen */}
          <div className="bg-[#0f1016] border border-zinc-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Auditor Mutu & Format Dokumen</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Pengaturan penandatangan independen dan kode registrasi dokumen audit.
            </p>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Nama Auditor Utama & Gelar
                </label>
                <input
                  type="text"
                  value={formData.auditorName}
                  onChange={(e) => handleChange('auditorName', e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-zinc-100 outline-none"
                  placeholder="Contoh: Ahmad Subarjo, M.T."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Jabatan Auditor
                </label>
                <input
                  type="text"
                  value={formData.auditorTitle}
                  onChange={(e) => handleChange('auditorTitle', e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-zinc-100 outline-none"
                  placeholder="Lead Logistics & Quality Auditor"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Instansi / Badan Audit
                </label>
                <input
                  type="text"
                  value={formData.auditorCompany}
                  onChange={(e) => handleChange('auditorCompany', e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-zinc-100 outline-none"
                  placeholder="PT Inspeksi Mutu Nasional"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Prefix Nomor Dokumen Audit
                </label>
                <input
                  type="text"
                  value={formData.documentPrefix}
                  onChange={(e) => handleChange('documentPrefix', e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs font-mono text-emerald-400 outline-none"
                  placeholder="GC-AUDIT"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Format penomoran: {formData.documentPrefix || 'GC-AUDIT'}-{new Date().getFullYear()}-XXXX
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: MASTER AREA GUDANG (A - L) */}
      {activeSection === 'WAREHOUSES' && (
        <div className="bg-[#0f1016] border border-zinc-800/80 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Kustomisasi Nama & Spesifikasi Area Gudang (A s/d L)</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Ubah penamaan spesifik area masing-masing gudang sesuai peruntukan logistik terbaru.
              </p>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
              Total: {warehouses.length} Gudang
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {warehouses.map((wh) => (
              <div
                key={wh.id}
                className="p-4 bg-zinc-950/60 border border-zinc-900 rounded-xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold font-mono text-xs flex items-center justify-center">
                      {wh.id}
                    </span>
                    <span className="font-semibold text-xs text-zinc-200">{wh.name}</span>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                    wh.status === 'BERSIH' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    wh.status === 'DALAM_PENGERJAAN' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {wh.status}
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-zinc-500 mb-1">
                    Spesifikasi / Nama Area
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={warehouseAreas[wh.id] || ''}
                      onChange={(e) => setWarehouseAreas(prev => ({ ...prev, [wh.id]: e.target.value }))}
                      className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 outline-none"
                      placeholder={`Area Gudang ${wh.id}`}
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveWarehouseArea(wh.id)}
                      className="p-1.5 bg-zinc-800 hover:bg-emerald-600 text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                      title="Simpan nama area gudang ini"
                    >
                      {warehouseSaveSuccess === wh.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: OPERASIONAL & SHIFT KERJA */}
      {activeSection === 'OPERATIONAL' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card: Waktu Shift & Standar Jam */}
          <div className="bg-[#0f1016] border border-zinc-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Jam Operasional Shift Kerja</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Tentukan parameter jam mulai kerja dan toleransi pembersihan untuk petugas.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Jam Mulai Shift (Masuk)
                  </label>
                  <input
                    type="time"
                    value={formData.workShiftStart || '07:00'}
                    onChange={(e) => handleChange('workShiftStart', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Jam Selesai Shift (Pulang)
                  </label>
                  <input
                    type="time"
                    value={formData.workShiftEnd || '16:00'}
                    onChange={(e) => handleChange('workShiftEnd', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none [color-scheme:dark]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Durasi Standar Pembersihan per Gudang (Menit)
                </label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={formData.minCleanDurationMinutes || 30}
                  onChange={(e) => handleChange('minCleanDurationMinutes', Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-zinc-100 outline-none"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Rekomendasi minimal 30 menit untuk standarisasi audit mutu.
                </span>
              </div>
            </div>
          </div>

          {/* Card: Catatan Dokumen & Kebijakan */}
          <div className="bg-[#0f1016] border border-zinc-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Kebijakan Footer Dokumen Audit</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Teks legalitas atau disclaimer yang disematkan di bagian bawah dokumen audit PDF.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Catatan Kaki (Footer Legal Disclaimer)
                </label>
                <textarea
                  rows={4}
                  value={formData.notesFooter}
                  onChange={(e) => handleChange('notesFooter', e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-500 rounded-xl p-3 text-xs text-zinc-200 outline-none resize-none leading-relaxed"
                  placeholder="Dokumen ini diterbitkan secara elektronik oleh Sistem Informasi Bersih Area..."
                />
              </div>

              <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-900 text-xs text-zinc-400 flex items-start space-x-2">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Teks catatan kaki ini akan otomatis tercetak di setiap halaman berkas PDF yang diunduh.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: DATABASE & CADANGAN (BACKUP / RESTORE / RESET) */}
      {activeSection === 'DATABASE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card: Cadangan & Ekspor Data */}
          <div className="bg-[#0f1016] border border-zinc-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Cadangan Data Sistem (JSON)</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Unduh seluruh database sistem (gudang, laporan, riwayat tugas, absensi, dan pengaturan) ke dalam satu berkas cadangan aman.
            </p>

            <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-900 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
                <div>Total Gudang: <strong className="text-white font-mono">{warehouses.length}</strong></div>
                <div>Total Laporan: <strong className="text-white font-mono">{reports.length}</strong></div>
                <div>Total Tugas: <strong className="text-white font-mono">{tasks.length}</strong></div>
                <div>Total Absensi: <strong className="text-white font-mono">{attendanceList.length}</strong></div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-emerald-500/10"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Cadangan Database (.json)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card: Pemulihan & Reset Data */}
          <div className="bg-[#0f1016] border border-zinc-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-rose-400 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Pemeliharaan & Setel Ulang Data</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Tindakan administratif untuk menyetel ulang database ke kondisi awal demo atau menghapus data uji coba.
            </p>

            <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-3">
              <div className="text-xs text-zinc-300 leading-relaxed">
                Menyetel ulang akan mengembalikan 12 Gudang (A-L), akun demo petugas & kepala, serta menghapus seluruh laporan percobaan.
              </div>

              <button
                type="button"
                onClick={onResetDatabase}
                className="w-full py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Setel Ulang Seluruh Data Database ke Kondisi Default</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Pad Modal */}
      {activeSignatureTarget && (
        <SignaturePadModal
          isOpen={!!activeSignatureTarget}
          onClose={() => setActiveSignatureTarget(null)}
          title={
            activeSignatureTarget === 'cleaner'
              ? 'Tanda Tangan Petugas Staf Gudang'
              : activeSignatureTarget === 'kepala'
              ? 'Tanda Tangan Kepala Gudang & Fasilitas'
              : 'Tanda Tangan Penjamin Mutu / Auditor'
          }
          subtitle={
            activeSignatureTarget === 'cleaner'
              ? `Penandatangan: ${formData.cleanerSignerName || 'Staf Petugas Kebersihan'}`
              : activeSignatureTarget === 'kepala'
              ? `Penandatangan: ${formData.kepalaSignerName || 'Kepala Gudang'}`
              : `Penandatangan: ${formData.auditorName || 'Auditor Mutu'}`
          }
          signerName={
            activeSignatureTarget === 'cleaner'
              ? formData.cleanerSignerName || 'Budi Santoso'
              : activeSignatureTarget === 'kepala'
              ? formData.kepalaSignerName || 'Wahyu Andriansyah'
              : formData.auditorName || 'Ahmad Subarjo'
          }
          initialSignature={
            activeSignatureTarget === 'cleaner'
              ? formData.cleanerSignature
              : activeSignatureTarget === 'kepala'
              ? formData.kepalaSignature
              : formData.auditorSignature
          }
          onSave={(signatureDataUrl) => {
            if (activeSignatureTarget === 'cleaner') {
              handleChange('cleanerSignature', signatureDataUrl);
            } else if (activeSignatureTarget === 'kepala') {
              handleChange('kepalaSignature', signatureDataUrl);
            } else if (activeSignatureTarget === 'auditor') {
              handleChange('auditorSignature', signatureDataUrl);
            }
          }}
        />
      )}

    </div>
  );
}
