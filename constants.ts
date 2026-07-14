
export const APP_NAME = "Tewómi";
export const CURRENCY = "₦";

/** Nigerian standard VAT rate */
export const VAT_RATE = 0.075;

export const STORAGE_KEYS = {
  INVOICES: 'tewomi_invoices',
  USER: 'tewomi_user_profile',
  // Session/authentication status
  AUTH: 'tewomi_auth_status',
  // Business brand logo stored as base64 string
  LOGO: 'tewomi_merchant_logo',
  // Offline draft queue — array of InvoiceDraft
  DRAFTS: 'tewomi_drafts',
};

export const INITIAL_BUSINESS_PROFILE = {
  name: '',
  email: '',
  address: '',
  phone: '',
  bankName: '',
  accountNumber: '',
  accountName: ''
};
