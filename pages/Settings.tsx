
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { storageService } from '../services/storageService';
import { BusinessProfile } from '../types';
import {
  Building2, CreditCard, Mail, CheckCircle2,
  AlertCircle, CloudCheck, ImagePlus, Trash2, Upload
} from 'lucide-react';

// ── Logo Upload Helpers ──────────────────────────────────────────────────────

/** Max width (px) for the stored logo after client-side canvas resize */
const MAX_LOGO_WIDTH = 300;

/**
 * Reads a File, scales it to MAX_LOGO_WIDTH on a canvas, and returns a
 * base64-encoded JPEG/PNG/WebP data URL — ready for localStorage.
 */
const resizeAndConvertToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate scaled dimensions
        const scale = Math.min(1, MAX_LOGO_WIDTH / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext('2d')!;
        // White background so transparent PNGs look clean
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Output as WebP for max compression; fall back to PNG
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(mimeType, 0.85));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// ── Logo Upload Card Component ───────────────────────────────────────────────

const LogoUploadCard: React.FC = () => {
  const [logo, setLogo] = useState<string | null>(storageService.getLogo());
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Process an image file: resize → base64 → save to localStorage */
  const processFile = useCallback(async (file: File) => {
    // Validate type
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      alert('Please upload a PNG, JPEG, or WebP image.');
      return;
    }
    // Warn if file is very large (>2 MB before resize)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image is larger than 2 MB — it will be compressed automatically.');
    }
    setUploading(true);
    try {
      const base64 = await resizeAndConvertToBase64(file);
      storageService.saveLogo(base64);
      setLogo(base64);
      // Notify other components (e.g. LivePreview) in the same tab
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'tewomi_merchant_logo',
        newValue: base64
      }));
    } catch {
      alert('Failed to process image. Please try another file.');
    } finally {
      setUploading(false);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so the same file can be re-uploaded
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRemove = () => {
    storageService.removeLogo();
    setLogo(null);
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'tewomi_merchant_logo',
      newValue: null
    }));
  };

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-3 font-black text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-4 uppercase text-[10px] tracking-[0.2em]">
        <ImagePlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        Brand Logo
      </h3>

      {logo ? (
        /* ── Logo Preview ── */
        <div className="flex items-center gap-6">
          <div className="relative flex-shrink-0 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-slate-100 dark:border-slate-800">
            <img
              src={logo}
              alt="Brand logo preview"
              className="h-16 w-auto max-w-[150px] object-contain"
            />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Logo saved ✓ — it will appear on all invoices.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
              >
                <Upload className="w-3.5 h-3.5" />
                Replace
              </button>
              <button
                onClick={handleRemove}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-900/30 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove Logo
              </button>
            </div>
          </div>
          {/* Hidden file input for replace */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
            aria-label="Replace brand logo"
          />
        </div>
      ) : (
        /* ── Upload Drop Zone ── */
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          aria-label="Upload brand logo"
          className={`relative flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all
            ${isDragging
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
              : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
        >
          {uploading ? (
            <>
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Processing…</p>
            </>
          ) : (
            <>
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl">
                <ImagePlus className="w-8 h-8 text-indigo-500" />
              </div>
              <div className="text-center">
                <p className="font-black text-slate-700 dark:text-slate-300 text-sm">
                  Drop your logo here, or click to browse
                </p>
                <p className="text-slate-400 dark:text-slate-600 text-xs mt-1">
                  PNG, JPEG, or WebP · Max 300px wide after resize
                </p>
              </div>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
            aria-label="Upload brand logo"
          />
        </div>
      )}
    </div>
  );
};

// ── Main Settings Component ──────────────────────────────────────────────────

const Settings: React.FC = () => {
  const user = storageService.getUser();
  const [profile, setProfile] = useState<BusinessProfile>(user.businessProfile);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setStatus('saving');

    if (profile.accountNumber.length > 0 && profile.accountNumber.length !== 10) {
      setError("Account number must be 10 digits.");
    } else {
      setError(null);
    }

    storageService.saveUser({
      ...user,
      businessProfile: profile
    });

    const timer = setTimeout(() => {
      setStatus('saved');
    }, 400);

    return () => clearTimeout(timer);
  }, [profile]);

  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setProfile(prev => ({ ...prev, accountNumber: value }));
  };

  const handleChange = (field: keyof BusinessProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-full space-y-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex-1">
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Business Profile</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Changes sync automatically to your device.</p>
        </div>
        {/* Auto-save status indicator */}
        <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-all duration-300 flex-nowrap whitespace-nowrap shadow-sm border border-slate-200 dark:border-slate-700">
          {status === 'saving' && (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
              <span>Saving...</span>
            </>
          )}
          {status === 'saved' && (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-green-600 dark:text-green-400">All Changes Saved</span>
            </>
          )}
          {status === 'idle' && (
            <>
              <CloudCheck className="w-4 h-4 text-slate-400 dark:text-slate-600" />
              <span>System Synced</span>
            </>
          )}
        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-xl p-8 space-y-10 transition-colors">

          {/* ── Logo Upload Section ── */}
          <LogoUploadCard />

          {/* ── General Info ── */}
          <div className="space-y-6">
            <h3 className="flex items-center gap-3 font-black text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-4 uppercase text-[10px] tracking-[0.2em]">
              <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              General Info
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 rounded-2xl outline-none text-slate-900 dark:text-slate-100 font-bold transition-all"
                  placeholder="Your Brand"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                  Support Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-600 pointer-events-none" />
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 rounded-2xl outline-none text-slate-900 dark:text-slate-100 font-bold transition-all"
                    placeholder="hello@company.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                  Business Address
                </label>
                <input
                  type="text"
                  value={profile.address || ''}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 rounded-2xl outline-none text-slate-900 dark:text-slate-100 font-bold transition-all"
                  placeholder="e.g. 15, Example Street, Lagos"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                  Business Phone
                </label>
                <input
                  type="tel"
                  value={profile.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 rounded-2xl outline-none text-slate-900 dark:text-slate-100 font-bold transition-all"
                  placeholder="e.g. 08012345678"
                />
              </div>
            </div>

            {/* ── AI Config ── */}
            <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <h3 className="flex items-center gap-3 font-black text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-[0.2em]">
                AI Configuration
              </h3>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                  Gemini API Key (Backup)
                </label>
                <input
                  type="password"
                  value={profile.geminiApiKey || ''}
                  onChange={(e) => handleChange('geminiApiKey', e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 rounded-2xl outline-none text-slate-900 dark:text-slate-100 font-bold transition-all"
                  placeholder="Enter API Key if parsing fails"
                />
                <p className="text-[9px] text-slate-500 mt-1 ml-1">Optional. Use this if the system default key is not working.</p>
              </div>
            </div>

            {/* ── Currency ── */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                Currency
              </label>
              <select
                value={profile.currency || '₦'}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 rounded-2xl outline-none text-slate-900 dark:text-slate-100 font-bold transition-all cursor-pointer"
              >
                <option value="₦">₦ - Nigerian Naira</option>
                <option value="$">$ - US Dollar</option>
                <option value="€">€ - Euro</option>
                <option value="£">£ - British Pound</option>
                <option value="¥">¥ - Japanese Yen</option>
              </select>
            </div>
          </div>

          {/* ── Bank Settlement ── */}
          <div className="space-y-6 pt-6">
            <h3 className="flex items-center gap-3 font-black text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-4 uppercase text-[10px] tracking-[0.2em]">
              <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Bank Settlement
            </h3>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={profile.bankName}
                  onChange={(e) => handleChange('bankName', e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 rounded-2xl outline-none text-slate-900 dark:text-slate-100 font-bold transition-all"
                  placeholder="e.g. Zenith Bank"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={profile.accountNumber}
                    onChange={handleAccountNumberChange}
                    className={`w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 rounded-2xl outline-none font-mono text-slate-900 dark:text-slate-100 font-black text-lg transition-all ${error
                      ? 'border-red-500 focus:border-red-600'
                      : 'border-transparent focus:border-indigo-600 dark:focus:border-indigo-500'
                    }`}
                    placeholder="0123456789"
                    inputMode="numeric"
                  />
                  {error && (
                    <p className="mt-2 flex items-center gap-2 text-[10px] font-black text-red-500 uppercase tracking-wider">
                      <AlertCircle className="w-4 h-4" /> {error}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                    Account Holder
                  </label>
                  <input
                    type="text"
                    value={profile.accountName}
                    onChange={(e) => handleChange('accountName', e.target.value)}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 rounded-2xl outline-none text-slate-900 dark:text-slate-100 font-bold transition-all"
                    placeholder="Full Registered Name"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Auto-Sync Notice ── */}
        <div className="p-6 bg-indigo-50 dark:bg-indigo-950/30 rounded-[24px] border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-4 transition-colors">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
            <CloudCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-sm text-indigo-900 dark:text-indigo-200 font-medium leading-snug">
            <strong>Auto-Sync Active.</strong> Tewómi ensures your data is persisted locally and ready for your next bill instantly.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
