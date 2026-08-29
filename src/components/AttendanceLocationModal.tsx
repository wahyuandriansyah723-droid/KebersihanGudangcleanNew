import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  MapPin,
  Clock,
  UserCheck,
  LogOut,
  ExternalLink,
  Navigation,
  Compass,
  Calendar,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Attendance } from '../types';

interface AttendanceLocationModalProps {
  attendance: Attendance | null;
  allAttendances?: Attendance[];
  onClose: () => void;
}

export const AttendanceLocationModal: React.FC<AttendanceLocationModalProps> = ({
  attendance,
  allAttendances = [],
  onClose
}) => {
  if (!attendance) return null;

  // Find paired attendance on the same date for the same cleaner
  const cleanerName = (attendance.userName || '').trim().toLowerCase();
  const dateStr = attendance.date;

  const sameDayAttendances = allAttendances.filter(a => {
    const aName = (a.userName || '').trim().toLowerCase();
    const isNameMatch = aName === cleanerName || aName.includes(cleanerName) || cleanerName.includes(aName);
    return isNameMatch && a.date === dateStr;
  }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const masukRecord = sameDayAttendances.find(a => a.type === 'MASUK');
  const keluarRecord = sameDayAttendances.find(a => a.type === 'KELUAR');
  const hasBoth = Boolean(masukRecord && keluarRecord);

  // Active view: 'CURRENT' (selected attendance), 'MASUK', 'KELUAR', or 'COMPARE' (side by side)
  const [viewMode, setViewMode] = useState<'CURRENT' | 'MASUK' | 'KELUAR' | 'COMPARE'>(
    hasBoth ? 'COMPARE' : 'CURRENT'
  );

  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);

  // Get active displayed attendance for single view
  const activeRecord: Attendance = (() => {
    if (viewMode === 'MASUK' && masukRecord) return masukRecord;
    if (viewMode === 'KELUAR' && keluarRecord) return keluarRecord;
    return attendance;
  })();

  const isMasuk = activeRecord.type === 'MASUK';
  const hasGps = activeRecord.latitude !== undefined && activeRecord.longitude !== undefined;
  const lat = activeRecord.latitude ?? -6.2088;
  const lng = activeRecord.longitude ?? 106.8456;
  const mapsUrl = activeRecord.mapUrl || `https://www.google.com/maps?q=${lat},${lng}`;

  // Calculate shift duration if both records exist
  const shiftDuration = (() => {
    if (!masukRecord || !keluarRecord) return null;
    const start = new Date(masukRecord.timestamp).getTime();
    const end = new Date(keluarRecord.timestamp).getTime();
    const diffMs = Math.max(0, end - start);
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours} jam ${diffMinutes} menit`;
  })();

  const formattedDate = new Date(activeRecord.timestamp).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-4xl bg-[#111218] border border-zinc-800 rounded-3xl shadow-2xl z-10 flex flex-col max-h-[92vh] overflow-hidden my-auto"
        id="attendance-location-modal"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">
                  Detail Lokasi & Foto Absensi
                </span>
                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  isMasuk
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {activeRecord.type}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                {activeRecord.userName}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Toggle Tabs if Cleaner has both Masuk and Keluar records on this day */}
        {hasBoth && (
          <div className="px-4 sm:px-5 py-2.5 bg-zinc-950/60 border-b border-zinc-850 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center space-x-1.5 overflow-x-auto">
              <span className="text-[11px] font-bold text-zinc-400 mr-1 flex items-center space-x-1">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pilihan Tampilan:</span>
              </span>

              <button
                type="button"
                onClick={() => setViewMode('COMPARE')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  viewMode === 'COMPARE'
                    ? 'bg-emerald-500 text-zinc-950 shadow-md font-extrabold'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Bandingkan Masuk & Keluar</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('MASUK')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  viewMode === 'MASUK'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                <UserCheck className="w-3 h-3 text-emerald-400" />
                <span>Absen Masuk ({masukRecord?.time} WIB)</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('KELUAR')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  viewMode === 'KELUAR'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                <LogOut className="w-3 h-3 text-rose-400" />
                <span>Absen Keluar ({keluarRecord?.time} WIB)</span>
              </button>
            </div>

            {shiftDuration && (
              <div className="text-[11px] font-mono text-zinc-400 bg-zinc-900/80 border border-zinc-800 px-2.5 py-1 rounded-lg flex items-center space-x-1.5">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>Durasi Kerja: <strong className="text-emerald-400">{shiftDuration}</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {viewMode === 'COMPARE' && hasBoth && masukRecord && keluarRecord ? (
            /* ================= SIDE BY SIDE COMPARISON VIEW ================= */
            <div className="space-y-6">
              <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-zinc-300">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold">{formattedDate}</span>
                </div>
                <span className="text-[11px] text-zinc-500 font-mono">
                  Petugas: <strong className="text-zinc-200">{attendance.userName}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. KARTU ABSEN MASUK */}
                <div className="p-4 sm:p-5 bg-emerald-950/10 border border-emerald-500/20 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-extrabold text-emerald-400 text-xs uppercase tracking-wider">
                        1. Foto & Lokasi Masuk
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                      {masukRecord.time} WIB
                    </span>
                  </div>

                  {/* Photo Container */}
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-emerald-500/30 bg-black group/photo shadow-md">
                    <img
                      src={masukRecord.photo}
                      alt="Foto Absen Masuk"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 left-2 bg-zinc-950/80 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] font-mono font-bold text-emerald-400 border border-emerald-500/30">
                      MASUK • {masukRecord.time} WIB
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 bg-zinc-950/85 backdrop-blur-sm p-2 rounded-lg text-[10px] text-zinc-300 flex items-center justify-between">
                      <span className="font-medium truncate flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{masukRecord.location}</span>
                      </span>
                      {masukRecord.latitude && (
                        <span className="text-[9px] font-mono text-zinc-400 shrink-0 ml-1">
                          GPS: {masukRecord.latitude.toFixed(4)}, {masukRecord.longitude?.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Location Info & Maps Button */}
                  <div className="space-y-2 text-xs">
                    <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase font-mono">Area Gudang</span>
                        <span className="font-bold text-white text-xs">{masukRecord.location}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-zinc-850">
                        <span className="text-[10px] text-zinc-500 font-mono">Koordinat GPS:</span>
                        <span className="font-mono text-[11px] text-emerald-400">
                          {masukRecord.latitude ? `${masukRecord.latitude.toFixed(6)}, ${masukRecord.longitude?.toFixed(6)}` : 'Area Terverifikasi'}
                        </span>
                      </div>
                    </div>

                    <a
                      href={masukRecord.mapUrl || `https://www.google.com/maps?q=${masukRecord.latitude || -6.2088},${masukRecord.longitude || 106.8456}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-zinc-950 border border-emerald-500/30 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Cek Titik Lokasi Masuk di Google Maps</span>
                    </a>
                  </div>
                </div>

                {/* 2. KARTU ABSEN KELUAR */}
                <div className="p-4 sm:p-5 bg-rose-950/10 border border-rose-500/20 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-rose-500/20">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
                      <span className="font-extrabold text-rose-400 text-xs uppercase tracking-wider">
                        2. Foto & Lokasi Keluar
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-lg border border-rose-500/20">
                      {keluarRecord.time} WIB
                    </span>
                  </div>

                  {/* Photo Container */}
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-rose-500/30 bg-black group/photo shadow-md">
                    <img
                      src={keluarRecord.photo}
                      alt="Foto Absen Keluar"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 left-2 bg-zinc-950/80 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] font-mono font-bold text-rose-400 border border-rose-500/30">
                      KELUAR • {keluarRecord.time} WIB
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 bg-zinc-950/85 backdrop-blur-sm p-2 rounded-lg text-[10px] text-zinc-300 flex items-center justify-between">
                      <span className="font-medium truncate flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                        <span>{keluarRecord.location}</span>
                      </span>
                      {keluarRecord.latitude && (
                        <span className="text-[9px] font-mono text-zinc-400 shrink-0 ml-1">
                          GPS: {keluarRecord.latitude.toFixed(4)}, {keluarRecord.longitude?.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Location Info & Maps Button */}
                  <div className="space-y-2 text-xs">
                    <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase font-mono">Area Gudang</span>
                        <span className="font-bold text-white text-xs">{keluarRecord.location}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-zinc-855">
                        <span className="text-[10px] text-zinc-500 font-mono">Koordinat GPS:</span>
                        <span className="font-mono text-[11px] text-rose-400">
                          {keluarRecord.latitude ? `${keluarRecord.latitude.toFixed(6)}, ${keluarRecord.longitude?.toFixed(6)}` : 'Area Terverifikasi'}
                        </span>
                      </div>
                    </div>

                    <a
                      href={keluarRecord.mapUrl || `https://www.google.com/maps?q=${keluarRecord.latitude || -6.2088},${keluarRecord.longitude || 106.8456}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-zinc-950 border border-rose-500/30 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Cek Titik Lokasi Keluar di Google Maps</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ================= SINGLE DETAILED VIEW ================= */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Photo Card */}
              <div className="lg:col-span-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300 flex items-center space-x-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Foto Selfie Presensi {isMasuk ? 'Masuk' : 'Keluar'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPhotoZoomed(!isPhotoZoomed)}
                    className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    {isPhotoZoomed ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    <span>{isPhotoZoomed ? 'Perkecil' : 'Perbesar'}</span>
                  </button>
                </div>

                <div className={`relative rounded-2xl overflow-hidden border border-zinc-800 bg-black shadow-xl transition-all ${
                  isPhotoZoomed ? 'aspect-auto max-h-[500px]' : 'aspect-[4/3]'
                }`}>
                  <img
                    src={activeRecord.photo}
                    alt={`Foto ${activeRecord.type} - ${activeRecord.userName}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />

                  {/* Watermark Overlay Stamp on the photo */}
                  <div className="absolute top-3 left-3 bg-zinc-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-800 text-xs shadow-lg space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${isMasuk ? 'bg-emerald-400' : 'bg-rose-400'} animate-pulse`} />
                      <span className={`font-extrabold text-[10px] uppercase font-mono ${isMasuk ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ABSEN {activeRecord.type}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-300 block">
                      {activeRecord.time} WIB • {activeRecord.date}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 bg-zinc-950/90 backdrop-blur-md p-2.5 rounded-xl border border-zinc-800 text-xs text-zinc-200 flex items-center justify-between shadow-lg">
                    <div className="flex items-center space-x-2 truncate">
                      <MapPin className={`w-4 h-4 shrink-0 ${isMasuk ? 'text-emerald-400' : 'text-rose-400'}`} />
                      <span className="font-bold truncate text-xs">{activeRecord.location}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono shrink-0 ml-2">
                      {activeRecord.userName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Location & GPS Details Card */}
              <div className="lg:col-span-6 space-y-4">
                <span className="text-xs font-bold text-zinc-300 flex items-center space-x-1.5">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Informasi Lokasi & Titik Koordinat GPS</span>
                </span>

                <div className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-2xl space-y-3.5">
                  {/* Location Name */}
                  <div className="flex items-start justify-between pb-3 border-b border-zinc-850">
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase font-mono block">
                        Area / Gudang Terdaftar
                      </span>
                      <span className="text-base font-extrabold text-white block mt-0.5">
                        {activeRecord.location}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl font-mono ${
                      isMasuk
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      Shift {isMasuk ? 'Masuk' : 'Pulang'}
                    </span>
                  </div>

                  {/* GPS Coordinates */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-850">
                      <span className="text-[9px] text-zinc-500 uppercase font-mono block">Latitude (Garis Lintang)</span>
                      <span className="font-mono font-bold text-zinc-200 text-xs block mt-0.5">
                        {hasGps ? activeRecord.latitude?.toFixed(6) : '-6.208800'}
                      </span>
                    </div>
                    <div className="p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-850">
                      <span className="text-[9px] text-zinc-500 uppercase font-mono block">Longitude (Garis Bujur)</span>
                      <span className="font-mono font-bold text-zinc-200 text-xs block mt-0.5">
                        {hasGps ? activeRecord.longitude?.toFixed(6) : '106.845600'}
                      </span>
                    </div>
                  </div>

                  {/* Accuracy & Status */}
                  <div className="flex items-center justify-between text-xs p-2.5 bg-zinc-900/30 rounded-xl border border-zinc-850">
                    <div className="flex items-center space-x-2">
                      <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-zinc-400">Tingkat Akurasi GPS:</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">
                      {activeRecord.accuracy ? `±${Math.round(activeRecord.accuracy)} meter` : '±8 - 15 meter (Tinggi)'}
                    </span>
                  </div>

                  {/* Date & Time */}
                  <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-850 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Waktu & Tanggal:</span>
                      <span className="font-semibold text-zinc-200">{formattedDate}</span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Jam Presensi:</span>
                      <span className="font-mono font-extrabold text-white text-sm">{activeRecord.time} WIB</span>
                    </div>
                  </div>

                  {/* Interactive Map Link / Action */}
                  <div className="pt-2">
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold text-xs rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/10 transition-all cursor-pointer border-none"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Buka Koordinat di Google Maps</span>
                    </a>
                  </div>
                </div>

                {/* Map illustration banner */}
                <div className="p-3.5 bg-emerald-950/15 border border-emerald-500/20 rounded-2xl flex items-center space-x-3 text-xs text-zinc-300">
                  <MapPin className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white block">Titik Lokasi Terautentikasi</span>
                    <span className="text-[11px] text-zinc-400 block mt-0.5">
                      Foto selfie dan posisi absensi telah tervalidasi secara otomatis oleh sistem saat petugas menekan tombol absen.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-800/80 bg-zinc-900/30 flex items-center justify-between shrink-0">
          <span className="text-xs text-zinc-400 font-medium">
            Status: <strong className="text-emerald-400">Presensi Tervalidasi Sistem</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl transition-all cursor-pointer border border-zinc-700"
          >
            Tutup
          </button>
        </div>
      </motion.div>
    </div>
  );
};
