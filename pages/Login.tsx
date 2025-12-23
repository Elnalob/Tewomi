
import React, { useState } from 'react';
import { storageService } from '../services/storageService';
import { APP_NAME } from '../constants';
import { Mail, Lock, Loader2 } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate auth delay
    setTimeout(() => {
      storageService.login();
      onLogin();
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-gray-100 dark:border-slate-800 p-10 space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-[20px] text-white font-black text-3xl mb-4 shadow-lg shadow-indigo-200 dark:shadow-none">
            T
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-slate-50 tracking-tighter uppercase">{APP_NAME}</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-2 font-medium">Freelance billing made simple.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500 group-focus-within:text-indigo-600 transition-colors pointer-events-none" />
              <input
                type="email"
                required
                className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-950 transition-all outline-none font-bold text-gray-900 dark:text-slate-100"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500 group-focus-within:text-indigo-600 transition-colors pointer-events-none" />
              <input
                type="password"
                required
                className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-950 transition-all outline-none font-bold text-gray-900 dark:text-slate-100"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm hover:bg-slate-800 dark:hover:bg-indigo-700 transform hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-xl shadow-slate-200 dark:shadow-none disabled:opacity-70 disabled:transform-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Authenticating...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="text-center text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-widest">
          <p>Solo hussle starts here. <span className="text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline">Register now</span></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
