'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Save, X, Upload, Plus, Calculator, Calendar, Building,
  User, Receipt, FileText, Tag, DollarSign, Percent, 
  CreditCard, AlertCircle, CheckCircle
} from 'lucide-react';
import { ExpenseAPI, CreateExpenseData } from '@/lib/expense-api';
import { ChartOfAccountsAPI } from '@/lib/chart-of-accounts-api';
import { CustomerAPI } from '@/lib/customer-api';
import { vendorApi } from '@/lib/vendor-api';
import { taxAPI } from '@/lib/tax-api';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface Vendor {
  id: string;
  name: string;
  displayName?: string;
}

interface Customer {
  id: string;
  name: string;
}

interface TaxRate {
  id: string;
  name: string;
  rate: number;
  jurisdiction: string;
}

const NewExpensePage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form data
  const [formData, setFormData] = useState<CreateExpenseData>({
    description: '',
    amount: 0,
    taxAmount: 0,
    expenseDate: new Date().toISOString().split('T')[0],
    category: '',
    subcategory: '',
    vendorId: '',
    customerId: '',
    taxRateId: '',
    expenseAccountId: '',
    paidThroughId: '',
    currency: 'MMK',
    exchangeRate: 1,
    billable: false,
    branch: 'Head Office',
    reference: '',
    notes: '',
    receiptFiles: []
  });

  // Options data
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<Array<{
    id: string;
    name: string;
    type: string;
    accountNumber?: string;
    bankName?: string;
    currency: string;
    isDefault: boolean;
    isActive: boolean;
  }>>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [nextExpenseNumber, setNextExpenseNumber] = useState<string>('');

  // Loading states
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingTaxRates, setLoadingTaxRates] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // Auto calculate tax amount when tax rate changes
    if (formData.taxRateId && formData.amount) {
      const selectedTaxRate = taxRates.find(t => t.id === formData.taxRateId);
      if (selectedTaxRate) {
        const taxAmount = (formData.amount * selectedTaxRate.rate) / 100;
        setFormData(prev => ({ ...prev, taxAmount }));
      }
    } else {
      setFormData(prev => ({ ...prev, taxAmount: 0 }));
    }
  }, [formData.taxRateId, formData.amount, taxRates]);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadAccounts(),
        loadVendors(),
        loadCustomers(),
        loadTaxRates(),
        loadNextExpenseNumber()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Failed to load form data');
    }
  };

  const loadAccounts = async () => {
    try {
      setLoadingAccounts(true);
      
      // Get expense accounts (EXPENSE type)
      const expenseAccountsResponse = await ChartOfAccountsAPI.getAccountsByType('EXPENSE');
      setExpenseAccounts(expenseAccountsResponse.accounts);

      // Get payment methods (bank accounts) from banking API
      const paymentMethodsResponse = await ExpenseAPI.getPaymentMethods();
      const activeMethods = paymentMethodsResponse.paymentMethods.filter(pm => pm.isActive);
      setPaymentMethods(activeMethods);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadVendors = async () => {
    try {
      setLoadingVendors(true);
      const response = await vendorApi.getVendors({ limit: 100 });
      setVendors(response.vendors || []);
    } catch (error) {
      console.error('Error loading vendors:', error);
    } finally {
      setLoadingVendors(false);
    }
  };

  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const response = await CustomerAPI.getCustomers({ limit: 100 });
      setCustomers(response.customers || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const loadTaxRates = async () => {
    try {
      setLoadingTaxRates(true);
      const response = await taxAPI.getTaxRates();
      setTaxRates(response.taxRates || []);
    } catch (error) {
      console.error('Error loading tax rates:', error);
    } finally {
      setLoadingTaxRates(false);
    }
  };

  const loadNextExpenseNumber = async () => {
    try {
      const response = await ExpenseAPI.getNextExpenseNumber();
      setNextExpenseNumber(response.expenseNumber);
    } catch (error) {
      console.error('Error loading next expense number:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description || !formData.amount || !formData.expenseAccountId || !formData.paidThroughId) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await ExpenseAPI.createExpense(formData);
      
      setSuccess(true);
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/expenses');
      }, 1500);

    } catch (error) {
      console.error('Error creating expense:', error);
      setError('Failed to create expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = formData.amount + formData.taxAmount;

  if (success) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Expense Created Successfully!</h2>
            <p className="text-gray-600">Redirecting to expenses list...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Expense</h1>
          <p className="text-gray-600 mt-1">Record a new business expense</p>
          {nextExpenseNumber && (
            <p className="text-sm text-blue-600 mt-1">Expense Number: {nextExpenseNumber}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/expenses')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
          >
            <X className="w-4 h-4 inline mr-2" />
            Cancel
          </button>
          <button
            type="submit"
            form="expense-form"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            {loading ? 'Creating...' : 'Create Expense'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Form */}
      <form id="expense-form" onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Basic Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter expense description"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expense Date *
              </label>
              <input
                type="date"
                value={formData.expenseDate}
                onChange={(e) => handleInputChange('expenseDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select category</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Travel & Transport">Travel & Transport</option>
                <option value="Meals & Entertainment">Meals & Entertainment</option>
                <option value="Software & Technology">Software & Technology</option>
                <option value="Utilities">Utilities</option>
                <option value="Rent & Facilities">Rent & Facilities</option>
                <option value="Professional Services">Professional Services</option>
                <option value="Marketing & Advertising">Marketing & Advertising</option>
                <option value="Training & Education">Training & Education</option>
                <option value="Insurance">Insurance</option>
                <option value="Telecommunications">Telecommunications</option>
                <option value="Maintenance & Repairs">Maintenance & Repairs</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subcategory
              </label>
              <input
                type="text"
                value={formData.subcategory}
                onChange={(e) => handleInputChange('subcategory', e.target.value)}
                placeholder="Optional subcategory"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch
              </label>
              <select
                value={formData.branch}
                onChange={(e) => handleInputChange('branch', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Head Office">Head Office</option>
                <option value="Branch 1">Branch 1</option>
                <option value="Branch 2">Branch 2</option>
                <option value="Remote">Remote</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference #
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => handleInputChange('reference', e.target.value)}
                placeholder="Optional reference number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Amount & Tax Information */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Amount & Tax Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="MMK">MMK</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="SGD">SGD</option>
                <option value="THB">THB</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax Rate
              </label>
              <select
                value={formData.taxRateId}
                onChange={(e) => handleInputChange('taxRateId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loadingTaxRates}
              >
                <option value="">No Tax</option>
                {taxRates.map(taxRate => (
                  <option key={taxRate.id} value={taxRate.id}>
                    {taxRate.name} ({taxRate.rate}%)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax Amount
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.taxAmount}
                onChange={(e) => handleInputChange('taxAmount', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                readOnly
              />
            </div>
          </div>

          {/* Total Amount Display */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">Total Amount:</span>
              <span className="text-lg font-bold text-blue-900">
                {ExpenseAPI.formatAmount(totalAmount, formData.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Accounts */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Building className="w-5 h-5" />
            Account Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expense Account *
              </label>
              <select
                value={formData.expenseAccountId}
                onChange={(e) => handleInputChange('expenseAccountId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={loadingAccounts}
              >
                <option value="">Select expense account</option>
                {expenseAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.code} - {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paid Through *
              </label>
              <select
                value={formData.paidThroughId}
                onChange={(e) => handleInputChange('paidThroughId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={loadingAccounts}
              >
                <option value="">Select payment account</option>
                {paymentMethods.map(method => (
                  <option key={method.id} value={method.id}>
                    {method.name} {method.accountNumber ? `(${method.accountNumber})` : ''} {method.bankName ? `- ${method.bankName}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Vendor & Customer */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <User className="w-5 h-5" />
            Vendor & Customer Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vendor
              </label>
              <select
                value={formData.vendorId}
                onChange={(e) => handleInputChange('vendorId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loadingVendors}
              >
                <option value="">Select vendor (optional)</option>
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.displayName || vendor.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer
              </label>
              <select
                value={formData.customerId}
                onChange={(e) => handleInputChange('customerId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loadingCustomers}
              >
                <option value="">Select customer (optional)</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="billable"
                  checked={formData.billable}
                  onChange={(e) => handleInputChange('billable', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="billable" className="text-sm font-medium text-gray-700">
                  This expense is billable to customer
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">Check this if the expense should be charged to a customer</p>
            </div>
          </div>
        </div>

        {/* Notes & Receipts */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Notes & Attachments
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Add any additional notes or details about this expense..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Receipt Files
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Drag and drop receipt files here, or click to browse</p>
                <p className="text-xs text-gray-500 mt-1">Supported formats: PDF, JPG, PNG (Max 10MB each)</p>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    // Handle file upload here
                    console.log('Files selected:', e.target.files);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewExpensePage;