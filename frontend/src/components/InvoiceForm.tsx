'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  accountCode?: string;
  totalPrice: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  paymentTerms: number;
}

interface InvoiceFormData {
  customerId: string;
  dueDate: string;
  currency: string;
  notes: string;
  termsConditions: string;
  recurring: boolean;
  recurringInterval?: 'monthly' | 'quarterly' | 'yearly';
  items: InvoiceItem[];
}

interface AIEnhancement {
  autoCategorization: boolean;
  ocrProcessing: boolean;
  smartSuggestions: boolean;
}

export default function InvoiceForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<InvoiceFormData>({
    customerId: '',
    dueDate: '',
    currency: 'USD',
    notes: '',
    termsConditions: 'Payment due within 30 days. Late fees may apply.',
    recurring: false,
    items: [
      {
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 8.5,
        totalPrice: 0
      }
    ]
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiEnhancements, setAiEnhancements] = useState<AIEnhancement>({
    autoCategorization: true,
    ocrProcessing: true,
    smartSuggestions: true
  });
  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [total, setTotal] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  // Load customers on component mount
  useEffect(() => {
    loadCustomers();
  }, []);

  // Calculate totals when items change
  useEffect(() => {
    calculateTotals();
  }, [formData.items]);

  const loadCustomers = async () => {
    try {
      // Mock data - would fetch from API
      setCustomers([
        { id: '1', name: 'Acme Corporation', email: 'billing@acme.com', paymentTerms: 30 },
        { id: '2', name: 'Tech Solutions Inc', email: 'ap@techsolutions.com', paymentTerms: 15 },
        { id: '3', name: 'Global Industries', email: 'finance@global.com', paymentTerms: 45 }
      ]);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const calculateTotals = () => {
    const sub = formData.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = formData.items.reduce((sum, item) => sum + (item.totalPrice * item.taxRate / 100), 0);
    
    setSubtotal(sub);
    setTaxAmount(tax);
    setTotal(sub + tax);
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: '',
          quantity: 1,
          unitPrice: 0,
          taxRate: 8.5,
          totalPrice: 0
        }
      ]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Recalculate total price for this item
      if (field === 'quantity' || field === 'unitPrice') {
        newItems[index].totalPrice = newItems[index].quantity * newItems[index].unitPrice;
      }
      
      return { ...prev, items: newItems };
    });
  };

  // AI Enhancement: Auto-categorize item description
  const handleDescriptionChange = async (index: number, description: string) => {
    updateItem(index, 'description', description);
    
    if (aiEnhancements.autoCategorization && description.length > 3) {
      try {
        // Simulate AI categorization call
        const suggestedAccount = await categorizeDescription(description);
        if (suggestedAccount) {
          updateItem(index, 'accountCode', suggestedAccount);
        }
      } catch (error) {
        console.warn('AI categorization failed:', error);
      }
    }
  };

  const categorizeDescription = async (description: string): Promise<string | null> => {
    // Mock AI categorization - would call actual AI service
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const desc = description.toLowerCase();
    if (desc.includes('consulting') || desc.includes('service')) return '4100';
    if (desc.includes('software') || desc.includes('license')) return '4200';
    if (desc.includes('product') || desc.includes('goods')) return '4300';
    
    return '4000'; // Default revenue account
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': localStorage.getItem('tenantId') || ''
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        
        // Show success message with AI enhancements info
        alert(`✅ Invoice ${result.invoice.invoiceNumber} created successfully!\n\n🤖 AI Enhancements Applied:\n${JSON.stringify(result.aiEnhancements, null, 2)}`);
        
        // Redirect to invoice detail page
        router.push(`/invoices/${result.invoice.id}`);
      } else {
        const error = await response.json();
        alert(`❌ Error creating invoice: ${error.error}`);
      }
    } catch (error) {
      console.error('Invoice creation error:', error);
      alert('❌ Failed to create invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOCRUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !aiEnhancements.ocrProcessing) return;

    setLoading(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append('receipt', file);

              const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/ai/ocr/receipt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': localStorage.getItem('tenantId') || ''
        },
        body: formDataObj
      });

      if (response.ok) {
        const result = await response.json();
        
        // Auto-populate form with OCR results
        if (result.extractedData.lineItems) {
          setFormData(prev => ({
            ...prev,
            items: result.extractedData.lineItems.map((item: any) => ({
              description: item.description,
              quantity: 1,
              unitPrice: item.amount,
              taxRate: 8.5,
              totalPrice: item.amount,
              accountCode: item.category
            }))
          }));
        }
        
        alert('✅ Receipt processed successfully! Form auto-populated.');
      }
    } catch (error) {
      console.error('OCR processing error:', error);
      alert('❌ Failed to process receipt.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Invoice</h1>
        <p className="text-gray-600">Generate professional invoices with AI-powered enhancements</p>
      </div>

      {/* AI Enhancement Toggle */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">🤖 AI Enhancements</h3>
        <div className="grid grid-cols-3 gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={aiEnhancements.autoCategorization}
              onChange={(e) => setAiEnhancements(prev => ({ ...prev, autoCategorization: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Auto-categorization</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={aiEnhancements.ocrProcessing}
              onChange={(e) => setAiEnhancements(prev => ({ ...prev, ocrProcessing: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <span className="text-sm">OCR Processing</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={aiEnhancements.smartSuggestions}
              onChange={(e) => setAiEnhancements(prev => ({ ...prev, smartSuggestions: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Smart Suggestions</span>
          </label>
        </div>
      </div>

      {/* OCR Upload */}
      {aiEnhancements.ocrProcessing && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h3 className="text-lg font-semibold text-green-900 mb-2">📄 OCR Receipt Processing</h3>
          <p className="text-sm text-green-700 mb-3">Upload a receipt to auto-populate invoice items</p>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleOCRUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer and Basic Info */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
            <select
              required
              value={formData.customerId}
              onChange={(e) => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Customer</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.paymentTerms} days
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Due Date *</label>
            <input
              type="date"
              required
              value={formData.dueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Invoice Items */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Invoice Items</h3>
            <button
              type="button"
              onClick={addItem}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              + Add Item
            </button>
          </div>

          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-3 p-4 bg-gray-50 rounded-lg">
                <div className="col-span-4">
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => handleDescriptionChange(index, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {aiEnhancements.autoCategorization && item.accountCode && (
                    <p className="text-xs text-green-600 mt-1">🤖 Auto-categorized: {item.accountCode}</p>
                  )}
                </div>
                
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="Unit Price"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="Tax %"
                    step="0.01"
                    value={item.taxRate}
                    onChange={(e) => updateItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="col-span-1 flex items-center">
                  <span className="text-sm font-medium">${item.totalPrice.toFixed(2)}</span>
                </div>
                
                <div className="col-span-1 flex items-center">
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-end space-y-2">
            <div className="text-right space-y-1">
              <div className="flex justify-between min-w-[200px]">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-1">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Fields */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
            <textarea
              value={formData.termsConditions}
              onChange={(e) => setFormData(prev => ({ ...prev, termsConditions: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Recurring Options */}
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.recurring}
              onChange={(e) => setFormData(prev => ({ ...prev, recurring: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium">Recurring Invoice</span>
          </label>
          
          {formData.recurring && (
            <select
              value={formData.recurringInterval}
              onChange={(e) => setFormData(prev => ({ ...prev, recurringInterval: e.target.value as any }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <div className="space-x-3">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              {showPreview ? 'Hide Preview' : 'Preview'}
            </button>
          </div>
          
          <div className="space-x-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
            >
              {loading ? '🤖 Creating Invoice...' : 'Create Invoice'}
            </button>
          </div>
        </div>
      </form>

      {/* Invoice Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Invoice Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="border rounded-lg p-6 bg-gray-50">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">INVOICE</h2>
                <p className="text-gray-600">Invoice #: [Auto-generated]</p>
              </div>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold mb-2">Bill To:</h4>
                  <p>{customers.find(c => c.id === formData.customerId)?.name || 'Select Customer'}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Due Date:</h4>
                  <p>{formData.dueDate}</p>
                </div>
              </div>
              
              <table className="w-full mb-6">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="text-left p-2">Description</th>
                    <th className="text-right p-2">Qty</th>
                    <th className="text-right p-2">Price</th>
                    <th className="text-right p-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{item.description || 'Item description'}</td>
                      <td className="text-right p-2">{item.quantity}</td>
                      <td className="text-right p-2">${item.unitPrice.toFixed(2)}</td>
                      <td className="text-right p-2">${item.totalPrice.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="text-right">
                <p>Subtotal: ${subtotal.toFixed(2)}</p>
                <p>Tax: ${taxAmount.toFixed(2)}</p>
                <p className="text-xl font-bold">Total: ${total.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 