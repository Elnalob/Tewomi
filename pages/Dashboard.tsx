
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Invoice, InvoiceStatus } from '../types';
import { storageService } from '../services/storageService';
import { CURRENCY } from '../constants';
import StatusBadge from '../components/StatusBadge';
import { Plus, Search, FileText, ChevronRight, TrendingUp, Clock, CheckCircle } from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setInvoices(storageService.getInvoices());
  }, []);

  const filteredInvoices = invoices.filter(inv =>
    inv.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: invoices.reduce((sum, inv) => sum + inv.total, 0),
    paid: invoices.filter(i => i.status === InvoiceStatus.PAID).reduce((sum, inv) => sum + inv.total, 0),
    unpaid: invoices.filter(i => i.status !== InvoiceStatus.PAID).reduce((sum, inv) => sum + inv.total, 0),
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500">Manage your business billing and clients</p>
        </div>
        <button
          onClick={() => navigate('/invoice/new')}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm font-medium"
        >
          <Plus className="w-5 h-5" /> Create New Invoice
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900">{CURRENCY}{stats.total.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Paid</p>
            <p className="text-2xl font-bold text-gray-900">{CURRENCY}{stats.paid.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Outstanding</p>
            <p className="text-2xl font-bold text-gray-900">{CURRENCY}{stats.unpaid.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50/50 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by client or invoice number..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-600 placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Invoice</th>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/invoice/${inv.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-gray-500">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-gray-900">{inv.invoiceNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{inv.client.name}</span>
                        <span className="text-xs text-gray-500">{inv.client.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {CURRENCY}{inv.total.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {inv.dueDate}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 transition" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full text-gray-400 mb-2">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No invoices found</h3>
            <p className="text-gray-500 max-w-xs mx-auto">Start by creating your first invoice. You can even use the AI assistant to help you.</p>
            <button
              onClick={() => navigate('/invoice/new')}
              className="text-indigo-600 font-semibold hover:text-indigo-700"
            >
              Create an invoice now →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
