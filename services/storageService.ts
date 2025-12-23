
import { Invoice, User, BusinessProfile } from '../types';
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

  getUser: (): User => {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    // Since we initialize it, we can assert it exists
    return JSON.parse(data!);
  },

  saveUser: (user: User) => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  // Added login method to handle session storage and resolve the reported error
  login: () => {
    localStorage.setItem(STORAGE_KEYS.AUTH, 'true');
  },

  // Added logout method to clear session storage
  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
  },

  // Added isLoggedIn method to check authentication status
  isLoggedIn: (): boolean => {
    return localStorage.getItem(STORAGE_KEYS.AUTH) === 'true';
  },

  // Helper to generate next sequential invoice number
  getNextInvoiceNumber: (): string => {
    const invoices = storageService.getInvoices();
    if (invoices.length === 0) return 'INV-001';
    
    // Find the highest numeric value in current invoices
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
