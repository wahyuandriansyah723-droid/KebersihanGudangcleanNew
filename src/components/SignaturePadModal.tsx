import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  PenTool,
  RotateCcw,
  Upload,
  Sparkles,
  Check,
  Download,
  Trash2,
  HelpCircle,
  FileCheck2
} from 'lucide-react';

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
  title?: string;
  subtitle?: string;
  initialSignature?: string;
  signerName?: string;
}

export default function SignaturePadModal({
  isOpen,
  onClose,
  onSave,
  title = 'Bubuhkan Tanda Tangan Digital',
  subtitle = 'Tanda tangan langsung pada kanvas di bawah menggunakan mouse atau layar sentuh.',
  initialSignature = '',
  signerName = 'Nama Penandatangan'
}: SignaturePadModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState<string>('#1e3a8a'); // dark blue ink
  const [penWidth, setPenWidth] = useState<number>(2.5);

  useEffect(() => {
    if (isOpen) {
      // Small timeout to ensure DOM is ready
      const timer = setTimeout(() => {
        initCanvas();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialSignature]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2; // retina scaling
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Clear background (transparent)
    ctx.clearRect(0, 0, rect.width, rect.height);

    // If initial signature exists, render it
    if (initialSignature && initialSignature.startsWith('data:image')) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawn(true);
      };
      img.src = initialSignature;
    } else {
      setHasDrawn(false);
    }
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ('touches' in e) {
      e.preventDefault(); // prevent scroll on touch
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if ('touches' in e) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.closePath();
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  // Generate stylized signature based on signer's name
  const handleAutoGenerateSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;

    const initials = signerName
      .split(' ')
      .filter(w => w.length > 0)
      .map(w => w[0].toUpperCase())
      .join('');

    const startX = rect.width * 0.2;
    const startY = rect.height * 0.55;

    // Draw stylized signature loops
    ctx.beginPath();
    ctx.moveTo(startX, startY);

    // Initial flourish
    ctx.bezierCurveTo(startX - 20, startY - 40, startX + 30, startY - 45, startX + 40, startY - 10);
    ctx.bezierCurveTo(startX + 50, startY + 25, startX + 20, startY + 30, startX + 45, startY + 5);
    
    // Middle loops
    ctx.bezierCurveTo(startX + 70, startY - 30, startX + 90, startY + 20, startX + 110, startY - 15);
    ctx.bezierCurveTo(startX + 130, startY - 35, startX + 150, startY + 15, startX + 175, startY - 5);
    
    // Trailing underline swoop
    ctx.bezierCurveTo(startX + 200, startY - 20, startX + 220, startY + 10, startX + 250, startY - 10);
    ctx.moveTo(startX + 10, startY + 22);
    ctx.quadraticCurveTo(startX + 140, startY + 32, startX + 270, startY + 15);
    ctx.stroke();
    ctx.closePath();

    setHasDrawn(true);
  };

  // Handle upload signature image
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();

        ctx.clearRect(0, 0, rect.width, rect.height);
        
        // Fit image nicely into canvas keeping aspect ratio
        const scale = Math.min((rect.width - 20) / img.width, (rect.height - 20) / img.height);
        const x = (rect.width - img.width * scale) / 2;
        const y = (rect.height - img.height * scale) / 2;

        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        setHasDrawn(true);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!hasDrawn) {
      onSave('');
      onClose();
      return;
    }

    // Export as transparent PNG Data URL
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-lg bg-[#0f1016] border border-zinc-800/90 rounded-2xl shadow-2xl z-10 flex flex-col overflow-hidden font-sans"
        id="signature-pad-modal-root"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-900 bg-zinc-950/40">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base font-display tracking-tight">
                {title}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Color Selectors */}
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-zinc-400 font-medium">Tinta:</span>
              <button
                type="button"
                onClick={() => setPenColor('#1e3a8a')}
                className={`w-6 h-6 rounded-full bg-blue-900 border-2 transition-all cursor-pointer ${
                  penColor === '#1e3a8a' ? 'border-emerald-400 scale-110' : 'border-zinc-700'
                }`}
                title="Tinta Biru Resmi"
              />
              <button
                type="button"
                onClick={() => setPenColor('#09090b')}
                className={`w-6 h-6 rounded-full bg-zinc-950 border-2 transition-all cursor-pointer ${
                  penColor === '#09090b' ? 'border-emerald-400 scale-110' : 'border-zinc-700'
                }`}
                title="Tinta Hitam Klasik"
              />
              <button
                type="button"
                onClick={() => setPenColor('#065f46')}
                className={`w-6 h-6 rounded-full bg-emerald-800 border-2 transition-all cursor-pointer ${
                  penColor === '#065f46' ? 'border-emerald-400 scale-110' : 'border-zinc-700'
                }`}
                title="Tinta Hijau Emerald"
              />
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleAutoGenerateSignature}
                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                title="Buat goresan paraf tanda tangan otomatis"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Paraf Otomatis</span>
              </button>

              <label className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Unggah</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleClear}
                className="px-2.5 py-1 bg-zinc-900 hover:bg-rose-950/30 text-rose-400 border border-zinc-800 hover:border-rose-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                title="Bersihkan kanvas"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            </div>
          </div>

          {/* Interactive Canvas Box */}
          <div className="relative bg-white rounded-xl border-2 border-dashed border-zinc-700 p-2 shadow-inner overflow-hidden">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-44 cursor-crosshair touch-none bg-transparent"
              id="canvas-signature-pad"
            />

            {/* Subtle guidelines inside canvas */}
            <div className="absolute inset-x-6 bottom-7 border-b border-zinc-300 pointer-events-none flex justify-between items-center text-[10px] text-zinc-400 select-none">
              <span>Tanda Tangan Digital</span>
              <span className="font-semibold text-zinc-500">{signerName}</span>
            </div>

            {!hasDrawn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-zinc-400 space-y-1">
                <PenTool className="w-6 h-6 text-zinc-300" />
                <span className="text-xs font-medium">Goreskan tanda tangan Anda di sini</span>
              </div>
            )}
          </div>

          <div className="text-[11px] text-zinc-400 flex items-center justify-between">
            <span>Penandatangan: <strong className="text-white">{signerName}</strong></span>
            <span className="text-zinc-500">Format: Transparan PNG Resmi</span>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-900 bg-zinc-950/40 flex justify-end space-x-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSaveSignature}
            className="inline-flex items-center space-x-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
          >
            <Check className="w-4 h-4" />
            <span>Terapkan Tanda Tangan</span>
          </button>
        </div>

      </motion.div>
    </div>
  );
}
