
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { storageService } from './services/storageService';
import { Invoice, InvoiceStatus, LineItem, BusinessProfile, SplitPayment, InvoiceDraft } from './types';
import { APP_NAME, CURRENCY, VAT_RATE } from './constants';
import { geminiService } from './services/geminiService';
import { pdfService } from './services/pdfService';
import LivePreview from './components/LivePreview';
import StatusBadge from './components/StatusBadge';
import Settings from './pages/Settings';
import PublicInvoice from './pages/PublicInvoice';
import InvoiceDetail from './pages/InvoiceDetail';
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
  Monitor,
  MessageCircle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Receipt
} from 'lucide-react';

// ── Theme Toggle ─────────────────────────────────────────────────────────────

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
    const handleChange = () => { if (theme === 'system') applyTheme(); };
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
          className={`p-2 rounded-lg transition-all min-w-[24px] min-h-[24px] flex items-center justify-center ${theme === t.id
            ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          title={t.label}
          aria-label={`Switch to ${t.label} theme`}
        >
          <t.icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
};

// ── VAT Toggle Switch ─────────────────────────────────────────────────────────

interface VatToggleProps {
  enabled: boolean;
  onChange: (val: boolean) => void;
}

const VatToggle: React.FC<VatToggleProps> = ({ enabled, onChange }) => (
  <div className="flex items-center justify-between px-5 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
    <div className="flex items-center gap-3">
      <div className={`p-1.5 rounded-lg transition-colors ${enabled ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
        <Receipt className={`w-4 h-4 ${enabled ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400'}`} />
      </div>
      <div>
        <p className="text-sm font-black text-slate-900 dark:text-slate-100">7.5% VAT</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
          {enabled ? 'Applied to subtotal' : 'Nigerian standard rate'}
        </p>
      </div>
    </div>
    {/* Toggle switch */}
    <button
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative w-12 h-6 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400 ${enabled
        ? 'bg-orange-500'
        : 'bg-slate-200 dark:bg-slate-700'
      }`}
      aria-label="Toggle 7.5% VAT"
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-0'}`}
      />
    </button>
  </div>
);

// ── WhatsApp Share Helper ─────────────────────────────────────────────────────

/**
 * Builds a polite, professionally localized WhatsApp message and
 * opens the wa.me deep-link in a new tab.
 */
const shareViaWhatsApp = (invoice: Invoice) => {
  const currency = invoice.business.currency || CURRENCY;
  const clientName = invoice.client.name || 'Valued Client';
  const bizName = invoice.business.name || 'Us';

  // Build the message line by line
  const lines: string[] = [
    `Hello ${clientName},`,
    '',
    `Here is your invoice for services from *${bizName}*.`,
    `Invoice No: *${invoice.invoiceNumber}*`,
    '',
  ];

  // List work items
  if (invoice.items.length > 0) {
    lines.push('*Services / Goods:*');
    invoice.items.forEach(item => {
      lines.push(`  • ${item.description} × ${item.quantity} = ${currency}${item.total.toLocaleString('en-NG')}`);
    });
    lines.push('');
  }

  // Totals
  lines.push(`Subtotal: ${currency}${invoice.subtotal.toLocaleString('en-NG')}`);

  if (invoice.vatEnabled && invoice.vatAmount != null) {
    lines.push(`VAT (7.5%): ${currency}${invoice.vatAmount.toLocaleString('en-NG')}`);
  }

  lines.push(`*Total Amount: ${currency}${invoice.total.toLocaleString('en-NG')}*`);

  // Split payment breakdown
  if (invoice.splitPayment) {
    const sp = invoice.splitPayment;
    lines.push('');
    lines.push('💳 *Payment Schedule:*');
    lines.push(`*Deposit Due Now: ${currency}${sp.depositAmount.toLocaleString('en-NG')}*`);
    lines.push(`Balance on Delivery: ${currency}${sp.balance.toLocaleString('en-NG')}`);
  }

  // Payment details
  lines.push('');
  lines.push('📌 *Payment Details:*');
  lines.push(`Bank: ${invoice.business.bankName || 'N/A'}`);
  lines.push(`Account: ${invoice.business.accountNumber || 'N/A'}`);
  lines.push(`Name: ${invoice.business.accountName || 'N/A'}`);
  lines.push('');
  lines.push('Thank you for your business! 🙏');
  lines.push('');
  lines.push(`_Sent via Tewómi · tewomi.app_`);

  const message = lines.join('\n');
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
};

// ── Recent Drafts Panel ───────────────────────────────────────────────────────

interface DraftsPanelProps {
  drafts: InvoiceDraft[];
  onReload: (invoice: Invoice) => void;
  onShare: (invoice: Invoice) => void;
  onDelete: (draftId: string) => void;
}

const DraftsPanel: React.FC<DraftsPanelProps> = ({ drafts, onReload, onShare, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const visible = drafts.slice(0, 5);

  if (drafts.length === 0) return null;

  return (
    <section className="pt-8 border-t border-slate-200 dark:border-slate-800">
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between text-slate-400 dark:text-slate-600 mb-4 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
        aria-expanded={expanded}
        aria-controls="drafts-list"
      >
        <span className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Recent Drafts ({drafts.length})
        </span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div id="drafts-list" className="space-y-3">
          {visible.map((draft) => {
            const inv = draft.invoice;
            const currency = inv.business.currency || CURRENCY;
            const savedAt = new Date(draft.savedAt);
            const timeLabel = savedAt.toLocaleDateString('en-NG', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
            });

            return (
              <div
                key={draft.id}
                className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all group"
              >
                <div className="min-w-0">
                  <p className="font-black text-slate-900 dark:text-slate-50 text-sm truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {inv.client.name || 'Untitled'} · {inv.invoiceNumber}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                    {timeLabel} · {currency}{inv.total.toLocaleString('en-NG')}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Reload draft into editor */}
                  <button
                    onClick={() => onReload(inv)}
                    title="Reload this draft"
                    aria-label="Reload draft"
                    className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  {/* Share via WhatsApp */}
                  <button
                    onClick={() => onShare(inv)}
                    title="Share via WhatsApp"
                    aria-label="Share draft via WhatsApp"
                    className="p-2 bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/50 transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>
                  {/* Delete draft */}
                  <button
                    onClick={() => onDelete(draft.id)}
                    title="Delete draft"
                    aria-label="Delete draft"
                    className="p-2 bg-red-50 dark:bg-red-950/30 text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

// ── Home Page ─────────────────────────────────────────────────────────────────

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(() => storageService.getUser());
  const [showSettings, setShowSettings] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parserInput, setParserInput] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [drafts, setDrafts] = useState<InvoiceDraft[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // VAT toggle state (resets per session — no persistence by design)
  const [vatEnabled, setVatEnabled] = useState(false);
  // Split payment state
  const [splitPayment, setSplitPayment] = useState<SplitPayment | null>(null);

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  /** Creates a fresh blank invoice from the current user profile */
  const makeBlankInvoice = useCallback((): Invoice => ({
    id: generateId(),
    invoiceNumber: storageService.getNextInvoiceNumber(),
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: InvoiceStatus.DRAFT,
    business: storageService.getUser().businessProfile,
    client: { name: '', email: '', phone: '', address: '' },
    items: [{ id: generateId(), description: '', quantity: 1, unit: '', unitPrice: 0, total: 0 }],
    subtotal: 0,
    total: 0,
    vatEnabled: false,
    vatAmount: 0
  }), []);

  const [activeInvoice, setActiveInvoice] = useState<Invoice>(makeBlankInvoice);

  // ── calculateTotals — applies optional VAT ────────────────────────────────
  const calculateTotals = useCallback((
    items: LineItem[],
    applyVat = vatEnabled,
    currentSplitPayment: SplitPayment | null = splitPayment
  ) => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const vatAmount = applyVat ? Math.round(subtotal * VAT_RATE) : 0;
    const total = subtotal + vatAmount;

    // Recalculate split payment balance if split is active
    let newSplitPayment = currentSplitPayment;
    if (currentSplitPayment) {
      // If a percentage was set, recalculate deposit based on new total
      const deposit = currentSplitPayment.depositPercent
        ? Math.round(total * (currentSplitPayment.depositPercent / 100))
        : currentSplitPayment.depositAmount;
      newSplitPayment = { ...currentSplitPayment, depositAmount: deposit, balance: total - deposit };
    }

    return { subtotal, vatAmount, total, splitPayment: newSplitPayment };
  }, [vatEnabled, splitPayment]);

  // ── Sync VAT changes into activeInvoice ──────────────────────────────────
  useEffect(() => {
    setActiveInvoice(prev => {
      const { subtotal, vatAmount, total, splitPayment: sp } = calculateTotals(prev.items, vatEnabled, splitPayment);
      return { ...prev, vatEnabled, vatAmount, subtotal, total, splitPayment: sp ?? undefined };
    });
  }, [vatEnabled]);

  // ── Load initial data ─────────────────────────────────────────────────────
  useEffect(() => {
    setInvoices(storageService.getInvoices().slice(0, 5));
    setDrafts(storageService.getDrafts());

    const hasDefaultAccount = !user.businessProfile.accountNumber ||
      user.businessProfile.accountNumber === '0123456789' ||
      user.businessProfile.accountNumber === '8123456789';
    const hasSeenOnboarding = localStorage.getItem('tewomi_onboarding_seen') === 'true';

    if (hasDefaultAccount && !hasSeenOnboarding) {
      setShowOnboarding(true);
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (window.innerWidth < 768) setShowInstallBanner(true);
    });

    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    });
  }, []);

  // ── Reload user after settings close ────────────────────────────────────
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

  // ── Manual field update ──────────────────────────────────────────────────
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
      const { subtotal, vatAmount, total, splitPayment: sp } = calculateTotals(newItems);
      return { ...prev, items: newItems, subtotal, vatAmount, total, splitPayment: sp ?? undefined };
    });
  };

  // ── Smart Parse ──────────────────────────────────────────────────────────
  const handleSmartParse = async () => {
    if (!parserInput.trim()) return;

    const biz = activeInvoice.business;
    const requiredFields: (keyof BusinessProfile)[] = ['name', 'email', 'phone', 'bankName', 'accountNumber', 'accountName'];
    const missingFields = requiredFields.filter(field => !biz[field] || biz[field]?.trim() === '');
    const hasDefaultAccount = biz.accountNumber === '0123456789' || biz.accountNumber === '8123456789';

    if (missingFields.length > 0 || hasDefaultAccount) {
      alert("Please complete your Business Profile in Settings before using the smart parser.");
      setShowSettings(true);
      return;
    }

    setIsParsing(true);
    try {
      const result = await geminiService.parseWorkDescription(parserInput);
      console.log("Gemini parse result:", result);

      if ((result as any)._error) {
        alert(`Parsing Error: ${(result as any)._error}. Please check your API key in Settings.`);
        return;
      }

      if (!result.items || result.items.length === 0) {
        alert("We couldn't extract any work items. Try rephrasing like 'Bill Kola 50k for Logo'.");
        return;
      }

      const newItems = result.items.map(item => ({
        id: generateId(),
        description: item.description || 'Work',
        quantity: item.quantity || 1,
        unit: item.unit || '',
        unitPrice: item.unitPrice || 0,
        total: (item.quantity || 1) * (item.unitPrice || 0)
      }));

      // Apply VAT from parser or keep existing toggle state
      const newVatEnabled = result.vatEnabled ?? vatEnabled;
      setVatEnabled(newVatEnabled);

      // Build initial split payment from parser result
      let newSplitPayment: SplitPayment | null = null;
      if (result.splitPayment) {
        const { subtotal: tempSubtotal } = calculateTotals(newItems, newVatEnabled, null);
        const deposit = result.splitPayment.depositAmount;
        newSplitPayment = {
          depositAmount: deposit,
          depositPercent: result.splitPayment.depositPercent,
          balance: tempSubtotal + (newVatEnabled ? Math.round(tempSubtotal * VAT_RATE) : 0) - deposit
        };
        setSplitPayment(newSplitPayment);
      }

      const { subtotal, vatAmount, total, splitPayment: sp } = calculateTotals(newItems, newVatEnabled, newSplitPayment);

      const parsedInvoice: Invoice = {
        ...activeInvoice,
        client: {
          ...activeInvoice.client,
          name: result.clientName || activeInvoice.client.name,
          email: result.clientEmail || activeInvoice.client.email,
          phone: result.clientPhone || activeInvoice.client.phone,
          address: result.clientAddress || activeInvoice.client.address
        },
        dueDate: result.dueDate || activeInvoice.dueDate,
        items: newItems,
        subtotal,
        vatEnabled: newVatEnabled,
        vatAmount,
        total,
        splitPayment: sp ?? undefined
      };

      setActiveInvoice(parsedInvoice);

      // Auto-save draft on every successful parse
      storageService.saveDraft(parsedInvoice);
      setDrafts(storageService.getDrafts());
      setParserInput('');
    } catch (err) {
      console.error("Smart Parse Error:", err);
      alert("Something went wrong while parsing. Please try again or enter details manually.");
    } finally {
      setIsParsing(false);
    }
  };

  // ── Install prompt ───────────────────────────────────────────────────────
  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  // ── Save & Download ──────────────────────────────────────────────────────
  const handleSaveAndDownload = () => {
    const biz = activeInvoice.business;
    const client = activeInvoice.client;
    const requiredBizFields: (keyof BusinessProfile)[] = ['name', 'email', 'phone', 'bankName', 'accountNumber', 'accountName'];
    const missingBizFields = requiredBizFields.filter(field => !biz[field] || biz[field]?.trim() === '');
    const hasDefaultAccount = biz.accountNumber === '0123456789' || biz.accountNumber === '8123456789';

    if (missingBizFields.length > 0 || hasDefaultAccount) {
      alert("Please complete your Business Profile in Settings.");
      setShowSettings(true);
      return;
    }

    if (biz.accountNumber.length !== 10) {
      alert("Please update your account number to 10 digits in Settings.");
      setShowSettings(true);
      return;
    }

    if (!client.name || client.name.trim() === '') {
      alert("Please enter the Client's Name before generating the invoice.");
      return;
    }

    storageService.saveInvoice(activeInvoice);
    pdfService.generateInvoicePDF(activeInvoice);
    setInvoices(storageService.getInvoices().slice(0, 5));

    if (deferredPrompt) setShowInstallBanner(true);

    // Reset for next invoice
    const blank = makeBlankInvoice();
    setActiveInvoice(blank);
    setVatEnabled(false);
    setSplitPayment(null);
  };

  // ── Draft Actions ────────────────────────────────────────────────────────

  /** Reloads a draft invoice into the active editor */
  const handleReloadDraft = (invoice: Invoice) => {
    setActiveInvoice(invoice);
    setVatEnabled(invoice.vatEnabled ?? false);
    setSplitPayment(invoice.splitPayment ?? null);
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteDraft = (draftId: string) => {
    storageService.deleteDraft(draftId);
    setDrafts(storageService.getDrafts());
  };

  // ── Shared WhatsApp helper (for both active and draft invoices) ──────────
  const handleWhatsAppShare = (invoice: Invoice) => {
    // Validate at least a client name before sharing
    if (!invoice.client.name?.trim()) {
      alert("Please enter the Client's Name before sharing.");
      return;
    }
    shareViaWhatsApp(invoice);
  };

  // ── VAT toggle handler ───────────────────────────────────────────────────
  const handleVatToggle = (val: boolean) => {
    setVatEnabled(val);
    setActiveInvoice(prev => {
      const { subtotal, vatAmount, total, splitPayment: sp } = calculateTotals(prev.items, val, splitPayment);
      return { ...prev, vatEnabled: val, vatAmount, subtotal, total, splitPayment: sp ?? undefined };
    });
  };

  // ── Determine action button opacity ─────────────────────────────────────
  const canBillAndDownload =
    activeInvoice.business.name &&
    activeInvoice.business.phone &&
    activeInvoice.business.accountNumber &&
    activeInvoice.client.name;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-200">

      {/* ── Install Banner ── */}
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

      {/* ── Onboarding Modal ── */}
      {showOnboarding && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-300">
            <button
              onClick={() => { setShowOnboarding(false); localStorage.setItem('tewomi_onboarding_seen', 'true'); }}
              className="absolute top-6 left-6 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition"
              aria-label="Close onboarding"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="text-center space-y-6 pt-8">
              <h1 className="text-5xl font-black text-slate-900 dark:text-slate-50">Ẹ káàbọ̀ o!</h1>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Welcome to Tewómi! 🚀</h2>
              <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                Please add your business name and payment info in the Settings section first so we can properly brand your invoice.
              </p>
              <button
                onClick={() => { setShowOnboarding(false); setShowSettings(true); localStorage.setItem('tewomi_onboarding_seen', 'true'); }}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl font-black text-lg uppercase tracking-wider transition shadow-lg shadow-green-200 dark:shadow-none"
              >
                Go to Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings Drawer ── */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-md" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 h-full shadow-2xl p-8 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Business Profile</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-500 dark:text-slate-400" aria-label="Close settings">
                <X className="w-5 h-5" />
              </button>
            </div>
            <Settings />
            <button
              onClick={() => setShowSettings(false)}
              className="w-full mt-8 bg-slate-900 dark:bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-indigo-700 transition shadow-xl"
            >
              <Check className="w-5 h-5" /> Save &amp; Close
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="px-6 h-20 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          {/* Mobile: compact logo */}
          <img src="/logo-mobile-light.png" alt="Tewómi" className="h-8 w-auto dark:hidden sm:hidden" />
          <img src="/logo-mobile-dark.png" alt="Tewómi" className="h-8 w-auto hidden dark:block dark:sm:hidden" />
          {/* Desktop: full logo */}
          <img src="/logo-desktop-light.png" alt="Tewómi" className="h-8 w-auto hidden sm:block dark:hidden" />
          <img src="/logo-desktop-dark.png" alt="Tewómi" className="h-8 w-auto hidden dark:sm:block" />
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            onClick={() => setShowSettings(true)}
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm text-slate-600 dark:text-slate-300 flex items-center gap-2 font-bold text-sm"
            aria-label="Open settings"
          >
            <SettingsIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 py-8">
        <div className="lg:col-span-7 space-y-12 pb-20">

          {/* ── Smart Parser ── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-black uppercase text-[10px] tracking-widest">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h2>New Billing Task</h2>
            </div>
            <div className="space-y-4">
              <textarea
                value={parserInput}
                onChange={(e) => setParserInput(e.target.value)}
                placeholder="e.g. Bill kola@test.com for 2 Logo Designs at 50k each. Deposit 30% upfront. +vat. Due next Friday."
                rows={3}
                className="w-full p-6 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-3xl focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-0 outline-none transition text-xl resize-none shadow-sm text-slate-900 dark:text-slate-100 font-medium placeholder-slate-400 dark:placeholder-slate-600"
                style={{ minHeight: '144px' }}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSmartParse(); }}
              />
              <button
                onClick={handleSmartParse}
                disabled={isParsing || !parserInput.trim()}
                className="w-full bg-slate-900 dark:bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-xl"
                aria-label="Parse billing sentence"
              >
                {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                <span>Parse</span>
              </button>
            </div>
          </section>

          {/* ── Invoice Form ── */}
          <section className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-xl space-y-8">
            {/* Client + Date fields */}
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
              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Phone</label>
                <input
                  type="tel"
                  value={activeInvoice.client.phone || ''}
                  onChange={(e) => handleManualUpdate('client.phone', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 rounded-2xl p-4 outline-none text-slate-900 dark:text-slate-100 font-bold transition-all"
                  placeholder="08012345678"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Address</label>
                <input
                  type="text"
                  value={activeInvoice.client.address || ''}
                  onChange={(e) => handleManualUpdate('client.address', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 rounded-2xl p-4 outline-none text-slate-900 dark:text-slate-100 font-bold transition-all"
                  placeholder="123 Street, City"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Issue Date</label>
                <input
                  type="date"
                  value={activeInvoice.issueDate}
                  onChange={(e) => handleManualUpdate('issueDate', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 rounded-2xl p-4 outline-none text-slate-900 dark:text-slate-100 font-bold transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Due Date</label>
                <input
                  type="date"
                  value={activeInvoice.dueDate}
                  onChange={(e) => handleManualUpdate('dueDate', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 rounded-2xl p-4 outline-none text-slate-900 dark:text-slate-100 font-bold transition-all"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Work Items</label>
                <button
                  onClick={() => setActiveInvoice(prev => ({
                    ...prev,
                    items: [...prev.items, { id: generateId(), description: '', quantity: 1, unit: '', unitPrice: 0, total: 0 }]
                  }))}
                  className="text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-3 py-1.5 rounded-lg transition"
                  aria-label="Add a new line item"
                >
                  + Add Row
                </button>
              </div>
              <div className="space-y-4">
                {activeInvoice.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-3 items-center group">
                    <div className="col-span-4">
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => handleItemUpdate(item.id, 'description', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 rounded-xl p-3 text-xs outline-none text-slate-900 dark:text-slate-100 transition-all font-medium"
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="number"
                        placeholder="1"
                        value={item.quantity === 0 ? '' : item.quantity}
                        onChange={(e) => handleItemUpdate(item.id, 'quantity', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 rounded-xl p-3 text-xs outline-none text-slate-900 dark:text-slate-100 font-bold transition-all text-center pl-1 pr-1"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="Unit"
                        value={item.unit || ''}
                        onChange={(e) => handleItemUpdate(item.id, 'unit', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 rounded-xl p-3 text-xs outline-none text-slate-900 dark:text-slate-100 transition-all"
                      />
                    </div>
                    <div className="col-span-4">
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-slate-400 dark:text-slate-600 text-xs font-bold">{activeInvoice.business.currency}</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={item.unitPrice === 0 ? '' : item.unitPrice}
                          onChange={(e) => handleItemUpdate(item.id, 'unitPrice', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                          className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 rounded-xl p-3 pl-8 text-xs outline-none font-bold text-slate-900 dark:text-slate-100 transition-all"
                        />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <button
                        onClick={() => {
                          setActiveInvoice(prev => {
                            const nextItems = prev.items.filter(i => i.id !== item.id);
                            if (nextItems.length === 0) return prev;
                            const { subtotal, vatAmount, total, splitPayment: sp } = calculateTotals(nextItems);
                            return { ...prev, items: nextItems, subtotal, vatAmount, total, splitPayment: sp ?? undefined };
                          });
                        }}
                        className="p-2 text-slate-300 dark:text-slate-700 hover:text-red-500 transition-colors"
                        aria-label="Remove line item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── VAT Toggle ── */}
          <VatToggle enabled={vatEnabled} onChange={handleVatToggle} />

          {/* ── Action Buttons: Download + WhatsApp ── */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Bill & Download */}
            <button
              onClick={handleSaveAndDownload}
              className={`flex-1 bg-slate-900 dark:bg-indigo-600 text-white py-5 rounded-3xl font-black text-lg hover:bg-slate-800 dark:hover:bg-indigo-700 transition flex items-center justify-center gap-3 shadow-2xl shadow-indigo-200 dark:shadow-none uppercase tracking-widest ${!canBillAndDownload ? 'opacity-40 cursor-not-allowed' : ''}`}
              aria-label="Save and download invoice PDF"
            >
              <Download className="w-5 h-5" />
              <span>Bill &amp; Download</span>
            </button>

            {/* Share via WhatsApp */}
            <button
              onClick={() => handleWhatsAppShare(activeInvoice)}
              className="flex-1 sm:flex-none bg-green-500 hover:bg-green-600 text-white py-5 px-6 rounded-3xl font-black text-lg transition flex items-center justify-center gap-3 shadow-xl shadow-green-200 dark:shadow-none uppercase tracking-widest"
              aria-label="Share invoice via WhatsApp"
            >
              <MessageCircle className="w-5 h-5" />
              <span>WhatsApp</span>
            </button>
          </div>

          {/* ── Billing History ── */}
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
                      <p className="font-black text-slate-900 dark:text-slate-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {inv.client.name || 'Untitled'}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-2 uppercase font-bold tracking-widest">
                        <FileText className="w-3 h-3" /> {inv.invoiceNumber}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-3 py-1">
                      <p className="font-black text-slate-900 dark:text-slate-50 text-xl leading-none">
                        {inv.business.currency || CURRENCY}{inv.total.toLocaleString('en-NG')}
                      </p>
                      <StatusBadge status={inv.status} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Recent Drafts Panel ── */}
          <DraftsPanel
            drafts={drafts}
            onReload={handleReloadDraft}
            onShare={handleWhatsAppShare}
            onDelete={handleDeleteDraft}
          />
        </div>

        {/* ── Live Preview Sidebar (desktop) ── */}
        <div className="hidden lg:block lg:col-span-5">
          <div className="sticky top-24">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">
              Real-time Preview
            </p>
            <LivePreview invoice={activeInvoice} />
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="p-12 text-center text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">
        Tewómi Invoicer &bull; Built by{' '}
        <a
          href="https://bio.workwithbola.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-slate-600 dark:hover:text-slate-400 underline decoration-dotted underline-offset-4 transition"
        >
          Bola Olaniyan
        </a>
        {' '}&bull; Nigeria 🇳🇬
      </footer>

      {/* ── Invoice Detail Drawer ── */}
      {location.pathname.includes('/invoice/') && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => navigate('/')}
            aria-label="Close invoice detail"
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

// ── App Router ────────────────────────────────────────────────────────────────

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
