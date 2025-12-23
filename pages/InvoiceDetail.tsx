
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Invoice, InvoiceStatus } from '../types';
import { storageService } from '../services/storageService';
import { pdfService } from '../services/pdfService';
import { CURRENCY, APP_NAME } from '../constants';
import StatusBadge from '../components/StatusBadge';
import { ArrowLeft, Download, Share2, CheckCircle, Edit3, Trash2, Mail, ExternalLink, Copy } from 'lucide-react';

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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/invoice/${invoice.id}/edit`)}
            className="p-2 border rounded hover:bg-gray-50 text-gray-600 transition"
            title="Edit"
          >
            <Edit3 className="w-5 h-5" />
          </button>
          <button
            onClick={deleteInvoice}
            className="p-2 border rounded hover:bg-red-50 text-red-600 transition"
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {/* Quick Actions Header */}
        <div className="p-6 bg-gray-50 border-b flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <StatusBadge status={invoice.status} />
            <h1 className="text-xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {invoice.status !== InvoiceStatus.PAID && (
              <button
                onClick={markAsPaid}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                <CheckCircle className="w-4 h-4" /> Mark as Paid
              </button>
            )}
            <button
              onClick={() => pdfService.generateInvoicePDF(invoice)}
              className="flex items-center gap-2 border bg-white px-4 py-2 rounded-lg hover:bg-gray-50 transition text-gray-700"
            >
              <Download className="w-4 h-4" /> PDF
            </button>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              {copied ? 'Copied!' : <><Share2 className="w-4 h-4" /> Share Link</>}
            </button>
          </div>
        </div>

        {/* Invoice Body Preview */}
        <div className="p-8 md:p-12 space-y-12">
          {/* Top Info */}
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-indigo-600">{invoice.business.name}</h2>
                <p className="text-gray-500">{invoice.business.email}</p>
              </div>
              <div className="text-sm">
                <p className="font-semibold text-gray-900 uppercase text-xs mb-1">Payment Instructions:</p>
                <p className="text-gray-600">{invoice.business.bankName}</p>
                <p className="text-gray-600">Acc Name: {invoice.business.accountName}</p>
                <p className="text-lg font-mono text-indigo-700 font-bold">{invoice.business.accountNumber}</p>
              </div>
            </div>
            <div className="text-left md:text-right space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Issue Date: <span className="text-gray-900 ml-2">{invoice.issueDate}</span></p>
              <p className="text-xs font-semibold text-gray-500 uppercase">Due Date: <span className="text-gray-900 ml-2">{invoice.dueDate}</span></p>
            </div>
          </div>

          {/* Bill To */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Bill To:</p>
            <p className="text-xl font-bold text-gray-900">{invoice.client.name}</p>
            <p className="text-gray-500">{invoice.client.email}</p>
          </div>

          {/* Table */}
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-center">Qty</th>
                  <th className="px-6 py-4 text-right">Price</th>
                  <th className="px-6 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 text-gray-900">{item.description}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{item.quantity}</td>
                    <td className="px-6 py-4 text-right text-gray-600">{CURRENCY}{item.unitPrice.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">{CURRENCY}{item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full md:w-64 space-y-3">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>{CURRENCY}{invoice.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>VAT (7.5%)</span>
                <span>{CURRENCY}{invoice.tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-2xl font-bold text-gray-900 pt-3 border-t">
                <span>Total</span>
                <span className="text-indigo-600">{CURRENCY}{invoice.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="pt-6 border-t">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Notes:</p>
              <p className="text-gray-600 text-sm leading-relaxed">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
