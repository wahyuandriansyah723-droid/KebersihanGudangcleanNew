import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogIn, 
  Mail, 
  Sparkles, 
  User as UserIcon, 
  Shield, 
  Lock, 
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  UserPlus,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { User, UserRole } from '../types';
import { demoUsers } from '../mockData';
import { 
  getRememberedCredentials, 
  setRememberedCredentials, 
  clearRememberedCredentials,
  signInWithGoogle,
  getUserFromFirestore,
  getUsersByEmailFromFirestore
} from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [remembered] = useState(() => getRememberedCredentials());
  const [email, setEmail] = useState(remembered.email);
  const [password, setPassword] = useState(remembered.password);
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>((remembered.role as UserRole) || 'PETUGAS_KEBERSIHAN');
  const [rememberMe, setRememberMe] = useState(remembered.rememberMe !== false); // Defaults to true
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<any | null>(null);
  const [showDomainHelper, setShowDomainHelper] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accountsToSelect, setAccountsToSelect] = useState<User[] | null>(null);

  const handleDemoLogin = (user: User) => {
    onLogin(user);
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const gUser = await signInWithGoogle();
      if (!gUser || !gUser.email) {
        throw new Error('Gagal mendapatkan informasi pengguna dari Google.');
      }

      // Check if user already exists in Firestore
      const existingUser = await getUserFromFirestore(gUser.uid);
      if (existingUser) {
        // User already exists, proceed to login directly!
        onLogin(existingUser);
      } else {
        // New user! Save details and ask for role
        setPendingGoogleUser(gUser);
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      if (err?.code === 'auth/unauthorized-domain') {
        setShowDomainHelper(true);
        setError('Domain belum diotorisasi oleh Firebase Auth.');
      } else if (err?.code !== 'auth/popup-closed-by-user') {
        setError(err?.message || 'Gagal login dengan Google.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleRoleSelect = (selectedRole: UserRole) => {
    if (!pendingGoogleUser) return;

    const emailLower = pendingGoogleUser.email?.toLowerCase() || '';
    const isJapfa = emailLower.includes('@japfa') || emailLower.includes('japfa.');
    if (selectedRole === 'KEPALA_GUDANG' && !isJapfa) {
      setError('Hanya akun email dengan domain @Japfa yang diperbolehkan menjadi Kepala Gudang.');
      return;
    }

    const newUser: User = {
      id: pendingGoogleUser.uid,
      name: pendingGoogleUser.displayName || pendingGoogleUser.email.split('@')[0],
      email: pendingGoogleUser.email.toLowerCase(),
      role: selectedRole,
      avatarUrl: pendingGoogleUser.photoURL || (selectedRole === 'KEPALA_GUDANG' 
        ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150'
        : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150')
    };

    onLogin(newUser);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email) {
        throw new Error('Email wajib diisi.');
      }
      if (!email.includes('@')) {
        throw new Error('Masukkan format email yang valid.');
      }
      if (!password) {
        throw new Error('Kata sandi wajib diisi.');
      }

      if (activeTab === 'register') {
        if (!name) {
          throw new Error('Nama Lengkap wajib diisi untuk pendaftaran.');
        }

        const isJapfa = email.trim().toLowerCase().includes('@japfa') || email.trim().toLowerCase().includes('japfa.');
        if (role === 'KEPALA_GUDANG' && !isJapfa) {
          throw new Error('Hanya akun email dengan domain @Japfa yang diperbolehkan menjadi Kepala Gudang. Akun @gmail atau domain lain hanya bisa menjadi Petugas Gudang.');
        }

        const nameIdSafe = name.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
        const emailIdSafe = email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
        const deterministicId = `user_${emailIdSafe}_${nameIdSafe}`;

        // Check if user already exists
        const existingUser = await getUserFromFirestore(deterministicId);
        if (existingUser) {
          throw new Error('Nama dengan email ini sudah terdaftar. Silakan gunakan nama lengkap atau variasi nama lain.');
        }

        const newUser: User = {
          id: deterministicId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: role,
          password: password,
          avatarUrl: role === 'KEPALA_GUDANG' 
            ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150'
            : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150'
        };

        if (rememberMe) {
          setRememberedCredentials(email, password, name, role);
        } else {
          clearRememberedCredentials();
        }

        onLogin(newUser);
      } else {
        // ActiveTab: Login
        // 1. Check if user enters credentials that match a demo user
        const matchedDemo = demoUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
        if (matchedDemo) {
          if (password === matchedDemo.password || password === 'password123') {
            if (rememberMe) {
              setRememberedCredentials(email, password, matchedDemo.name, matchedDemo.role);
            } else {
              clearRememberedCredentials();
            }
            onLogin(matchedDemo);
            return;
          } else {
            throw new Error('Kata sandi salah.');
          }
        }

        // 2. Query Firestore users with this email (multiple accounts possible)
        let matchingUsers = await getUsersByEmailFromFirestore(email);

        // 3. For backward compatibility, also check if there is a legacy account in the old format
        const legacyId = 'email-' + email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
        const legacyUser = await getUserFromFirestore(legacyId);
        if (legacyUser && !matchingUsers.some(u => u.id === legacyUser.id)) {
          matchingUsers = [legacyUser, ...matchingUsers];
        }

        if (matchingUsers.length === 0) {
          // Derive default name from email if name is not set
          const emailUserPart = email.split('@')[0] || 'User';
          const suggestedName = emailUserPart
            .replace(/[._0-9]/g, ' ')
            .trim()
            .split(' ')
            .filter(Boolean)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ') || emailUserPart;
          
          if (!name) {
            setName(suggestedName);
          }

          throw new Error(`Akun dengan email "${email}" belum terdaftar. Silakan klik tombol di bawah untuk mendaftarkan akun baru.`);
        }

        if (matchingUsers.length === 1) {
          const existingUser = matchingUsers[0];
          if (existingUser.password && existingUser.password !== password) {
            throw new Error('Kata sandi salah.');
          }

          // Auto-save password if not present (historical support)
          if (!existingUser.password) {
            existingUser.password = password;
          }

          if (rememberMe) {
            setRememberedCredentials(email, password, existingUser.name, existingUser.role);
          } else {
            clearRememberedCredentials();
          }

          onLogin(existingUser);
        } else {
          // Multiple accounts exist with this email.
          // First, filter by password to see if exactly one account matches the typed password
          const correctPasswordUsers = matchingUsers.filter(u => u.password === password);
          if (correctPasswordUsers.length === 1) {
            // Exactly one matches the password, auto login!
            const existingUser = correctPasswordUsers[0];
            if (rememberMe) {
              setRememberedCredentials(email, password, existingUser.name, existingUser.role);
            } else {
              clearRememberedCredentials();
            }
            onLogin(existingUser);
          } else {
            // Show selection screen of all users sharing this email
            setAccountsToSelect(matchingUsers);
          }
        }
      }
    } catch (err: any) {
      console.error('Manual login/register error:', err);
      setError(err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRegisterAndLogin = async () => {
    if (!email || !password) {
      setError('Email dan kata sandi wajib diisi.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const emailUserPart = email.split('@')[0] || 'User';
      const cleanName = (name || emailUserPart.replace(/[._0-9]/g, ' ').trim().split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || emailUserPart).trim();
      
      const isJapfa = email.trim().toLowerCase().includes('@japfa') || email.trim().toLowerCase().includes('japfa.');
      const userRole = (role === 'KEPALA_GUDANG' && isJapfa) ? 'KEPALA_GUDANG' : 'PETUGAS_KEBERSIHAN';

      const nameIdSafe = cleanName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
      const emailIdSafe = email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
      const deterministicId = `user_${emailIdSafe}_${nameIdSafe}`;

      const newUser: User = {
        id: deterministicId,
        name: cleanName,
        email: email.trim().toLowerCase(),
        role: userRole,
        password: password,
        avatarUrl: userRole === 'KEPALA_GUDANG' 
          ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150'
          : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150'
      };

      if (rememberMe) {
        setRememberedCredentials(email, password, cleanName, userRole);
      } else {
        clearRememberedCredentials();
      }

      onLogin(newUser);
    } catch (err: any) {
      console.error('Quick register error:', err);
      setError(err?.message || 'Gagal mendaftarkan akun.');
    } finally {
      setLoading(false);
    }
  };


  if (showDomainHelper) {
    const currentDomain = window.location.hostname;
    const firebaseConsoleUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;

    return (
      <div className="min-h-screen bg-[#0a0b0e] text-zinc-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
        {/* Background Decorative Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-rose-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-xl bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-8 shadow-2xl z-10"
          id="domain-helper-card"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-400 mb-4">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Otorisasi Domain Firebase Auth</h2>
            <p className="text-sm text-zinc-400">
              Firebase memblokir login Google karena domain ini belum diizinkan (unauthorized-domain).
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80">
              <span className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Domain Saat Ini
              </span>
              <div className="flex items-center justify-between bg-zinc-900 p-2.5 rounded-lg border border-zinc-800 font-mono text-xs text-zinc-300">
                <span className="truncate select-all">{currentDomain}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(currentDomain);
                    setCopiedDomain(true);
                    setTimeout(() => setCopiedDomain(false), 2000);
                  }}
                  className="ml-3 p-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  {copiedDomain ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[10px] text-emerald-400 font-sans font-medium">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-sans font-medium">Salin</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <span className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Langkah-langkah Otorisasi Domain:
              </span>
              <ol className="list-decimal list-inside text-xs text-zinc-400 space-y-2.5 leading-relaxed">
                <li>
                  Buka halaman <strong className="text-zinc-200">Firebase Authentication Settings</strong> di konsol proyek Anda:{' '}
                  <a
                    href={firebaseConsoleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 underline font-medium inline-flex items-center space-x-1"
                  >
                    <span>Firebase Settings Console</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-1 inline" />
                  </a>
                </li>
                <li>
                  Scroll ke bawah menuju bagian <strong className="text-zinc-200">Authorized domains</strong> (Domain resmi) lalu klik tombol <strong className="text-emerald-400">Add domain</strong> (Tambah domain).
                </li>
                <li>
                  Masukkan nama domain saat ini (<code className="text-amber-400">{currentDomain}</code>) and klik <strong className="text-zinc-200">Add</strong>.
                </li>
                <li>
                  Lakukan hal yang sama untuk domain Vercel Anda yang lain (misal: <code className="text-zinc-300">*.vercel.app</code> atau domain produksi Anda).
                </li>
              </ol>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setShowDomainHelper(false)}
                className="flex-1 flex items-center justify-center space-x-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm rounded-xl transition-all cursor-pointer border-none"
              >
                <span>Sudah Saya Tambahkan, Coba Lagi</span>
              </button>
              <button
                onClick={() => setShowDomainHelper(false)}
                className="px-4 flex items-center justify-center text-xs text-zinc-500 hover:text-zinc-400 transition-colors cursor-pointer"
              >
                <span>Batal</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }


  if (pendingGoogleUser) {
    const gEmail = pendingGoogleUser.email || '';
    const isGEmailJapfa = gEmail.toLowerCase().includes('@japfa') || gEmail.toLowerCase().includes('japfa.');

    return (
      <div className="min-h-screen bg-[#0a0b0e] text-zinc-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
        {/* Background Decorative Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] rounded-full bg-teal-500/5 blur-[120px] pointer-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-8 shadow-2xl z-10"
          id="google-role-card"
        >
          <div className="text-center mb-6">
            {pendingGoogleUser.photoURL ? (
              <img 
                src={pendingGoogleUser.photoURL} 
                alt={pendingGoogleUser.displayName || 'Google User'} 
                className="w-16 h-16 rounded-full mx-auto mb-4 border border-emerald-500/40 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="inline-flex items-center justify-center p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400 mb-4">
                <UserIcon className="w-8 h-8" />
              </div>
            )}
            <h2 className="text-xl font-bold text-white mb-1">Pilih Jabatan Anda</h2>
            <p className="text-sm text-zinc-400">
              Halo <span className="text-emerald-400 font-medium">{pendingGoogleUser.displayName || pendingGoogleUser.email.split('@')[0]}</span>, pilih peran Anda untuk menyelesaikan masuk:
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-medium text-center mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={() => {
                setError('');
                handleGoogleRoleSelect('PETUGAS_KEBERSIHAN');
              }}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 transition-all text-left cursor-pointer group"
              id="google-role-petugas"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-zinc-200 group-hover:text-emerald-400 transition-colors">
                    Petugas Kebersihan
                  </div>
                  <div className="text-xs text-zinc-500">Membersihkan gudang &amp; mengirim laporan</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                if (!isGEmailJapfa) {
                  setError('Hanya akun email dengan domain @Japfa yang diperbolehkan menjadi Kepala Gudang.');
                  return;
                }
                setError('');
                handleGoogleRoleSelect('KEPALA_GUDANG');
              }}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all text-left group ${
                isGEmailJapfa 
                  ? 'bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-sky-500/40 cursor-pointer' 
                  : 'bg-zinc-950/40 border border-zinc-900 opacity-40 cursor-not-allowed'
              }`}
              id="google-role-kepala"
              disabled={!isGEmailJapfa}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-sky-500/10 rounded-lg text-sky-400 border border-sky-500/20">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-zinc-200 group-hover:text-sky-400 transition-colors">
                    Kepala Gudang
                  </div>
                  <div className="text-xs text-zinc-500">Memonitor gudang, verifikasi laporan, &amp; atur tugas</div>
                </div>
              </div>
            </button>

            <p className="text-[10px] leading-relaxed text-center font-medium mt-2">
              {isGEmailJapfa ? (
                <span className="text-emerald-400/90">✓ Email @Japfa terdeteksi. Anda dapat memilih peran Kepala atau Petugas.</span>
              ) : gEmail.toLowerCase().includes('@gmail') ? (
                <span className="text-amber-400/90">⚠ Akun @gmail ({gEmail}) hanya diperbolehkan menjadi Petugas Gudang.</span>
              ) : (
                <span className="text-zinc-500">⚠ Hanya akun Google dengan domain @Japfa yang diperbolehkan menjadi Kepala Gudang. Akun {gEmail} hanya bisa menjadi Petugas.</span>
              )}
            </p>

            <button
              onClick={() => {
                setError('');
                setPendingGoogleUser(null);
              }}
              className="w-full flex items-center justify-center space-x-2 py-3 text-xs text-zinc-500 hover:text-zinc-300 transition-all border border-transparent hover:border-zinc-800 rounded-xl cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Batal</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (accountsToSelect) {
    return (
      <div className="min-h-screen bg-[#0a0b0e] text-zinc-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
        {/* Background Decorative Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-8 shadow-2xl z-10"
          id="account-selector-card"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400 mb-4">
              <UserIcon className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Pilih Akun Anda</h2>
            <p className="text-sm text-zinc-400">
              Ditemukan beberapa akun dengan email <strong>{email}</strong>. Silakan pilih salah satu untuk masuk:
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-medium text-center mb-4">
              {error}
            </div>
          )}

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {accountsToSelect.map((acc) => (
              <button
                key={acc.id}
                onClick={() => {
                  setError('');
                  if (acc.password && acc.password !== password) {
                    setError(`Kata sandi salah untuk akun ${acc.name}.`);
                    return;
                  }
                  if (rememberMe) {
                    setRememberedCredentials(email, password, acc.name, acc.role);
                  } else {
                    clearRememberedCredentials();
                  }
                  onLogin(acc);
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-emerald-500/40 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={acc.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=80'}
                    alt={acc.name}
                    className="w-10 h-10 rounded-lg object-cover border border-zinc-800"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="font-semibold text-sm text-zinc-200 group-hover:text-emerald-400 transition-colors">
                      {acc.name}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {acc.role === 'KEPALA_GUDANG' ? 'Kepala Gudang' : 'Petugas Kebersihan'}
                    </div>
                  </div>
                </div>
                <div className="p-1 text-zinc-600 group-hover:text-emerald-400 transition-colors">
                  <LogIn className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setError('');
              setAccountsToSelect(null);
            }}
            className="w-full mt-4 flex items-center justify-center space-x-2 py-2.5 text-xs text-zinc-500 hover:text-zinc-300 transition-all border border-zinc-850 hover:border-zinc-800 rounded-xl cursor-pointer bg-transparent"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Halaman Masuk</span>
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0b0e] text-zinc-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-8 shadow-2xl z-10"
        id="login-card"
      >
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400 mb-3">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold font-display tracking-tight text-white mb-1">
            Gudang<span className="text-emerald-400">Clean</span>
          </h1>
          <p className="text-xs text-zinc-400">
            Sistem Pemeliharaan &amp; Pemantauan Kebersihan Gudang Modern
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-850/80 mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setError('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'login'
                ? 'bg-zinc-900 border border-zinc-800 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Masuk</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setError('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'register'
                ? 'bg-zinc-900 border border-zinc-800 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Daftar Akun</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-medium space-y-2">
              <div className="text-center leading-relaxed">{error}</div>
              {activeTab === 'login' && error.includes('belum terdaftar') && (
                <div className="pt-1.5 space-y-1.5">
                  <button
                    type="button"
                    onClick={handleQuickRegisterAndLogin}
                    disabled={loading}
                    className="w-full py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-lg text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Daftar Akun Baru &amp; Masuk Sekarang</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('register');
                      setError('');
                    }}
                    className="w-full py-1.5 px-3 bg-zinc-900/80 hover:bg-zinc-850 text-zinc-300 font-medium rounded-lg border border-zinc-800 text-[11px] transition-all flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <span>Lengkapi Data di Formulir Pendaftaran</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'register' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-1.5"
            >
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Nama Lengkap
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Masukkan nama lengkap Anda"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError('');
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-850 hover:border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-xl text-sm text-zinc-200 placeholder-zinc-700 outline-none transition-all"
                  id="name-input"
                  required
                />
              </div>
            </motion.div>
          )}

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Alamat Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                placeholder="nama@gudang.com"
                value={email}
                onChange={(e) => {
                  const val = e.target.value;
                  setEmail(val);
                  setError('');
                  
                  // If they select KEPALA_GUDANG but email isn't Japfa, automatically fallback to PETUGAS_KEBERSIHAN
                  const isJapfa = val.trim().toLowerCase().includes('@japfa') || val.trim().toLowerCase().includes('japfa.');
                  if (role === 'KEPALA_GUDANG' && val && !isJapfa) {
                    setRole('PETUGAS_KEBERSIHAN');
                  }
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-850 hover:border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-xl text-sm text-zinc-200 placeholder-zinc-700 outline-none transition-all"
                id="email-input"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Kata Sandi (Password)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-850 hover:border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-xl text-sm text-zinc-200 placeholder-zinc-700 outline-none transition-all"
                id="password-input"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          {activeTab === 'register' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2 pt-1"
            >
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Pilih Jabatan (Role)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setRole('PETUGAS_KEBERSIHAN');
                  }}
                  className={`flex items-center justify-center space-x-2 p-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    role === 'PETUGAS_KEBERSIHAN'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-sm shadow-emerald-500/10'
                      : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:border-zinc-750'
                  }`}
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Petugas</span>
                </button>
                {(() => {
                  const isJapfa = email.trim().toLowerCase().includes('@japfa') || email.trim().toLowerCase().includes('japfa.');
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        if (!isJapfa) {
                          setError('Hanya akun email dengan domain @Japfa yang diperbolehkan menjadi Kepala Gudang.');
                          return;
                        }
                        setError('');
                        setRole('KEPALA_GUDANG');
                      }}
                      className={`flex items-center justify-center space-x-2 p-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                        !isJapfa
                          ? 'bg-zinc-950/40 border-zinc-900 text-zinc-600 opacity-40 cursor-not-allowed'
                          : role === 'KEPALA_GUDANG'
                          ? 'bg-sky-500/10 border-sky-500 text-sky-400 shadow-sm shadow-sky-500/10 cursor-pointer'
                          : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:border-zinc-750 cursor-pointer'
                      }`}
                      title={!isJapfa ? 'Hanya email @japfa yang bisa memilih peran ini' : ''}
                    >
                      <Shield className="w-4 h-4" />
                      <span>Kepala</span>
                    </button>
                  );
                })()}
              </div>

              {/* Helper text based on email */}
              <p className="text-[10px] leading-relaxed font-medium mt-1.5">
                {email.trim().toLowerCase().includes('@japfa') || email.trim().toLowerCase().includes('japfa.') ? (
                  <span className="text-emerald-400/90">✓ Email @Japfa terverifikasi: Berhak mendapatkan hak akses penuh sebagai Kepala Gudang.</span>
                ) : (
                  <span className="text-amber-400/90">⚠ Akun non-Japfa ({email || 'email luar'}) hanya diperbolehkan menjadi Petugas Kebersihan. Hak akses Kepala Gudang khusus untuk email @japfa.</span>
                )}
              </p>
            </motion.div>
          )}

          <div className="flex items-center justify-between py-1">
            <label className="flex items-center space-x-2 text-xs text-zinc-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded bg-zinc-950 border-zinc-850 text-emerald-500 focus:ring-0 focus:ring-offset-0 focus:outline-none w-4 h-4 cursor-pointer"
              />
              <span>Simpan Sandi Otomatis</span>
            </label>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/10 transition-all outline-none border-none cursor-pointer mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            id="login-submit-btn"
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4 text-zinc-950" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : activeTab === 'login' ? (
              <LogIn className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            <span>{loading ? 'Memproses...' : activeTab === 'login' ? 'Masuk ke Sistem' : 'Daftar Akun & Masuk'}</span>
          </motion.button>
        </form>

        {/* Separator */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-zinc-850"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#121318] px-3 text-zinc-500 font-medium text-[10px] tracking-wider">Atau masuk menggunakan</span>
          </div>
        </div>

        {/* Google Sign-In Button */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full flex items-center justify-center space-x-3 py-2.5 px-4 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-750 rounded-xl text-zinc-200 font-semibold text-xs transition-all shadow-md cursor-pointer outline-none"
          id="google-login-btn"
        >
          {googleLoading ? (
            <svg className="animate-spin h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
          )}
          <span>{googleLoading ? 'Menghubungkan...' : 'Masuk dengan Google'}</span>
        </motion.button>

        {/* Demo Accounts / Quick Login Accordion */}
        {demoUsers.length > 0 && (
          <div className="mt-6 pt-4 border-t border-zinc-850/60">
            <button
              type="button"
              onClick={() => setShowDemoAccounts(!showDemoAccounts)}
              className="w-full flex items-center justify-between text-[11px] text-zinc-500 hover:text-zinc-400 transition-colors font-semibold tracking-wider uppercase cursor-pointer"
            >
              <span>Gunakan Akun Demo / Masuk Cepat</span>
              {showDemoAccounts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <AnimatePresence>
              {showDemoAccounts && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden space-y-2 mt-3.5"
                >
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    Pilih akun simulasi di bawah untuk masuk secara instan tanpa mendaftar:
                  </p>
                  <div className="grid grid-cols-1 gap-2.5">
                    {demoUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleDemoLogin(user)}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-950/50 hover:bg-zinc-950 border border-zinc-850 hover:border-zinc-750 transition-all text-left cursor-pointer group"
                      >
                        <div className="flex items-center space-x-2.5">
                          <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className="w-8 h-8 rounded-full object-cover border border-zinc-800 group-hover:border-emerald-500/30"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="font-semibold text-xs text-zinc-200 group-hover:text-emerald-400 transition-colors">
                              {user.name}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono leading-none mt-0.5">{user.email}</div>
                          </div>
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          user.role === 'KEPALA_GUDANG' 
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {user.role === 'KEPALA_GUDANG' ? 'Kepala' : 'Petugas'}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Decorative footer */}
      <div className="mt-8 text-center text-zinc-600 text-[10px] font-mono z-10 uppercase tracking-widest">
        &copy; 2026 GudangClean | Kelola dengan Presisi.
      </div>
    </div>
  );
}
