
import React, { useEffect, useState } from 'react';
import { Invoice } from '../types';
import { CURRENCY, VAT_RATE } from '../constants';
import { storageService } from '../services/storageService';

interface LivePreviewProps {
  invoice: Invoice;
}

/**
 * LivePreview renders a scaled-down, real-time invoice preview.
 * It mirrors all fields including logo, VAT, and split payment.
 */
const LivePreview: React.FC<LivePreviewProps> = ({ invoice }) => {
  // Read logo from localStorage and sync on mount
  const [logoSrc, setLogoSrc] = useState<string | null>(null);

  useEffect(() => {
    const logo = storageService.getLogo();
    setLogoSrc(logo);
  }, []);

  // Listen for logo updates triggered from Settings without page reload
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'tewomi_merchant_logo') {
        setLogoSrc(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const currency = invoice.business.currency || CURRENCY;

  return (
    <div className="bg-white shadow-2xl rounded-sm border border-gray-100 aspect-[1/1.41] p-6 text-[10px] sm:text-xs overflow-hidden sticky top-24 transition-colors flex flex-col">

      {/* ── Top accent bar ── */}
      <div className="h-1 bg-indigo-600 rounded-full -mx-6 -mt-6 mb-5" />

      {/* ── Header: Logo + Business Name vs INVOICE label ── */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          {logoSrc && (
            <img
              src={logoSrc}
              alt="Business logo"
              className="h-10 w-auto max-w-[80px] object-contain rounded"
            />
          )}
          <div>
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight leading-tight">
              {invoice.business.name || 'Your Business'}
            </h2>
            <p className="text-gray-400 text-[9px] leading-tight">{invoice.business.email}</p>
            {invoice.business.phone && (
              <p className="text-gray-400 text-[9px] leading-tight">{invoice.business.phone}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-xl font-black text-indigo-100 leading-none">INVOICE</h1>
          <p className="text-gray-400 text-[9px] mt-0.5">#{invoice.invoiceNumber}</p>
        </div>
      </div>

      {/* ── Thin accent divider ── */}
      <div className="h-px bg-indigo-600 opacity-30 mb-4" />

      {/* ── Bill To + Dates ── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div>
          <p className="font-black text-indigo-500 uppercase text-[7px] mb-1 tracking-widest">Bill To</p>
          <p className="font-black text-gray-900 text-xs leading-tight">{invoice.client.name || 'Client Name'}</p>
          {invoice.client.email && <p className="text-gray-400 text-[9px]">{invoice.client.email}</p>}
          {invoice.client.phone && <p className="text-gray-400 text-[9px]">{invoice.client.phone}</p>}
          {invoice.client.address && <p className="text-gray-400 text-[9px]">{invoice.client.address}</p>}
        </div>
        <div className="text-right">
          <p className="font-black text-indigo-500 uppercase text-[7px] mb-1 tracking-widest">Issue Date</p>
          <p className="text-gray-700 font-medium text-[9px]">{invoice.issueDate}</p>
          {invoice.dueDate && (
            <>
              <p className="font-black text-indigo-500 uppercase text-[7px] mt-2 mb-1 tracking-widest">Due Date</p>
              <p className="text-gray-700 font-medium text-[9px]">{invoice.dueDate}</p>
            </>
          )}
        </div>
      </div>

      {/* ── Line Items Table ── */}
      <table className="w-full mb-4">
        <thead>
          <tr className="border-b-2 border-gray-900 text-left">
            <th className="py-1.5 font-black uppercase text-[7px] text-gray-500">Description</th>
            <th className="py-1.5 font-black uppercase text-[7px] text-center text-gray-500">Qty</th>
            <th className="py-1.5 font-black uppercase text-[7px] text-right text-gray-500">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {invoice.items.map((item, idx) => (
            <tr key={idx}>
              <td className="py-2 font-medium text-gray-800">
                {item.description || '...'}
                {item.unit && <span className="text-[7px] text-gray-400 ml-1">({item.unit})</span>}
              </td>
              <td className="py-2 text-center text-gray-500">{item.quantity}</td>
              <td className="py-2 text-right font-bold text-gray-900">
                {currency}{item.total.toLocaleString('en-NG')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Totals ── */}
      <div className="flex flex-col items-end space-y-1 ml-auto w-36">
        {/* Subtotal */}
        <div className="flex justify-between w-full text-gray-400">
          <span>Subtotal</span>
          <span>{currency}{invoice.subtotal.toLocaleString('en-NG')}</span>
        </div>

        {/* VAT row — only when vatEnabled */}
        {invoice.vatEnabled && invoice.vatAmount != null && (
          <div className="flex justify-between w-full text-orange-500 font-medium">
            <span>VAT ({(VAT_RATE * 100).toFixed(1)}%)</span>
            <span>{currency}{invoice.vatAmount.toLocaleString('en-NG')}</span>
          </div>
        )}

        {/* Grand Total */}
        <div className="flex justify-between w-full font-black text-gray-900 pt-1.5 border-t-2 border-gray-900 text-sm">
          <span>Total</span>
          <span className="text-indigo-600">{currency}{invoice.total.toLocaleString('en-NG')}</span>
        </div>
      </div>

      {/* ── Split Payment Breakdown ── */}
      {invoice.splitPayment && (
        <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
          <p className="text-[7px] font-black text-indigo-600 uppercase tracking-widest mb-2">
            Payment Schedule
          </p>
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-500 text-[9px]">
              Deposit Due Now
              {invoice.splitPayment.depositPercent && ` (${invoice.splitPayment.depositPercent}%)`}
            </span>
            <span className="font-black text-gray-900 text-[10px]">
              {currency}{invoice.splitPayment.depositAmount.toLocaleString('en-NG')}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-[9px]">Balance on Delivery</span>
            <span className="font-black text-green-600 text-[10px]">
              {currency}{invoice.splitPayment.balance.toLocaleString('en-NG')}
            </span>
          </div>
        </div>
      )}

      {/* ── Payment Details Box ── */}
      <div className="mt-auto pt-3">
        <div className="p-3 bg-gray-50 rounded border border-dashed border-gray-200 flex justify-between items-center">
          <div>
            <p className="font-black text-[7px] uppercase text-indigo-500 mb-1 tracking-widest">Payment Details</p>
            <p className="text-gray-400 text-[9px]">{invoice.business.bankName}</p>
            <p className="text-gray-900 font-black text-xs">{invoice.business.accountNumber}</p>
            <p className="text-gray-400 text-[7px] uppercase">{invoice.business.accountName}</p>
          </div>
          <p className="text-indigo-600 italic font-serif text-base">Thank you!</p>
        </div>
      </div>

      {/* ── Footer branding ── */}
      <p className="text-center text-[7px] text-gray-300 mt-3 font-medium tracking-widest uppercase">
        Generated by Tewomi
      </p>
    </div>
  );
};

export default LivePreview;
