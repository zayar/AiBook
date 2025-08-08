'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Plus, X, Calendar, DollarSign, FileText, Building, Save } from 'lucide-react';
import { billApi } from '@/lib/bill-api';
import { vendorApi } from '@/lib/vendor-api';

interface BillItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  accountCode: string;
}

interface Vendor {
  id: string;
  name: string;
  displayName?: string;
  email?: string;
  phone?: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface Bill {
  id: string;
  billNumber: string;
  vendorId: string;
  billDate: string;
  dueDate: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  paidAmount: string;
  status: string;
  currency: string;
  notes?: string;
  vendor: Vendor;
  items: BillItem[];
}

export default function EditBillPage() {
  const router = useRouter();
  const params = useParams();
  const billId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [originalBill, setOriginalBill] = useState<Bill | null>(null);

  const [formData, setFormData] = useState({
    billNumber: '',
    vendorId: '',
    billDate: '',
    dueDate: '',
    subtotal: 0,
    taxAmount: 0,
    totalAmount: 0,
    currency: 'MMK',
    notes: '',
    items: [{
      description: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      taxRate: 0,
      accountCode: '6000'
    }] as BillItem[]
  });

  useEffect(() => {
    if (billId) {
      loadInitialData();
    }
  }, [billId]);

  const loadInitialData = async () => {
    try {
      setInitialLoading(true);
      
      const [billResponse, vendorsData, accountsResponse] = await Promise.all([
        billApi.getBillById(billId),
        vendorApi.getVendors({ page: 1, limit: 100 }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts`, {
          headers: { 'x-tenant-id': 'default' }
        })
      ]);

      const billData = billResponse.bill;
      setOriginalBill(billData);
      setVendors(vendorsData.vendors);

      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        const expenseAccounts = accountsData.accounts.filter((acc: Account) => 
          acc.type === 'EXPENSE' || acc.type === 'ASSET'
        );
        setAccounts(expenseAccounts);
      }

      // Populate form with existing bill data
      setFormData({
        billNumber: billData.billNumber,
        vendorId: billData.vendorId,
        billDate: billData.billDate.split('T')[0],
        dueDate: billData.dueDate.split('T')[0],
        subtotal: parseFloat(billData.subtotal),
        taxAmount: parseFloat(billData.taxAmount),
        totalAmount: parseFloat(billData.totalAmount),
        currency: billData.currency,
        notes: billData.notes || '',
        items: billData.items.map(item => ({
          id: item.id,
          description: item.description,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          totalPrice: parseFloat(item.totalPrice),
          taxRate: parseFloat(item.taxRate),
          accountCode: item.accountCode
        }))
      });
    } catch (error) {
      console.error('Error loading initial data:', error);
      setErrors({ submit: 'Failed to load bill data' });
    } finally {
      setInitialLoading(false);
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        description: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        taxRate: 0,
        accountCode: '6000'
      }]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, items: newItems }));
      calculateTotals(newItems);
    }
  };

  const updateItem = (index: number, field: keyof BillItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Calculate total price for the item
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].totalPrice = newItems[index].quantity * newItems[index].unitPrice;
    }

    setFormData(prev => ({ ...prev, items: newItems }));
    calculateTotals(newItems);
  };

  const calculateTotals = (items: BillItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = items.reduce((sum, item) => 
      sum + (item.totalPrice * item.taxRate / 100), 0
    );
    const totalAmount = subtotal + taxAmount;

    setFormData(prev => ({
      ...prev,
      subtotal,
      taxAmount,
      totalAmount
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // Validation
      const newErrors: Record<string, string> = {};
      
      if (!formData.vendorId) {
        newErrors.vendorId = 'Vendor is required';
      }
      
      if (formData.items.some(item => !item.description.trim())) {
        newErrors.items = 'All items must have a description';
      }

      if (formData.items.some(item => item.quantity <= 0)) {
        newErrors.items = 'All items must have a positive quantity';
      }

      if (formData.items.some(item => item.unitPrice <= 0)) {
        newErrors.items = 'All items must have a positive unit price';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setLoading(false);
        return;
      }

      const billData = {
        billNumber: formData.billNumber,
        vendorId: formData.vendorId,
        billDate: formData.billDate,
        dueDate: formData.dueDate,
        subtotal: formData.subtotal,
        taxAmount: formData.taxAmount,
        totalAmount: formData.totalAmount,
        currency: formData.currency,
        notes: formData.notes.trim() || undefined,
        items: formData.items.map(item => ({
          id: item.id,
          description: item.description.trim(),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          taxRate: item.taxRate,
          accountCode: item.accountCode
        }))
      };

      await billApi.updateBill(billId, billData);
      router.push(`/bills/${billId}`);
    } catch (error: any) {
      console.error('Error updating bill:', error);
      setErrors({ submit: error.message || 'Failed to update bill' });
    } finally {
      setLoading(false);
    }
  };

  const selectedVendor = vendors.find(v => v.id === formData.vendorId);

  if (initialLoading) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!originalBill) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">Bill not found</p>
            <button
              onClick={() => router.push('/bills')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Bills
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Bill {formData.billNumber}</h1>
            <p className="text-gray-600">Update bill details and line items</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => router.push(`/bills/${billId}`)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Updating...' : 'Update Bill'}</span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {errors.submit && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{errors.submit}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bill Details Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Bill Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.billNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, billNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={originalBill.status === 'PAID'} // Disable if paid
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={formData.billDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, billDate: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Vendor Selection Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Building className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Vendor Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Vendor <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.vendorId}
                onChange={(e) => setFormData(prev => ({ ...prev, vendorId: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.vendorId ? 'border-red-300' : 'border-gray-300'
                }`}
                required
                disabled={originalBill.status === 'PAID'} // Disable if paid
              >
                <option value="">Choose a vendor...</option>
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.displayName || vendor.name}
                    {vendor.email && ` (${vendor.email})`}
                  </option>
                ))}
              </select>
              {errors.vendorId && (
                <p className="mt-1 text-sm text-red-600">{errors.vendorId}</p>
              )}
            </div>

            {selectedVendor && (
              <div className="p-4 bg-gray-50 rounded-lg border">
                <h3 className="font-medium text-gray-900 mb-2">{selectedVendor.displayName || selectedVendor.name}</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  {selectedVendor.email && (
                    <p>Email: {selectedVendor.email}</p>
                  )}
                  {selectedVendor.phone && (
                    <p>Phone: {selectedVendor.phone}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Line Items Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Line Items</h2>
            </div>
            {originalBill.status !== 'PAID' && (
              <button
                type="button"
                onClick={addItem}
                className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            )}
          </div>

          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Item {index + 1}</h3>
                  {formData.items.length > 1 && originalBill.status !== 'PAID' && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Item description"
                      required
                      disabled={originalBill.status === 'PAID'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account
                    </label>
                    <select
                      value={item.accountCode}
                      onChange={(e) => updateItem(index, 'accountCode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={originalBill.status === 'PAID'}
                    >
                      {accounts.map(account => (
                        <option key={account.id} value={account.code}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={originalBill.status === 'PAID'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Price
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={originalBill.status === 'PAID'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={item.taxRate}
                      onChange={(e) => updateItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={originalBill.status === 'PAID'}
                    />
                  </div>
                </div>

                <div className="mt-3 text-right">
                  <span className="text-sm text-gray-600">
                    Total: <span className="font-medium text-gray-900">{formData.currency} {item.totalPrice.toLocaleString()}</span>
                  </span>
                </div>
              </div>
            ))}

            {errors.items && (
              <p className="text-sm text-red-600">{errors.items}</p>
            )}
          </div>
        </div>

        {/* Totals Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Bill Summary</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes..."
                disabled={originalBill.status === 'PAID'}
              />
            </div>

            <div className="border-t pt-4">
              <div className="space-y-2 text-right">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formData.currency} {formData.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax Amount:</span>
                  <span className="font-medium">{formData.currency} {formData.taxAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                  <span>Total Amount:</span>
                  <span className="text-blue-600">{formData.currency} {formData.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {originalBill.status === 'PAID' && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  <strong>Note:</strong> This bill has been paid and most fields are read-only. 
                  Contact your administrator if changes are needed.
                </p>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}