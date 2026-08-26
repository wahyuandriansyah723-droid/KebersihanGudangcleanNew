import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Sparkles, Check, Info, FileText, Calendar, Clock } from 'lucide-react';
import { Warehouse, Report } from '../types';

interface CreateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitReport: (reportData: {
    warehouse: string;
    description: string;
    photoBefore: string;
    photoAfter: string;
    date: string;
    time?: string;
  }) => void;
  initialWarehouse?: string;
  cleanerName: string;
}

export default function CreateReportModal({
  isOpen,
  onClose,
  onSubmitReport,
  initialWarehouse = 'A',
  cleanerName
}: CreateReportModalProps) {
  const [warehouse, setWarehouse] = useState(initialWarehouse);
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reportTime, setReportTime] = useState(() => {
    const d = new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  });
  const [description, setDescription] = useState('');
  const [photoBefore, setPhotoBefore] = useState('');
  const [photoAfter, setPhotoAfter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.75): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Format berkas harus berupa gambar.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const compressed = await compressImage(base64String);
        if (type === 'before') {
          setPhotoBefore(compressed);
        } else {
          setPhotoAfter(compressed);
        }
        setError('');
      } catch (err) {
        console.error("Compression failed, using original", err);
        if (type === 'before') {
          setPhotoBefore(base64String);
        } else {
          setPhotoAfter(base64String);
        }
        setError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouse) {
      setError('Silakan pilih lokasi gudang.');
      return;
    }
    if (!reportDate) {
      setError('Silakan tentukan tanggal laporan.');
      return;
    }
    if (!reportTime) {
      setError('Silakan tentukan jam laporan.');
      return;
    }
    if (!description.trim()) {
      setError('Silakan isi keterangan pengerjaan.');
      return;
    }
    if (!photoBefore) {
      setError('Silakan unggah foto SEBELUM pengerjaan.');
      return;
    }
    if (!photoAfter) {
      setError('Silakan unggah foto SESUDAH pengerjaan.');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate slight backend network latency for high-fidelity feel
    setTimeout(() => {
      onSubmitReport({
        warehouse,
        description,
        photoBefore,
        photoAfter,
        date: reportDate,
        time: reportTime
      });
      setIsSubmitting(false);
      resetForm();
      onClose();
    }, 800);
  };

  const resetForm = () => {
    setWarehouse('A');
    setReportDate(new Date().toISOString().split('T')[0]);
    const d = new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    setReportTime(`${hours}:${minutes}`);
    setDescription('');
    setPhotoBefore('');
    setPhotoAfter('');
    setError('');
  };

  const warehousesList = Array.from({ length: 12 }, (_, i) => String.fromCharCode(65 + i)); // A to L

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Overlay Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="relative w-full max-w-2xl bg-[#12131a] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
        id="create-report-modal"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/10">
          <div className="flex items-center space-x-2.5 text-emerald-400">
            <Sparkles className="w-5 h-5" />
            <h3 className="text-lg font-bold font-display text-white">Buat Laporan Kebersihan Harian</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold text-center flex items-center justify-center space-x-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Info: Petugas, Tanggal, & Jam Input */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Readonly Info Petugas */}
            <div className="p-3.5 bg-zinc-950/40 rounded-xl border border-zinc-900 flex flex-col justify-center">
              <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Nama Petugas</span>
              <span className="text-xs font-semibold text-zinc-200 truncate" title={cleanerName}>{cleanerName}</span>
            </div>

            {/* Date Input for Report */}
            <div className="p-3.5 bg-zinc-950/40 rounded-xl border border-zinc-900 flex flex-col justify-center">
              <label htmlFor="report-date-input" className="block text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>Tanggal</span>
              </label>
              <input
                id="report-date-input"
                type="date"
                value={reportDate}
                onChange={(e) => {
                  setReportDate(e.target.value);
                  setError('');
                }}
                className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 outline-none transition-all font-medium [color-scheme:dark] cursor-pointer"
                required
              />
            </div>

            {/* Time Input for Report */}
            <div className="p-3.5 bg-zinc-950/40 rounded-xl border border-zinc-900 flex flex-col justify-center">
              <label htmlFor="report-time-input" className="block text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>Jam</span>
              </label>
              <input
                id="report-time-input"
                type="time"
                value={reportTime}
                onChange={(e) => {
                  setReportTime(e.target.value);
                  setError('');
                }}
                className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 outline-none transition-all font-medium [color-scheme:dark] cursor-pointer"
                required
              />
            </div>
          </div>

          {/* Warehouse Selector */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Pilih Gudang (Lokasi Pengerjaan)
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {warehousesList.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setWarehouse(code)}
                  className={`py-2 px-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                    warehouse === code
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/10'
                      : 'bg-zinc-950 border-zinc-900 text-zinc-450 hover:border-zinc-800'
                  }`}
                  id={`warehouse-select-${code}`}
                >
                  Gudang {code}
                </button>
              ))}
            </div>
          </div>

          {/* Description/Notes */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Keterangan Pengerjaan (Deskripsi Pekerjaan)
            </label>
            <textarea
              rows={3}
              placeholder="Jelaskan apa saja yang telah dibersihkan atau dirapikan di area ini..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-xl text-sm text-zinc-200 placeholder-zinc-700 outline-none transition-all resize-none"
              id="report-description"
            />
          </div>



          {/* Photo Before and After Container */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Foto Sebelum */}
            <div className="flex flex-col">
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 text-rose-450">
                Foto SEBELUM Pengerjaan
              </label>
              <div className="relative flex-1 min-h-[160px] rounded-xl border-2 border-dashed border-zinc-850 hover:border-zinc-700 bg-zinc-950 overflow-hidden flex flex-col items-center justify-center p-4 text-center transition-all">
                {photoBefore ? (
                  <>
                    <img
                      src={photoBefore}
                      alt="Sebelum"
                      className="absolute inset-0 w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-zinc-950/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-all">
                      <label className="cursor-pointer bg-zinc-900/95 text-xs px-3 py-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-zinc-200 transition-all font-semibold">
                        Ganti Foto
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'before')}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center h-full w-full py-4 text-zinc-550 hover:text-zinc-450 transition-colors">
                    <Upload className="w-8 h-8 mb-2" />
                    <span className="text-xs font-semibold">Pilih atau Unggah Foto</span>
                    <span className="text-[10px] text-zinc-650 mt-1">PNG, JPG up to 5MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'before')}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Foto Sesudah */}
            <div className="flex flex-col">
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 text-emerald-400">
                Foto SESUDAH Pengerjaan
              </label>
              <div className="relative flex-1 min-h-[160px] rounded-xl border-2 border-dashed border-zinc-850 hover:border-zinc-700 bg-zinc-950 overflow-hidden flex flex-col items-center justify-center p-4 text-center transition-all">
                {photoAfter ? (
                  <>
                    <img
                      src={photoAfter}
                      alt="Sesudah"
                      className="absolute inset-0 w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-zinc-950/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-all">
                      <label className="cursor-pointer bg-zinc-900/95 text-xs px-3 py-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-zinc-200 transition-all font-semibold">
                        Ganti Foto
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'after')}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center h-full w-full py-4 text-zinc-550 hover:text-zinc-450 transition-colors">
                    <Upload className="w-8 h-8 mb-2" />
                    <span className="text-xs font-semibold">Pilih atau Unggah Foto</span>
                    <span className="text-[10px] text-zinc-650 mt-1">PNG, JPG up to 5MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'after')}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl transition-all cursor-pointer border border-zinc-800"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/10 flex items-center space-x-1.5 transition-all cursor-pointer border-none"
            id="report-submit-btn"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-zinc-950" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Mengirim...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>Kirim Laporan Resmi</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
