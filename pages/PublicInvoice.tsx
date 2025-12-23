
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Invoice } from '../types';
import { storageService } from '../services/storageService';
import { CURRENCY } from '../constants';
import StatusBadge from '../components/StatusBadge';
import { Download, CreditCard, Landmark } from 'lucide-react';
import { pdfService } from '../services/pdfService';

const PublicInvoice: React.FC = () => {
   const { id } = useParams();
   const [invoice, setInvoice] = useState<Invoice | null>(null);

   useEffect(() => {
      if (id) {
         const data = storageService.getInvoiceById(id);
         if (data) setInvoice(data);
      }
   }, [id]);

   if (!invoice) return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
         <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Invoice Not Found</h1>
            <p className="text-gray-500 mt-2">The invoice link you're looking for doesn't exist or has expired.</p>
         </div>
      </div>
   );

   return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
         <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">N</div>
                  <span className="font-bold text-gray-900 text-xl tracking-tight">NaijaInvoice</span>
               </div>
               <button
                  onClick={() => pdfService.generateInvoicePDF(invoice)}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
               >
                  <Download className="w-4 h-4" /> Download PDF
               </button>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border overflow-hidden">
               {/* Header */}
               <div className="p-8 md:p-12 border-b bg-gray-50/50">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                     <div>
                        <StatusBadge status={invoice.status} />
                        <h1 className="text-3xl font-bold text-gray-900 mt-2">Invoice {invoice.invoiceNumber}</h1>
                        <p className="text-gray-500">Issued on {invoice.issueDate}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-sm font-medium text-gray-500 uppercase">Amount Due</p>
                        <p className="text-4xl font-black text-indigo-600">{CURRENCY}{invoice.total.toLocaleString()}</p>
                        <p className="text-sm text-red-500 mt-1 font-medium">Due by {invoice.dueDate}</p>
                     </div>
                  </div>
               </div>

               <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                     <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Billed By</p>
                        <h3 className="text-xl font-bold text-gray-900">{invoice.business.name}</h3>
                        <p className="text-gray-500">{invoice.business.email}</p>
                     </div>

                     <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                        <div className="flex items-center gap-2 mb-3">
                           <Landmark className="w-5 h-5 text-indigo-600" />
                           <p className="font-bold text-indigo-900">Payment Details</p>
                        </div>
                        <div className="space-y-2 text-sm">
                           <div className="flex justify-between">
                              <span className="text-indigo-700/70">Bank Name</span>
                              <span className="font-semibold text-indigo-900">{invoice.business.bankName}</span>
                           </div>
                           <div className="flex justify-between">
                              <span className="text-indigo-700/70">Account Name</span>
                              <span className="font-semibold text-indigo-900">{invoice.business.accountName}</span>
                           </div>
                           <div className="flex justify-between pt-2 border-t border-indigo-200 mt-2">
                              <span className="text-indigo-700 font-medium">Account Number</span>
                              <span className="font-black text-lg text-indigo-600 font-mono">{invoice.business.accountNumber}</span>
                           </div>
                        </div>
                        <p className="text-xs text-indigo-700/60 mt-4 italic text-center">Please use invoice number as transfer description</p>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Billed To</p>
                        <h3 className="text-xl font-bold text-gray-900">{invoice.client.name}</h3>
                        <p className="text-gray-500">{invoice.client.email}</p>
                     </div>

                     <div className="space-y-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Summary</p>
                        <div className="space-y-3">
                           {invoice.items.map(item => (
                              <div key={item.id} className="flex justify-between items-start text-sm">
                                 <div className="flex-1">
                                    <p className="font-medium text-gray-900">{item.description}</p>
                                    <p className="text-gray-500">{item.quantity} × {CURRENCY}{item.unitPrice.toLocaleString()}</p>
                                 </div>
                                 <span className="font-bold text-gray-900">{CURRENCY}{item.total.toLocaleString()}</span>
                              </div>
                           ))}
                        </div>
                        <div className="pt-4 border-t space-y-2">
                           <div className="flex justify-between text-sm text-gray-500">
                              <span>Subtotal</span>
                              <span>{CURRENCY}{invoice.subtotal.toLocaleString()}</span>
                           </div>
                           <div className="flex justify-between text-xl font-bold text-gray-900 pt-2">
                              <span>Total</span>
                              <span>{CURRENCY}{invoice.total.toLocaleString()}</span>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default PublicInvoice;
