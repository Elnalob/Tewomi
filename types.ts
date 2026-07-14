
// --- Core Enums ---
export enum InvoiceStatus {
  DRAFT = 'Draft',
  SENT = 'Sent',
  PAID = 'Paid',
  OVERDUE = 'Overdue'
}

// --- Line Item ---
export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  total: number;
}

// --- Split Payment structure for deposit/balance tracking ---
export interface SplitPayment {
  /** Absolute deposit amount in the invoice currency */
  depositAmount: number;
  /** Optional percentage used to derive depositAmount (e.g. 50 for 50%) */
  depositPercent?: number;
  /** Remaining balance = total - depositAmount */
  balance: number;
}

// --- Business Profile — logoBase64 is stored in localStorage separately ---
export interface BusinessProfile {
  name: string;
  email: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  address?: string;
  phone?: string;
  currency?: string;
  geminiApiKey?: string;
}

// --- Client profile ---
export interface ClientProfile {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

// --- Core Invoice model ---
export interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  business: BusinessProfile;
  client: ClientProfile;
  items: LineItem[];
  subtotal: number;
  /** Grand total including VAT if applicable */
  total: number;
  notes?: string;
  /** Whether 7.5% Nigerian VAT has been applied */
  vatEnabled?: boolean;
  /** Calculated VAT amount (subtotal × 0.075) */
  vatAmount?: number;
  /** Split payment details — deposit due now + balance on delivery */
  splitPayment?: SplitPayment;
}

// --- Draft — a saved invoice snapshot with timestamp ---
export interface InvoiceDraft {
  id: string;
  savedAt: string; // ISO timestamp
  invoice: Invoice;
}

// --- App user ---
export interface User {
  id: string;
  email: string;
  businessProfile: BusinessProfile;
}
