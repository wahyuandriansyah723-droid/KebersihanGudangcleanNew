import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, LogOut, Clock } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  currentUser: User;
  onLogout: () => void;
}

export default function Navbar({ currentUser, onLogout }: NavbarProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatIndonesianDate = (date: Date) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const dayName = days[date.getDay()];
    const dayOfMonth = date.getDate();
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return {
      dateString: `${dayName}, ${dayOfMonth} ${monthName} ${year}`,
      timeString: `${hours}:${minutes}:${seconds} WIB`
    };
  };

  const { dateString, timeString } = formatIndonesianDate(currentTime);

  return (
    <header className="bg-[#0b0c10]/90 border-b border-zinc-900 text-zinc-100 py-3.5 px-4 md:px-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 sticky top-0 z-50 shadow-md backdrop-blur-md">
      {/* Brand Logo */}
      <div className="flex items-center space-x-3.5">
        <div className="p-2 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-xl">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold font-display tracking-tight text-white flex items-center">
            Gudang<span className="text-emerald-400">Clean</span>
          </h1>
          <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">
            Maintenance Hub A-L
          </span>
        </div>
      </div>

      {/* Date and Time - requested by user ("hari dan tanggal serta jam kerja") */}
      <div className="flex items-center space-x-3 px-4 py-1.5 bg-zinc-950/60 rounded-2xl border border-zinc-900 max-w-sm">
        <Clock className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
        <div className="text-xs font-medium text-left">
          <div className="text-zinc-200 font-sans tracking-wide">{dateString}</div>
          <div className="text-emerald-400 font-mono font-semibold tracking-wider text-[11px]">
            {timeString} <span className="text-[9px] text-zinc-500 uppercase font-mono">(Jam Kerja Aktif)</span>
          </div>
        </div>
      </div>

      {/* User Info & Actions */}
      <div className="flex items-center space-x-4">
        {/* Profile Card */}
        <div className="flex items-center space-x-3 pr-2 border-r border-zinc-900">
          <img
            src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'}
            alt={currentUser.name}
            className="w-9 h-9 rounded-full object-cover border-2 border-zinc-800 shadow"
            referrerPolicy="no-referrer"
          />
          <div className="text-left hidden sm:block">
            <div className="text-sm font-semibold text-zinc-100 leading-tight">
              {currentUser.name}
            </div>
            <div className="flex items-center space-x-1 mt-0.5">
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                currentUser.role === 'KEPALA_GUDANG'
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/10'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
              }`}>
                {currentUser.role === 'KEPALA_GUDANG' ? 'Kepala Gudang' : 'Petugas Kebersihan'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Logout Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onLogout}
            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 rounded-xl text-rose-400 transition-all cursor-pointer"
            title="Keluar dari sistem"
          >
            <LogOut className="w-4.5 h-4.5" />
          </motion.button>
        </div>
      </div>
    </header>
  );
}
