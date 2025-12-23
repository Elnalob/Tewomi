
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Invoice, InvoiceStatus } from '../types';
import { storageService } from '../services/storageService';
import { pdfService } from '../services/pdfService';
import { CURRENCY, APP_NAME } from '../constants';
import StatusBadge from '../components/StatusBadge';
import { ArrowLeft, Download, Share2, CheckCircle, Edit3, Trash2, Mail, ExternalLink, Copy, X } from 'lucide-react';

const InvoiceDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id) {
      const data = storageService.getInvoiceById(id);
      if (data) setInvoice(data);
      else navigate('/dashboard');
    }
  }, [id, navigate]);

  if (!invoice) return null;

  const markAsPaid = () => {
    const updated = { ...invoice, status: InvoiceStatus.PAID };
    storageService.saveInvoice(updated);
    setInvoice(updated);
  };

  const deleteInvoice = () => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      storageService.deleteInvoice(invoice.id);
      navigate('/dashboard');
    }
  };

  const shareLink = `${window.location.origin}/#/public/${invoice.id}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white min-h-full pb-12 h-full">
      {/* Header */}
      <div className="flex items-center justify-between pt-6 px-6 sticky top-0 bg-white z-10 pb-4 border-b border-slate-50">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 -ml-2 text-slate-900 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="flex gap-3">
          {invoice.status !== InvoiceStatus.PAID && (
            <button
              onClick={markAsPaid}
              className="px-4 py-2 bg-green-500 text-white text-sm font-bold rounded-full shadow-sm hover:bg-green-600 transition"
            >
              Mark as paid
            </button>
          )}
          <button
            onClick={() => pdfService.generateInvoicePDF(invoice)}
            className="px-4 py-2 border-2 border-slate-900 text-slate-900 text-sm font-bold rounded-full hover:bg-slate-50 transition"
          >
            Download PDF
          </button>
        </div>
      </div>

      <div className="px-6 space-y-8">
        {/* Invoice Number */}
        <h1 className="text-3xl font-black text-slate-900">{invoice.invoiceNumber}</h1>

        {/* Business Info */}
        <div className="bg-slate-100 p-6 rounded-[2rem]">
          <h2 className="text-lg font-bold text-slate-900">{invoice.business.name}</h2>
          <p className="text-slate-400 font-medium text-sm">{invoice.business.email || 'business@email.com'}</p>
        </div>

        {/* Payment Information */}
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-4">Payment information</h3>
          <div className="bg-slate-50 p-6 rounded-[2rem] space-y-4">
            <div className="flex justify-between items-center group">
              <span className="text-slate-400 font-medium">Name</span>
              <span className="text-slate-900 font-bold text-right">{invoice.business.accountName}</span>
            </div>
            <div className="flex justify-between items-center group">
              <span className="text-slate-400 font-medium">Account number</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-900 font-bold font-mono">{invoice.business.accountNumber}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(invoice.business.accountNumber);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-1.5 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition"
                >
                  {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center group">
              <span className="text-slate-400 font-medium">Bank</span>
              <span className="text-slate-900 font-bold text-right">{invoice.business.bankName}</span>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-4">Customer information</h3>
          <div className="bg-slate-50 p-6 rounded-[2rem] space-y-4">
            <div className="flex justify-between items-start gap-4">
              <span className="text-slate-400 font-medium">Name</span>
              <span className="text-slate-900 font-bold text-right">{invoice.client.name}</span>
            </div>
            <div className="flex justify-between items-start gap-4">
              <span className="text-slate-400 font-medium">Email</span>
              <span className="text-slate-900 font-bold text-right break-all">{invoice.client.email}</span>
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-4">Invoice Details</h3>
          <div className={`flex gap-4 ${invoice.items.length > 1 ? 'overflow-x-auto pb-4 snap-x' : ''}`}>
            {invoice.items.map((item) => (
              <div key={item.id} className={`${invoice.items.length > 1 ? 'min-w-[85%] snap-center' : 'w-full'} bg-slate-50 p-6 rounded-[2rem] space-y-4 flex-shrink-0`}>
                <div className="flex justify-between items-start">
                  <span className="text-slate-400 font-medium">Description</span>
                  <span className="text-slate-900 font-bold text-right">{item.description}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Quantity</span>
                  <span className="text-slate-900 font-bold">{item.quantity}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Price per Unit</span>
                  <span className="text-slate-900 font-bold">{CURRENCY}{item.unitPrice.toLocaleString()}</span>
                </div>
                <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Line Total</span>
                  <span className="text-slate-900 font-black">{CURRENCY}{item.total.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-slate-50 p-6 rounded-[2rem] space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Subtotal: Items ({invoice.items.length})</span>
            <span className="text-slate-400 font-bold text-lg">{CURRENCY}{invoice.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Total :</span>
            <span className="text-slate-900 font-black text-xl">{CURRENCY}{invoice.total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-slate-500 font-medium">Payment Status</span>
            <div className={`px-4 py-1 rounded-full text-sm font-bold ${invoice.status === InvoiceStatus.PAID
              ? 'bg-green-100 text-green-700'
              : 'bg-orange-100 text-orange-600'
              }`}>
              {invoice.status === InvoiceStatus.PAID ? 'Paid' : 'Pending'}
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div className="h-4" />
      </div>
    </div>
  );
};

export default InvoiceDetail;
