
import { Invoice, InvoiceDraft, User, BusinessProfile } from '../types';
import { STORAGE_KEYS, INITIAL_BUSINESS_PROFILE } from '../constants';

// Initialize a default user if none exists in storage
const initializeDefaultUser = () => {
  if (!localStorage.getItem(STORAGE_KEYS.USER)) {
    const defaultUser: User = {
      id: 'default-user',
      email: 'my-business@example.com',
      businessProfile: INITIAL_BUSINESS_PROFILE
    };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(defaultUser));
  }
};

initializeDefaultUser();

export const storageService = {
  // ---- Invoice CRUD ----
  getInvoices: (): Invoice[] => {
    const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
    return data ? JSON.parse(data) : [];
  },

  saveInvoices: (invoices: Invoice[]) => {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  },

  getInvoiceById: (id: string): Invoice | undefined => {
    const invoices = storageService.getInvoices();
    return invoices.find(inv => inv.id === id);
  },

  saveInvoice: (invoice: Invoice) => {
    const invoices = storageService.getInvoices();
    const index = invoices.findIndex(inv => inv.id === invoice.id);
    if (index > -1) {
      invoices[index] = invoice;
    } else {
      invoices.push(invoice);
    }
    storageService.saveInvoices(invoices);
  },

  deleteInvoice: (id: string) => {
    const invoices = storageService.getInvoices();
    storageService.saveInvoices(invoices.filter(inv => inv.id !== id));
  },

  // ---- User / Business Profile ----
  getUser: (): User => {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    return JSON.parse(data!);
  },

  saveUser: (user: User) => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  // ---- Auth helpers ----
  login: () => {
    localStorage.setItem(STORAGE_KEYS.AUTH, 'true');
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
  },

  isLoggedIn: (): boolean => {
    return localStorage.getItem(STORAGE_KEYS.AUTH) === 'true';
  },

  // ---- Brand Logo (base64) ----

  /** Returns the stored base64 logo string, or null if not set */
  getLogo: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.LOGO);
  },

  /** Stores a base64 image string as the merchant logo */
  saveLogo: (base64: string) => {
    localStorage.setItem(STORAGE_KEYS.LOGO, base64);
  },

  /** Removes the stored merchant logo */
  removeLogo: () => {
    localStorage.removeItem(STORAGE_KEYS.LOGO);
  },

  // ---- Offline Draft Queue ----

  /** Returns all saved drafts, newest first */
  getDrafts: (): InvoiceDraft[] => {
    const data = localStorage.getItem(STORAGE_KEYS.DRAFTS);
    return data ? JSON.parse(data) : [];
  },

  /**
   * Saves or updates a draft. Drafts are keyed by invoice.id.
   * The queue is capped at 20 entries (oldest removed first).
   */
  saveDraft: (invoice: Invoice) => {
    const drafts = storageService.getDrafts();
    // Remove existing draft with same invoice id to prevent duplicates
    const filtered = drafts.filter(d => d.invoice.id !== invoice.id);
    const newDraft: InvoiceDraft = {
      id: `draft-${Date.now()}`,
      savedAt: new Date().toISOString(),
      invoice
    };
    // Prepend (newest first), cap at 20
    const updated = [newDraft, ...filtered].slice(0, 20);
    localStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(updated));
  },

  /** Removes a specific draft by its draft id */
  deleteDraft: (draftId: string) => {
    const drafts = storageService.getDrafts();
    localStorage.setItem(
      STORAGE_KEYS.DRAFTS,
      JSON.stringify(drafts.filter(d => d.id !== draftId))
    );
  },

  // ---- Invoice Number Generator ----

  /** Generates the next sequential invoice number (e.g. INV-007) */
  getNextInvoiceNumber: (): string => {
    const invoices = storageService.getInvoices();
    if (invoices.length === 0) return 'INV-001';

    const maxNum = invoices.reduce((max, inv) => {
      const match = inv.invoiceNumber.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);

    return `INV-${(maxNum + 1).toString().padStart(3, '0')}`;
  }
};
