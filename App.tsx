
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { storageService } from './services/storageService';
import { Invoice, InvoiceStatus, LineItem } from './types';
import { APP_NAME, TAX_RATE, CURRENCY } from './constants';
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
  Check
} from 'lucide-react';
import Settings from './pages/Settings';
import PublicInvoice from './pages/PublicInvoice';
// Fix: Added missing import for InvoiceDetail component
import InvoiceDetail from './pages/InvoiceDetail';

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => storageService.getUser());
  const [showSettings, setShowSettings] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parserInput, setParserInput] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [activeInvoice, setActiveInvoice] = useState<Invoice>(() => ({
    id: crypto.randomUUID(),
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: InvoiceStatus.DRAFT,
    business: user.businessProfile,
    client: { name: '', email: '' },
    items: [{ id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, total: 0 }],
    subtotal: 0,
    tax: 0,
    total: 0,
    notes: ''
  }));

  useEffect(() => {
    setInvoices(storageService.getInvoices().slice(0, 5));
  }, []);

  // Sync business profile changes and refresh history when settings close
  useEffect(() => {
    if (!showSettings) {
      const updatedUser = storageService.getUser();
      setUser(updatedUser);
      setActiveInvoice(prev => ({ ...prev, business: updatedUser.businessProfile }));
      setInvoices(storageService.getInvoices().slice(0, 5));
    }
  }, [showSettings]);

  const calculateTotals = (items: LineItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    return { subtotal, tax, total };
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
      const { subtotal, tax, total } = calculateTotals(newItems);
      return { ...prev, items: newItems, subtotal, tax, total };
    });
  };

  const handleSmartParse = async () => {
    if (!parserInput.trim()) return;
    setIsParsing(true);
    try {
      const result = await geminiService.parseWorkDescription(parserInput);
      const newItems = (result.items || []).map(item => ({
        id: crypto.randomUUID(),
        description: item.description || 'Work',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        total: (item.quantity || 1) * (item.unitPrice || 0)
      }));
      const { subtotal, tax, total } = calculateTotals(newItems);
      
      setActiveInvoice(prev => ({
        ...prev,
        client: { ...prev.client, name: result.clientName || prev.client.name },
        items: newItems.length > 0 ? newItems : prev.items,
        subtotal: newItems.length > 0 ? subtotal : prev.subtotal,
        tax: newItems.length > 0 ? tax : prev.tax,
        total: newItems.length > 0 ? total : prev.total
      }));
      setParserInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveAndDownload = () => {
    storageService.saveInvoice(activeInvoice);
    pdfService.generateInvoicePDF(activeInvoice);
    setInvoices(storageService.getInvoices().slice(0, 5));
    setActiveInvoice({
      id: crypto.randomUUID(),
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: InvoiceStatus.DRAFT,
      business: user.businessProfile,
      client: { name: '', email: '' },
      items: [{ id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, total: 0 }],
      subtotal: 0,
      tax: 0,
      total: 0
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Settings Modal Overlay */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl p-8 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-slate-900">Your Business Details</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 rounded-full transition"><X className="w-5 h-5" /></button>
            </div>
            <Settings />
            <button 
              onClick={() => setShowSettings(false)}
              className="w-full mt-8 bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition"
            >
              <Check className="w-4 h-4" /> Save & Close
            </button>
          </div>
        </div>
      )}

      {/* Nav */}
      <header className="px-6 h-20 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-lg">T</div>
          <span className="font-black text-2xl tracking-tighter text-slate-900">Tèwómí</span>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm text-slate-600 flex items-center gap-2 font-medium"
        >
          <SettingsIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Settings</span>
        </button>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 py-8">
        
        {/* Input Column */}
        <div className="lg:col-span-7 space-y-12 pb-20">
          
          {/* Parser Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h2>Tell Tèwómí what to bill</h2>
            </div>
            <div className="relative group">
              <textarea 
                value={parserInput}
                onChange={(e) => setParserInput(e.target.value)}
                placeholder="Bill Kola 50k for Logo Design..."
                className="w-full h-32 p-5 bg-white border-2 border-slate-200 rounded-2xl focus:border-slate-900 focus:ring-0 outline-none transition text-lg resize-none shadow-sm text-slate-900"
              />
              <button 
                onClick={handleSmartParse}
                disabled={isParsing || !parserInput.trim()}
                className="absolute bottom-4 right-4 bg-slate-900 text-white px-5 py-2 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition flex items-center gap-2 shadow-lg"
              >
                {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>Parse</span>
              </button>
            </div>
          </section>

          {/* Form Fields */}
          <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Client Name</label>
                <input 
                  type="text" 
                  value={activeInvoice.client.name}
                  onChange={(e) => handleManualUpdate('client.name', e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-slate-900 outline-none text-slate-900 font-medium"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Client Email</label>
                <input 
                  type="email" 
                  value={activeInvoice.client.email}
                  onChange={(e) => handleManualUpdate('client.email', e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-slate-900 outline-none text-slate-900 font-medium"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Work Items</label>
                <button 
                  onClick={() => setActiveInvoice(prev => ({...prev, items: [...prev.items, {id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, total: 0}]}))}
                  className="text-indigo-600 font-bold text-[10px] uppercase tracking-widest hover:underline"
                >
                  + Add Item
                </button>
              </div>
              {activeInvoice.items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-3 items-center group">
                  <div className="col-span-7">
                    <input 
                      type="text" 
                      placeholder="Description" 
                      value={item.description}
                      onChange={(e) => handleItemUpdate(item.id, 'description', e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
                    />
                  </div>
                  <div className="col-span-4">
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-slate-400 text-sm font-bold">{CURRENCY}</span>
                      <input 
                        type="number" 
                        placeholder="0" 
                        value={item.unitPrice === 0 ? '' : item.unitPrice}
                        onChange={(e) => handleItemUpdate(item.id, 'unitPrice', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        className="w-full bg-slate-50 border-none rounded-xl p-3 pl-8 text-sm outline-none focus:ring-1 focus:ring-slate-900 font-bold text-slate-900"
                      />
                    </div>
                  </div>
                  <div className="col-span-1">
                    <button 
                      onClick={() => {
                        setActiveInvoice(prev => {
                          const nextItems = prev.items.filter(i => i.id !== item.id);
                          if(nextItems.length === 0) return prev;
                          const {subtotal, tax, total} = calculateTotals(nextItems);
                          return {...prev, items: nextItems, subtotal, tax, total};
                        });
                      }}
                      className="p-2 text-slate-300 hover:text-red-500 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={handleSaveAndDownload}
              className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition flex items-center justify-center gap-3 shadow-xl shadow-slate-200"
            >
              <Download className="w-5 h-5" />
              <span>Generate & Download</span>
            </button>
          </div>

          {/* Simple History */}
          {invoices.length > 0 && (
            <section className="pt-12 border-t border-slate-200">
              <div className="flex items-center gap-2 text-slate-400 mb-6 font-bold uppercase text-[10px] tracking-widest">
                <History className="w-4 h-4" />
                <h2>Recent Tèwómí Invoices</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {invoices.map((inv) => (
                  <div 
                    key={inv.id}
                    onClick={() => navigate(`/invoice/${inv.id}`)}
                    className="p-4 bg-white rounded-2xl border border-slate-100 hover:border-slate-300 hover:shadow-md transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{inv.client.name || 'Untitled'}</p>
                      <p className="text-xs text-slate-400">{inv.issueDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900">{CURRENCY}{inv.total.toLocaleString()}</p>
                      <StatusBadge status={inv.status} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>

        {/* Preview Column */}
        <div className="hidden lg:block lg:col-span-5">
          <div className="sticky top-24">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Live Preview</p>
            <LivePreview invoice={activeInvoice} />
          </div>
        </div>

      </main>

      <footer className="p-8 text-center text-slate-400 text-xs font-medium">
        Tèwómí Invoicer &bull; Instantly get paid &bull; Built for solo-stars
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Navigate to="/" />} />
        <Route path="/invoice/:id" element={<div className="bg-slate-50 min-h-screen p-8"><InvoiceDetail /></div>} />
        <Route path="/public/:id" element={<PublicInvoice />} />
        <Route path="/settings" element={<Home />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
