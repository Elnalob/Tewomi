
export enum InvoiceStatus {
  DRAFT = 'Draft',
  SENT = 'Sent',
  PAID = 'Paid',
  OVERDUE = 'Overdue'
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  total: number;
}

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

export interface ClientProfile {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

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
  total: number;
  notes?: string;
}

export interface User {
  id: string;
  email: string;
  businessProfile: BusinessProfile;
}
