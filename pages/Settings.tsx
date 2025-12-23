
import React, { useState, useEffect, useRef } from 'react';
import { storageService } from '../services/storageService';
import { BusinessProfile } from '../types';
import { Building2, CreditCard, Mail, CheckCircle2, AlertCircle, CloudCheck } from 'lucide-react';

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex-1">
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Business Profile</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Changes sync automatically to your device.</p>
        </div>
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
        <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-xl p-8 space-y-8 transition-colors">
          <div className="space-y-6">
            <h3 className="flex items-center gap-3 font-black text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-4 uppercase text-[10px] tracking-[0.2em]">
              <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              General Info
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Business Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 rounded-2xl outline-none text-slate-900 dark:text-slate-100 font-bold transition-all"
                  placeholder="Your Brand"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Support Email</label>
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
            </div>
          </div>

          <div className="space-y-6 pt-6">
            <h3 className="flex items-center gap-3 font-black text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-4 uppercase text-[10px] tracking-[0.2em]">
              <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Bank Settlement
            </h3>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Bank Name</label>
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
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Account Number</label>
                  <input
                    type="text"
                    value={profile.accountNumber}
                    onChange={handleAccountNumberChange}
                    className={`w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 rounded-2xl outline-none font-mono text-slate-900 dark:text-slate-100 font-black text-lg transition-all ${error ? 'border-red-500 focus:border-red-600' : 'border-transparent focus:border-indigo-600 dark:focus:border-indigo-500'}`}
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
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Account Holder</label>
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
