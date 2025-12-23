
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { storageService } from './services/storageService';
import { Invoice, InvoiceStatus, LineItem } from './types';
import { APP_NAME, CURRENCY } from './constants';
import { geminiService } from './services/geminiService';
import { pdfService } from './services/pdfService';
import LivePreview from './components/LivePreview';
import StatusBadge from './components/StatusBadge';
import {
  Plus,
  Settings as SettingsIcon,
  Sparkles,
  Download,
  Trash2,
  FileText,
  History,
  X,
  ArrowRight,
  Loader2,
  Check,
  Smartphone,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import Settings from './pages/Settings';
import PublicInvoice from './pages/PublicInvoice';
import InvoiceDetail from './pages/InvoiceDetail';

const ThemeToggle = () => {
  const [theme, setTheme] = useState(() => localStorage.getItem('tewomi_theme') || 'system');

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const isDark = theme === 'dark' || (theme === 'system' && mediaQuery.matches);
      root.classList.toggle('dark', isDark);
      localStorage.setItem('tewomi_theme', theme);
    };

    applyTheme();

    // Listen for system theme changes if in system mode
    const handleChange = () => {
      if (theme === 'system') applyTheme();
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const themes = [
    { id: 'light', icon: Sun, label: 'Light' },
    { id: 'dark', icon: Moon, label: 'Dark' },
    { id: 'system', icon: Monitor, label: 'System' },
  ];

  return (
    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          className={`p-1.5 rounded-lg transition-all ${theme === t.id
            ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          title={t.label}
        >
          <t.icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(() => storageService.getUser());
  const [showSettings, setShowSettings] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parserInput, setParserInput] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);


  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const [activeInvoice, setActiveInvoice] = useState<Invoice>(() => ({
    id: generateId(),
    invoiceNumber: storageService.getNextInvoiceNumber(),
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: InvoiceStatus.DRAFT,
    business: user.businessProfile,
    client: { name: '', email: '' },
    items: [{ id: generateId(), description: '', quantity: 1, unitPrice: 0, total: 0 }],
    subtotal: 0,
    total: 0
  }));

  useEffect(() => {
    setInvoices(storageService.getInvoices().slice(0, 5));

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (window.innerWidth < 768) {
        setShowInstallBanner(true);
      }
    });

    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    });
  }, []);

  useEffect(() => {
    if (!showSettings) {
      const updatedUser = storageService.getUser();
      setUser(updatedUser);
      setActiveInvoice(prev => ({
        ...prev,
        business: updatedUser.businessProfile,
        invoiceNumber: prev.invoiceNumber === 'INV-001' && storageService.getInvoices().length > 0
          ? storageService.getNextInvoiceNumber()
          : prev.invoiceNumber
      }));
      setInvoices(storageService.getInvoices().slice(0, 5));
    }
  }, [showSettings]);

  const calculateTotals = (items: LineItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    return { subtotal, total: subtotal };
  };

  const handleManualUpdate = (field: string, value: any) => {
    setActiveInvoice(prev => {
      const newState = { ...prev };
      if (field.includes('client.')) {
        newState.client = { ...newState.client, [field.split('.')[1]]: value };
      } else {
        (newState as any)[field] = value;
      }
      return newState;
    });
  };

  const handleItemUpdate = (id: string, field: keyof LineItem, value: any) => {
    setActiveInvoice(prev => {
      const newItems = prev.items.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          updated.total = (updated.quantity || 0) * (updated.unitPrice || 0);
          return updated;
        }
        return item;
      });
      const { subtotal, total } = calculateTotals(newItems);
      return { ...prev, items: newItems, subtotal, total };
    });
  };

  const handleSmartParse = async () => {
    if (!parserInput.trim()) return;
    setIsParsing(true);
    try {
      const result = await geminiService.parseWorkDescription(parserInput);
      const newItems = (result.items || []).map(item => ({
        id: generateId(),
        description: item.description || 'Work',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        total: (item.quantity || 1) * (item.unitPrice || 0)
      }));
      const { subtotal, total } = calculateTotals(newItems);

      setActiveInvoice(prev => ({
        ...prev,
        client: { ...prev.client, name: result.clientName || prev.client.name },
        items: newItems.length > 0 ? newItems : prev.items,
        subtotal: newItems.length > 0 ? subtotal : prev.subtotal,
        total: newItems.length > 0 ? total : prev.total
      }));
      setParserInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleSaveAndDownload = () => {
    if (activeInvoice.business.accountNumber.length !== 10) {
      alert("Please update your account number to 10 digits in Settings.");
      setShowSettings(true);
      return;
    }
    storageService.saveInvoice(activeInvoice);
    pdfService.generateInvoicePDF(activeInvoice);
    setInvoices(storageService.getInvoices().slice(0, 5));

    if (deferredPrompt) setShowInstallBanner(true);

    setActiveInvoice({
      id: generateId(),
      invoiceNumber: storageService.getNextInvoiceNumber(),
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: InvoiceStatus.DRAFT,
      business: user.businessProfile,
      client: { name: '', email: '' },
      items: [{ id: generateId(), description: '', quantity: 1, unitPrice: 0, total: 0 }],
      subtotal: 0,
      total: 0
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-200">
      {showInstallBanner && deferredPrompt && (
        <div className="bg-indigo-600 text-white p-4 flex items-center justify-between sticky top-0 z-[60] shadow-lg animate-in fade-in slide-in-from-top duration-500">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5" />
            <p className="text-sm font-medium">Install Tewómi for a better experience</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowInstallBanner(false)} className="text-xs font-bold uppercase tracking-widest opacity-70">Later</button>
            <button onClick={handleInstallApp} className="bg-white text-indigo-600 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest">Install</button>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-md" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 h-full shadow-2xl p-8 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Business Profile</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-500 dark:text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <Settings />
            <button
              onClick={() => setShowSettings(false)}
              className="w-full mt-8 bg-slate-900 dark:bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-indigo-700 transition shadow-xl"
            >
              <Check className="w-5 h-5" /> Save & Close
            </button>
          </div>
        </div>
      )}

      <header className="px-6 h-20 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            {/* Mobile: Show 'Mark' logo */}
            <img src="/logo-mobile-light.png" alt="Tewómi" className="h-8 w-auto dark:hidden sm:hidden" />
            <img src="/logo-mobile-dark.png" alt="Tewómi" className="h-8 w-auto hidden dark:block dark:sm:hidden" />

            {/* Desktop: Show 'Full' logo */}
            <img src="/logo-desktop-light.png" alt="Tewómi" className="h-8 w-auto hidden sm:block dark:hidden" />
            <img src="/logo-desktop-dark.png" alt="Tewómi" className="h-8 w-auto hidden dark:sm:block" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            onClick={() => setShowSettings(true)}
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm text-slate-600 dark:text-slate-300 flex items-center gap-2 font-bold text-sm"
          >
            <SettingsIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 py-8">
        <div className="lg:col-span-7 space-y-12 pb-20">
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-black uppercase text-[10px] tracking-widest">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h2>New Billing Task</h2>
            </div>
            <div className="relative group">
              <textarea
                value={parserInput}
                onChange={(e) => setParserInput(e.target.value)}
                placeholder="Bill Kola 50k for Logo Design..."
                className="w-full h-36 p-6 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-3xl focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-0 outline-none transition text-xl resize-none shadow-sm text-slate-900 dark:text-slate-100 font-medium placeholder-slate-400 dark:placeholder-slate-600"
              />
              <button
                onClick={handleSmartParse}
                disabled={isParsing || !parserInput.trim()}
                className="absolute bottom-5 right-5 bg-slate-900 dark:bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2 shadow-xl"
              >
                {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                <span>Parse</span>
              </button>
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-xl space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Client</label>
                <input
                  type="text"
                  value={activeInvoice.client.name}
                  onChange={(e) => handleManualUpdate('client.name', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 rounded-2xl p-4 outline-none text-slate-900 dark:text-slate-100 font-bold transition-all"
                  placeholder="e.g. Ajani Baba Ajala"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Email</label>
                <input
                  type="email"
                  value={activeInvoice.client.email}
                  onChange={(e) => handleManualUpdate('client.email', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 rounded-2xl p-4 outline-none text-slate-900 dark:text-slate-100 font-bold transition-all"
                  placeholder="Ajani@example.com"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Work Items</label>
                <button
                  onClick={() => setActiveInvoice(prev => ({ ...prev, items: [...prev.items, { id: generateId(), description: '', quantity: 1, unitPrice: 0, total: 0 }] }))}
                  className="text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-3 py-1.5 rounded-lg transition"
                >
                  + Add Row
                </button>
              </div>
              <div className="space-y-4">
                {activeInvoice.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 items-center group">
                    <div className="col-span-7">
                      <input
                        type="text"
                        placeholder="What are you billing for?"
                        value={item.description}
                        onChange={(e) => handleItemUpdate(item.id, 'description', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 rounded-xl p-3.5 text-sm outline-none text-slate-900 dark:text-slate-100 transition-all"
                      />
                    </div>
                    <div className="col-span-4">
                      <div className="relative">
                        <span className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-600 text-sm font-bold">{CURRENCY}</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={item.unitPrice === 0 ? '' : item.unitPrice}
                          onChange={(e) => handleItemUpdate(item.id, 'unitPrice', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                          className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 rounded-xl p-3.5 pl-10 text-sm outline-none font-bold text-slate-900 dark:text-slate-100 transition-all"
                        />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <button
                        onClick={() => {
                          setActiveInvoice(prev => {
                            const nextItems = prev.items.filter(i => i.id !== item.id);
                            if (nextItems.length === 0) return prev;
                            const { subtotal, total } = calculateTotals(nextItems);
                            return { ...prev, items: nextItems, subtotal, total };
                          });
                        }}
                        className="p-2 text-slate-300 dark:text-slate-700 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="flex flex-col sm:flex-row gap-6">
            <button
              onClick={handleSaveAndDownload}
              className="flex-1 bg-slate-900 dark:bg-indigo-600 text-white py-6 rounded-3xl font-black text-xl hover:bg-slate-800 dark:hover:bg-indigo-700 transition flex items-center justify-center gap-4 shadow-2xl shadow-indigo-200 dark:shadow-none uppercase tracking-widest"
            >
              <Download className="w-6 h-6" />
              <span>Bill & Download</span>
            </button>
          </div>

          {invoices.length > 0 && (
            <section className="pt-16 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-600 mb-8 font-black uppercase text-[10px] tracking-widest">
                <History className="w-5 h-5" />
                <h2>Billing History</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {invoices.map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => navigate(`/invoice/${inv.id}`)}
                    className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900 hover:shadow-2xl transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="space-y-2">
                      <p className="font-black text-slate-900 dark:text-slate-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{inv.client.name || 'Untitled'}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-2 uppercase font-bold tracking-widest">
                        <FileText className="w-3 h-3" /> {inv.invoiceNumber}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-3 py-1">
                      <p className="font-black text-slate-900 dark:text-slate-50 text-xl leading-none">{CURRENCY}{inv.total.toLocaleString()}</p>
                      <StatusBadge status={inv.status} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="hidden lg:block lg:col-span-5">
          <div className="sticky top-24">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">Real-time Preview</p>
            <LivePreview invoice={activeInvoice} />
          </div>
        </div>
      </main>

      <footer className="p-12 text-center text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">
        Tewómi Invoicer &bull; Built by <a href="https://bio.workwithbola.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 dark:hover:text-slate-400 underline decoration-dotted underline-offset-4 transition">Bola Olaniyan</a> &bull; Nigeria 🇳🇬
      </footer>

      {/* Invoice Drawer / Modal */}
      {location.pathname.includes('/invoice/') && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => navigate('/')}
          />
          <div className="fixed inset-y-0 right-0 z-[101] w-full max-w-lg bg-white shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex-1 overflow-y-auto">
              <InvoiceDetail />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />}>
          <Route path="invoice/:id" element={<Home />} />
        </Route>
        <Route path="/public/:id" element={<PublicInvoice />} />
        <Route path="/settings" element={<Home />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
