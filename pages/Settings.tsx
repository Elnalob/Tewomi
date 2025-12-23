
import React, { useState } from 'react';
import { storageService } from '../services/storageService';
import { BusinessProfile } from '../types';
import { Save, Building2, CreditCard, Mail, CheckCircle2 } from 'lucide-react';

const Settings: React.FC = () => {
  const user = storageService.getUser();
  const [profile, setProfile] = useState<BusinessProfile>(user.businessProfile);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    storageService.saveUser({
      ...user,
      businessProfile: profile
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Business Settings</h1>
        <p className="text-gray-500">Update your business information and banking details for invoices.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900 border-b pb-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              General Information
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Business Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900 border-b pb-2">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              Banking Details (Payment Instructions)
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Bank Name</label>
                <input
                  type="text"
                  required
                  value={profile.bankName}
                  onChange={(e) => setProfile({ ...profile, bankName: e.target.value })}
                  className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                  placeholder="e.g. GTBank, Zenith Bank"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Account Number</label>
                  <input
                    type="text"
                    required
                    value={profile.accountNumber}
                    onChange={(e) => setProfile({ ...profile, accountNumber: e.target.value })}
                    className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-slate-900"
                    placeholder="0123456789"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Account Name</label>
                  <input
                    type="text"
                    required
                    value={profile.accountName}
                    onChange={(e) => setProfile({ ...profile, accountName: e.target.value })}
                    className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                    placeholder="The name on the bank account"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          {saved && (
            <span className="flex items-center gap-1.5 text-green-600 font-medium animate-in fade-in slide-in-from-left-2">
              <CheckCircle2 className="w-4 h-4" /> Changes saved successfully!
            </span>
          )}
          <button
            type="submit"
            className="ml-auto bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transform hover:-translate-y-0.5 transition shadow-lg shadow-indigo-100 flex items-center gap-2"
          >
            <Save className="w-5 h-5" /> Save Profile
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
