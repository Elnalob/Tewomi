
import React from 'react';
import { Invoice } from '../types';
import { CURRENCY } from '../constants';

const LivePreview: React.FC<{ invoice: Invoice }> = ({ invoice }) => {
  return (
    <div className="bg-white dark:bg-slate-50 shadow-2xl rounded-sm border border-gray-100 aspect-[1/1.41] p-8 text-[10px] sm:text-xs overflow-hidden sticky top-24 transition-colors">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">{invoice.business.name || 'Your Business'}</h2>
          <p className="text-gray-500">{invoice.business.email}</p>
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-black text-gray-200">INVOICE</h1>
          <p className="text-gray-400">#{invoice.invoiceNumber}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div>
          <p className="font-bold text-gray-400 uppercase text-[8px] mb-1">Bill To</p>
          <p className="font-bold text-gray-900 text-sm">{invoice.client.name || 'Client Name'}</p>
          {invoice.client.email && <p className="text-gray-500">{invoice.client.email}</p>}
          {invoice.client.phone && <p className="text-gray-500">{invoice.client.phone}</p>}
          {invoice.client.address && <p className="text-gray-500">{invoice.client.address}</p>}
        </div>
        <div className="text-right">
          <p className="font-bold text-gray-400 uppercase text-[8px] mb-1">Date</p>
          <p className="text-gray-900 font-medium">{invoice.issueDate}</p>
          {invoice.dueDate && (
            <>
              <p className="font-bold text-gray-400 uppercase text-[8px] mt-2 mb-1">Due Date</p>
              <p className="text-gray-900 font-medium">{invoice.dueDate}</p>
            </>
          )}
        </div>
      </div>

      <table className="w-full mb-8">
        <thead>
          <tr className="border-b-2 border-gray-900 text-left">
            <th className="py-2 font-bold uppercase text-[8px]">Description</th>
            <th className="py-2 font-bold uppercase text-[8px] text-center">Qty</th>
            <th className="py-2 font-bold uppercase text-[8px] text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {invoice.items.map((item, idx) => (
            <tr key={idx}>
              <td className="py-3 font-medium text-gray-800">
                {item.description || '...'}
                {item.unit && <span className="text-[8px] text-gray-400 ml-1">({item.unit})</span>}
              </td>
              <td className="py-3 text-center text-gray-500">{item.quantity}</td>
              <td className="py-3 text-right font-bold text-gray-900">{CURRENCY}{item.total.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-col items-end space-y-1 ml-auto w-32">
        <div className="flex justify-between w-full text-gray-400">
          <span>Subtotal</span>
          <span>{CURRENCY}{invoice.subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between w-full font-black text-gray-900 pt-2 border-t border-gray-900 text-sm">
          <span>Total</span>
          <span>{CURRENCY}{invoice.total.toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-auto pt-12">
        <div className="p-4 bg-gray-50 rounded border border-dashed border-gray-200">
          <p className="font-bold text-[8px] uppercase text-gray-400 mb-1">Payment Details</p>
          <p className="text-gray-700">{invoice.business.bankName}</p>
          <p className="text-gray-900 font-bold">{invoice.business.accountNumber}</p>
          <p className="text-gray-500 text-[8px]">{invoice.business.accountName}</p>
        </div>
      </div>
    </div>
  );
};

export default LivePreview;
