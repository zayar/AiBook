'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, X, Calendar, DollarSign, FileText, Building, Save, Search, ShoppingCart } from 'lucide-react';
import { billApi } from '@/lib/bill-api';
import { vendorApi } from '@/lib/vendor-api';
import { ItemAPI } from '@/lib/item-api';
import { taxAPI } from '@/lib/tax-api';

interface BillItem {
  itemId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  taxRateId?: string;
  accountCode: string;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  description?: string;
  unitPrice: number;
  unitCost: number;
  category?: string;
  assetAccount?: {
    code: string;
    name: string;
  };
  cogsAccount?: {
    code: string;
    name: string;
  };
}

interface TaxRate {
  id: string;
  name: string;
  rate: string;
  jurisdiction: string;
  taxType: string;
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

export default function NewBillPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [nextBillNumber, setNextBillNumber] = useState('');
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [newItemData, setNewItemData] = useState({
    name: '',
    sku: '',
    description: '',
    unitPrice: 0,
    unitCost: 0,
    category: '',
    assetAccountId: '',
    cogsAccountId: ''
  });

  const [formData, setFormData] = useState({
    billNumber: '',
    vendorId: '',
    billDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    subtotal: 0,
    taxAmount: 0,
    totalAmount: 0,
    currency: 'MMK',
    notes: '',
    items: [{
      itemId: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      taxRate: 0,
      taxRateId: '',
      accountCode: '6000' // Default to Office Expenses
    }] as BillItem[]
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setInitialLoading(true);
      const [vendorsData, nextNumber, accountsResponse, itemsData, taxRatesData] = await Promise.all([
        vendorApi.getVendors({ page: 1, limit: 100 }),
        billApi.getNextBillNumber(),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts`, {
          headers: { 'x-tenant-id': 'default' }
        }),
        ItemAPI.getItems({ page: 1, limit: 100, isActive: true }),
        taxAPI.getTaxRates()
      ]);

      setVendors(vendorsData.vendors);
      setNextBillNumber(nextNumber.billNumber);
      setFormData(prev => ({ ...prev, billNumber: nextNumber.billNumber }));

      // Set items data
      if (itemsData?.data) {
        setItems(itemsData.data);
      }

      // Set tax rates data
      if (taxRatesData?.taxRates) {
        setTaxRates(taxRatesData.taxRates);
      }

      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        const expenseAccounts = accountsData.accounts.filter((acc: Account) => 
          acc.type === 'EXPENSE' || acc.type === 'ASSET'
        );
        setAccounts(expenseAccounts);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        itemId: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        taxRate: 0,
        taxRateId: '',
        accountCode: '6000'
      }]
    }));
  };

  const handleItemSelect = (index: number, itemId: string) => {
    const selectedItem = items.find(item => item.id === itemId);
    if (selectedItem) {
      const newItems = [...formData.items];
      newItems[index] = {
        ...newItems[index],
        itemId: selectedItem.id,
        description: selectedItem.name,
        unitPrice: selectedItem.unitPrice,
        totalPrice: selectedItem.unitPrice * newItems[index].quantity,
        accountCode: selectedItem.cogsAccount?.code || selectedItem.assetAccount?.code || '6000'
      };
      setFormData(prev => ({ ...prev, items: newItems }));
      calculateTotals(newItems);
    }
  };

  const handleTaxRateSelect = (index: number, taxRateId: string) => {
    const selectedTax = taxRates.find(tax => tax.id === taxRateId);
    if (selectedTax) {
      const newItems = [...formData.items];
      newItems[index] = {
        ...newItems[index],
        taxRateId: selectedTax.id,
        taxRate: parseFloat(selectedTax.rate)
      };
      // Recalculate total price with tax
      newItems[index].totalPrice = newItems[index].quantity * newItems[index].unitPrice;
      setFormData(prev => ({ ...prev, items: newItems }));
      calculateTotals(newItems);
    }
  };

  const handleCreateNewItem = async () => {
    try {
      setLoading(true);
      
      // Validate new item data
      if (!newItemData.name || !newItemData.sku || !newItemData.assetAccountId || !newItemData.cogsAccountId) {
        setErrors({ newItem: 'Name, SKU, Asset Account, and COGS Account are required' });
        return;
      }

      // Create the new item
      const itemData = {
        name: newItemData.name,
        sku: newItemData.sku,
        description: newItemData.description,
        unitPrice: newItemData.unitPrice,
        unitCost: newItemData.unitCost,
        category: newItemData.category,
        assetAccountId: newItemData.assetAccountId,
        cogsAccountId: newItemData.cogsAccountId,
        quantityOnHand: 0,
        unitOfMeasure: 'each'
      };

      const response = await ItemAPI.createItem(itemData);
      
      // Add the new item to the items list
      setItems(prev => [...prev, response]);
      
      // Reset the form and close modal
      setNewItemData({
        name: '',
        sku: '',
        description: '',
        unitPrice: 0,
        unitCost: 0,
        category: '',
        assetAccountId: '',
        cogsAccountId: ''
      });
      setShowNewItemModal(false);
      setErrors({});
      
    } catch (error: any) {
      console.error('Error creating new item:', error);
      setErrors({ newItem: error.message || 'Failed to create item' });
    } finally {
      setLoading(false);
    }
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
          description: item.description.trim(),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          taxRate: item.taxRate,
          accountCode: item.accountCode
        }))
      };

      await billApi.createBill(billData);
      router.push('/bills');
    } catch (error: any) {
      console.error('Error creating bill:', error);
      setErrors({ submit: error.message || 'Failed to create bill' });
    } finally {
      setLoading(false);
    }
  };

  const selectedVendor = vendors.find(v => v.id === formData.vendorId);

  if (initialLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Bills form...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
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
            <h1 className="text-2xl font-bold text-gray-900">New Bill</h1>
            <p className="text-gray-600">Create a new vendor bill</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => router.push('/bills')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{loading ? 'Creating...' : 'Create Bill'}</span>
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
                placeholder="BILL-0001"
                required
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
            <button
              type="button"
              onClick={addItem}
              className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Item {index + 1}</h3>
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Item Selection Row */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Item
                    </label>
                    <div className="flex space-x-2">
                      <select
                        value={item.itemId}
                        onChange={(e) => handleItemSelect(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select an existing item...</option>
                        {items.map(inventoryItem => (
                          <option key={inventoryItem.id} value={inventoryItem.id}>
                            {inventoryItem.name} ({inventoryItem.sku}) - {formData.currency} {inventoryItem.unitPrice}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowNewItemModal(true)}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        title="Create New Item"
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Item description or type manually"
                      required
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account
                    </label>
                    <select
                      value={item.accountCode}
                      onChange={(e) => updateItem(index, 'accountCode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {accounts.map(account => (
                        <option key={account.id} value={account.code}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pricing and Tax Row */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax Rate
                    </label>
                    <select
                      value={item.taxRateId}
                      onChange={(e) => handleTaxRateSelect(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">No Tax</option>
                      {taxRates.map(taxRate => (
                        <option key={taxRate.id} value={taxRate.id}>
                          {taxRate.name} ({parseFloat(taxRate.rate).toFixed(2)}%) - {taxRate.jurisdiction}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Manual Tax (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={item.taxRate}
                      onChange={(e) => updateItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Override tax rate"
                    />
                  </div>

                  <div className="flex items-end">
                    <div className="w-full">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Line Total
                      </label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-medium">
                        {formData.currency} {item.totalPrice.toLocaleString()}
                      </div>
                    </div>
                  </div>
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
          </div>
        </div>
      </form>

      {/* New Item Modal */}
      {showNewItemModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Create New Item</h2>
              <button
                onClick={() => setShowNewItemModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {errors.newItem && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{errors.newItem}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newItemData.name}
                    onChange={(e) => setNewItemData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter item name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newItemData.sku}
                    onChange={(e) => setNewItemData(prev => ({ ...prev, sku: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter SKU"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newItemData.description}
                    onChange={(e) => setNewItemData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter item description"
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
                    value={newItemData.unitPrice}
                    onChange={(e) => setNewItemData(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Cost
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newItemData.unitCost}
                    onChange={(e) => setNewItemData(prev => ({ ...prev, unitCost: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={newItemData.category}
                    onChange={(e) => setNewItemData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter category"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asset Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newItemData.assetAccountId}
                    onChange={(e) => setNewItemData(prev => ({ ...prev, assetAccountId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Asset Account...</option>
                    {accounts.filter(acc => acc.type === 'ASSET').map(account => (
                      <option key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    COGS Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newItemData.cogsAccountId}
                    onChange={(e) => setNewItemData(prev => ({ ...prev, cogsAccountId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select COGS Account...</option>
                    {accounts.filter(acc => acc.type === 'EXPENSE').map(account => (
                      <option key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t">
              <button
                type="button"
                onClick={() => setShowNewItemModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewItem}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <ShoppingCart className="w-4 h-4" />
                )}
                <span>{loading ? 'Creating...' : 'Create Item'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}