
import React, { useState, useEffect } from 'react';
import { Invoice, LineItem, InvoiceStatus, BusinessProfile } from '../types';
import { CURRENCY } from '../constants';
import { storageService } from '../services/storageService';
import { Plus, Trash2, Wand2, Loader2, Save, AlertCircle } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface InvoiceFormProps {
  initialData?: Invoice;
  onSave: (invoice: Invoice) => void;
  onCancel: () => void;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ initialData, onSave, onCancel }) => {
  const user = storageService.getUser();
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiText, setAiText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [invoice, setInvoice] = useState<Invoice>(initialData || {
    id: crypto.randomUUID(),
    invoiceNumber: storageService.getNextInvoiceNumber(),
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: InvoiceStatus.DRAFT,
    business: user?.businessProfile || { name: '', email: '', bankName: '', accountName: '', accountNumber: '' },
    client: { name: '', email: '' },
    items: [{ id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, total: 0 }],
    subtotal: 0,
    total: 0
  });

  // Calculate totals whenever items change
  useEffect(() => {
    const subtotal = invoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    setInvoice(prev => ({ ...prev, subtotal, total: subtotal }));
  }, [invoice.items]);

  const handleAddItem = () => {
    setInvoice(prev => ({
      ...prev,
      items: [...prev.items, { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, total: 0 }]
    }));
  };

  const handleRemoveItem = (id: string) => {
    if (invoice.items.length === 1) return;
    setInvoice(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const handleItemChange = (id: string, field: keyof LineItem, value: any) => {
    setInvoice(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          const newItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unitPrice') {
            newItem.total = (newItem.quantity || 0) * (newItem.unitPrice || 0);
          }
          return newItem;
        }
        return item;
      })
    }));
  };

  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setInvoice({ ...invoice, business: { ...invoice.business, accountNumber: value } });
    if (error) setError(null);
  };

  const handleAIProcess = async () => {
    if (!aiText.trim()) return;
    setLoadingAI(true);
    try {
      const result = await geminiService.parseWorkDescription(aiText);
      if (result.items && result.items.length > 0) {
        const newItems: LineItem[] = result.items.map((item: any) => ({
          id: crypto.randomUUID(),
          description: item.description || 'Service',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          total: (item.quantity || 1) * (item.unitPrice || 0)
        }));
        setInvoice(prev => ({
          ...prev,
          items: newItems,
          client: { ...prev.client, name: result.clientName || prev.client.name }
        }));
        setAiText('');
      }
    } catch (err) {
      alert("Failed to process with AI. Please try manual entry.");
    } finally {
      setLoadingAI(false);
    }
  };

  const validateAndSave = () => {
    if (invoice.business.accountNumber.length !== 10) {
      setError("Account number must be exactly 10 digits.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    onSave(invoice);
  };

  return (
    <div className="space-y-8 pb-20">
      <section className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Wand2 className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-indigo-900">AI Assistant</h2>
        </div>
        <p className="text-sm text-indigo-700 mb-4">
          Describe the work done in plain English (e.g., "Built a React dashboard for 50k and handled 3 hours of consulting at 5k/hr for Kola")
        </p>
        <div className="flex gap-2">
          <textarea
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            placeholder="Describe your work here..."
            className="flex-1 p-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none h-24"
          />
          <button
            onClick={handleAIProcess}
            disabled={loadingAI || !aiText}
            className="bg-indigo-600 text-white px-6 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex flex-col items-center justify-center min-w-[120px]"
          >
            {loadingAI ? <Loader2 className="animate-spin mb-1" /> : <Wand2 className="mb-1" />}
            <span>Auto-fill</span>
          </button>
        </div>
      </section>

      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-8">
        {/* Header Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 border-b pb-2">Business Details (Sender)</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Business Name</label>
                <input
                  type="text"
                  value={invoice.business.name}
                  onChange={(e) => setInvoice({ ...invoice, business: { ...invoice.business, name: e.target.value } })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={invoice.business.bankName}
                    onChange={(e) => setInvoice({ ...invoice, business: { ...invoice.business, bankName: e.target.value } })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Account Number (10 digits)</label>
                  <input
                    type="text"
                    value={invoice.business.accountNumber}
                    onChange={handleAccountNumberChange}
                    className={`w-full p-2 border rounded font-mono font-bold ${error ? 'border-red-500' : ''}`}
                    placeholder="10 digits"
                  />
                  {error && (
                    <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1 uppercase">
                      <AlertCircle className="w-3 h-3" /> {error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 border-b pb-2">Client Details (Recipient)</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Client Name</label>
                <input
                  type="text"
                  value={invoice.client.name}
                  onChange={(e) => setInvoice({ ...invoice, client: { ...invoice.client, name: e.target.value } })}
                  className="w-full p-2 border rounded"
                  placeholder="e.g. Kola Adisa"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Client Email</label>
                <input
                  type="email"
                  value={invoice.client.email}
                  onChange={(e) => setInvoice({ ...invoice, client: { ...invoice.client, email: e.target.value } })}
                  className="w-full p-2 border rounded"
                  placeholder="client@email.com"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dates & Meta */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Invoice Number</label>
            <input
              type="text"
              value={invoice.invoiceNumber}
              onChange={(e) => setInvoice({ ...invoice, invoiceNumber: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Issue Date</label>
            <input
              type="date"
              value={invoice.issueDate}
              onChange={(e) => setInvoice({ ...invoice, issueDate: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Due Date</label>
            <input
              type="date"
              value={invoice.dueDate}
              onChange={(e) => setInvoice({ ...invoice, dueDate: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        {/* Line Items */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 border-b pb-2">Line Items</h3>
          <div className="space-y-3">
            {invoice.items.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-3 items-end group">
                <div className="col-span-12 md:col-span-6">
                  <label className="md:hidden text-xs font-semibold text-gray-500 uppercase mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <label className="md:hidden text-xs font-semibold text-gray-500 uppercase mb-1">Qty</label>
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value))}
                    className="w-full p-2 border rounded text-right"
                  />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <label className="md:hidden text-xs font-semibold text-gray-500 uppercase mb-1">Price</label>
                  <input
                    type="number"
                    placeholder="Price"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value))}
                    className="w-full p-2 border rounded text-right"
                  />
                </div>
                <div className="col-span-3 md:col-span-1 text-right text-gray-600 font-medium py-2">
                  {CURRENCY}{(item.quantity * item.unitPrice).toLocaleString()}
                </div>
                <div className="col-span-1 md:col-span-1 flex justify-center">
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleAddItem}
            className="flex items-center gap-2 text-indigo-600 font-medium hover:text-indigo-700 transition py-2"
          >
            <Plus className="w-4 h-4" /> Add Line Item
          </button>
        </div>

        {/* Totals */}
        <div className="flex flex-col items-end pt-8 space-y-2 border-t">
          <div className="flex justify-between w-64 text-gray-600">
            <span>Subtotal</span>
            <span>{CURRENCY}{invoice.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between w-64 text-xl font-bold text-gray-900 pt-2 border-t mt-2">
            <span>Total</span>
            <span>{CURRENCY}{invoice.total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg z-50">
        <div className="max-w-4xl mx-auto flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={validateAndSave}
            className="px-8 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Invoice
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceForm;
