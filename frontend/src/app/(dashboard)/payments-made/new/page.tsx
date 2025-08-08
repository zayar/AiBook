'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { VendorPaymentAPI, CreateVendorPaymentData, PendingBill } from '@/lib/vendor-payment-api';
import { ChartOfAccountsAPI, Account } from '@/lib/chart-of-accounts-api';
import { vendorApi, Vendor } from '@/lib/vendor-api';

interface BillAllocation {
  billId: string;
  billNumber: string;
  totalAmount: number;
  remainingAmount: number;
  amountToPay: number;
  dueDate: string;
  isOverdue: boolean;
}

const NewPaymentMadePage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form data
  const [formData, setFormData] = useState<CreateVendorPaymentData>({
    vendorId: '',
    amount: 0,
    bankCharges: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'CASH',
    paidThroughId: '', // Keep for backward compatibility
    paidThroughAccountId: '', // NEW: Chart of Accounts integration
    referenceNumber: '',
    taxDeducted: false,
    taxAmount: 0,
    notes: '',
    internalNotes: '',
    billPayments: [],
    branch: 'Head Office',
  });

  // Options data
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<Account[]>([]);
  const [paidThroughAccounts, setPaidThroughAccounts] = useState<any[]>([]); // Chart of Accounts for paid through selection
  const [pendingBills, setPendingBills] = useState<PendingBill[]>([]);
  const [billAllocations, setBillAllocations] = useState<BillAllocation[]>([]);
  const [nextPaymentNumber, setNextPaymentNumber] = useState<string>('');

  // Custom dropdown states
  const [isPaidThroughDropdownOpen, setIsPaidThroughDropdownOpen] = useState(false);
  const [paidThroughSearchTerm, setPaidThroughSearchTerm] = useState('');

  // Loading states
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingBills, setLoadingBills] = useState(false);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([
          loadVendors(),
          loadAccounts(),
          loadNextPaymentNumber(),
        ]);
      } catch (error) {
        console.error('Error loading initial data:', error);
        setError('Failed to load form data');
      }
    };

    loadInitialData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.paid-through-dropdown')) {
        setIsPaidThroughDropdownOpen(false);
        setPaidThroughSearchTerm('');
      }
    };

    if (isPaidThroughDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPaidThroughDropdownOpen]);

  const loadVendors = async () => {
    try {
      setLoadingVendors(true);
      const response = await vendorApi.getVendors({ limit: 100 });
      setVendors(response.vendors);
    } catch (error) {
      console.error('Error loading vendors:', error);
    } finally {
      setLoadingVendors(false);
    }
  };

  const loadAccounts = async () => {
    try {
      setLoadingAccounts(true);
      
      // Get paid through accounts from Chart of Accounts
      const response = await VendorPaymentAPI.getPaidThroughAccounts();
      setPaidThroughAccounts(response.accounts || []);
      
      // Set default paid through account if available
      const defaultAccount = response.accounts?.find(acc => acc.type === 'CASH');
      if (defaultAccount && !formData.paidThroughAccountId) {
        setFormData(prev => ({ ...prev, paidThroughAccountId: defaultAccount.id }));
      } else if (response.accounts?.length > 0 && !formData.paidThroughAccountId) {
        setFormData(prev => ({ ...prev, paidThroughAccountId: response.accounts[0].id }));
      }
    } catch (error) {
      console.error('Error loading paid through accounts:', error);
      setPaidThroughAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadNextPaymentNumber = async () => {
    try {
      const response = await VendorPaymentAPI.getNextPaymentNumber();
      setNextPaymentNumber(response.paymentNumber);
    } catch (error) {
      console.error('Error loading next payment number:', error);
    }
  };

  const loadVendorBills = async (vendorId: string) => {
    if (!vendorId) {
      setPendingBills([]);
      setBillAllocations([]);
      return;
    }

    try {
      setLoadingBills(true);
      const response = await VendorPaymentAPI.getVendorPendingBills(vendorId);
      setPendingBills(response.pendingBills);
      
      // Initialize bill allocations
      const allocations: BillAllocation[] = response.pendingBills.map(bill => ({
        billId: bill.id,
        billNumber: bill.billNumber,
        totalAmount: bill.totalAmount,
        remainingAmount: bill.remainingAmount,
        amountToPay: 0,
        dueDate: bill.dueDate,
        isOverdue: bill.isOverdue,
      }));
      setBillAllocations(allocations);
    } catch (error) {
      console.error('Error loading vendor bills:', error);
    } finally {
      setLoadingBills(false);
    }
  };

  const handleVendorChange = (vendorId: string) => {
    setFormData(prev => ({ ...prev, vendorId }));
    loadVendorBills(vendorId);
  };

  const handleBillAllocationChange = (billId: string, amount: number) => {
    setBillAllocations(prev => 
      prev.map(allocation => 
        allocation.billId === billId 
          ? { ...allocation, amountToPay: Math.min(amount, allocation.remainingAmount) }
          : allocation
      )
    );

    // Update total amount
    const newAllocations = billAllocations.map(allocation => 
      allocation.billId === billId 
        ? { ...allocation, amountToPay: Math.min(amount, allocation.remainingAmount) }
        : allocation
    );
    
    const totalAllocated = newAllocations.reduce((sum, allocation) => sum + allocation.amountToPay, 0);
    setFormData(prev => ({ ...prev, amount: totalAllocated }));
  };

  const handlePayFullAmount = (billId: string) => {
    const allocation = billAllocations.find(a => a.billId === billId);
    if (allocation) {
      handleBillAllocationChange(billId, allocation.remainingAmount);
    }
  };

  const calculateNetAmount = () => {
    return formData.amount + formData.bankCharges + formData.taxAmount;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validation
      if (!formData.paidThroughAccountId) {
        setError('Please select a paid through account');
        setLoading(false);
        return;
      }

      // Prepare bill payments from allocations
      const billPayments = billAllocations
        .filter(allocation => allocation.amountToPay > 0)
        .map(allocation => ({
          billId: allocation.billId,
          amount: allocation.amountToPay,
        }));

      const paymentData: CreateVendorPaymentData = {
        ...formData,
        paidThroughId: formData.paidThroughAccountId, // Map to the expected field
        billPayments: billPayments.length > 0 ? billPayments : undefined,
      };

      const response = await VendorPaymentAPI.createVendorPayment(paymentData);
      setSuccess(true);
      
      // Redirect to the created payment
      setTimeout(() => {
        router.push(`/payments-made/${response.vendorPayment.id}`);
      }, 2000);
    } catch (error: any) {
      console.error('Error creating vendor payment:', error);
      setError(error.response?.data?.error || 'Failed to create payment');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `MMK ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Helper functions for custom dropdown
  const getSelectedPaidThroughAccount = () => {
    return paidThroughAccounts.find(acc => acc.id === formData.paidThroughAccountId);
  };

  const getFilteredPaidThroughAccounts = () => {
    if (!paidThroughSearchTerm) return paidThroughAccounts;
    return paidThroughAccounts.filter(acc => 
      acc.name.toLowerCase().includes(paidThroughSearchTerm.toLowerCase()) ||
      acc.code.toLowerCase().includes(paidThroughSearchTerm.toLowerCase())
    );
  };

  const handlePaidThroughAccountSelect = (accountId: string) => {
    setFormData(prev => ({ ...prev, paidThroughAccountId: accountId }));
    setIsPaidThroughDropdownOpen(false);
    setPaidThroughSearchTerm('');
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Created Successfully!</h2>
          <p className="text-gray-600">Redirecting to payment details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Record Payment</h1>
              <p className="text-gray-600 mt-1">Create a new vendor payment with bill allocation</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Payment #</div>
              <div className="text-lg font-bold text-gray-900">{nextPaymentNumber}</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vendor Name <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.vendorId}
                  onChange={(e) => handleVendorChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={loadingVendors}
                >
                  <option value="">Select vendor</option>
                  {vendors.map(vendor => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.displayName || vendor.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch
                </label>
                <select
                  value={formData.branch}
                  onChange={(e) => setFormData(prev => ({ ...prev, branch: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Head Office">Head Office</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Mode
                </label>
                <select
                  value={formData.paymentMode}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentMode: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHECK">Check</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="MOBILE_PAYMENT">Mobile Payment</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="relative paid-through-dropdown">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paid Through <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsPaidThroughDropdownOpen(!isPaidThroughDropdownOpen)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-left flex items-center justify-between"
                  disabled={loadingAccounts}
                >
                    <span className={formData.paidThroughAccountId ? 'text-gray-900' : 'text-gray-500'}>
                      {formData.paidThroughAccountId 
                        ? `${getSelectedPaidThroughAccount()?.code} - ${getSelectedPaidThroughAccount()?.name}`
                        : 'Select payment account...'
                      }
                    </span>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${isPaidThroughDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isPaidThroughDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
                      {/* Search Input */}
                      <div className="p-3 border-b border-gray-200">
                        <input
                          type="text"
                          placeholder="Search accounts..."
                          value={paidThroughSearchTerm}
                          onChange={(e) => setPaidThroughSearchTerm(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          autoFocus
                        />
                      </div>
                      
                      {/* Scrollable Options */}
                      <div className="max-h-60 overflow-y-auto">
                        {getFilteredPaidThroughAccounts().length === 0 ? (
                          <div className="px-4 py-3 text-gray-500 text-sm">No accounts found</div>
                        ) : (
                          <>
                            {/* Cash Accounts */}
                            {getFilteredPaidThroughAccounts().filter(acc => acc.type === 'CASH').length > 0 && (
                              <div>
                                <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  💰 Cash
                                </div>
                                {getFilteredPaidThroughAccounts().filter(acc => acc.type === 'CASH').map((account) => (
                                  <button
                                    key={account.id}
                                    type="button"
                                    onClick={() => handlePaidThroughAccountSelect(account.id)}
                                    className={`w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none ${
                                      formData.paidThroughAccountId === account.id ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                                    }`}
                                  >
                                    <div className="font-medium">{account.code} - {account.name}</div>
                                    {account.description && (
                                      <div className="text-xs text-gray-500 mt-1">{account.description}</div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                            
                            {/* Bank Accounts */}
                            {getFilteredPaidThroughAccounts().filter(acc => acc.type === 'BANK').length > 0 && (
                              <div>
                                <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  🏦 Bank
                                </div>
                                {getFilteredPaidThroughAccounts().filter(acc => acc.type === 'BANK').map((account) => (
                                  <button
                                    key={account.id}
                                    type="button"
                                    onClick={() => handlePaidThroughAccountSelect(account.id)}
                                    className={`w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none ${
                                      formData.paidThroughAccountId === account.id ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                                    }`}
                                  >
                                    <div className="font-medium">{account.code} - {account.name}</div>
                                    {account.description && (
                                      <div className="text-xs text-gray-500 mt-1">{account.description}</div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                            
                            {/* Other Current Liabilities */}
                            {getFilteredPaidThroughAccounts().filter(acc => acc.type === 'OTHER_CURRENT_LIABILITY').length > 0 && (
                              <div>
                                <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  📊 Other Current Liabilities
                                </div>
                                {getFilteredPaidThroughAccounts().filter(acc => acc.type === 'OTHER_CURRENT_LIABILITY').map((account) => (
                                  <button
                                    key={account.id}
                                    type="button"
                                    onClick={() => handlePaidThroughAccountSelect(account.id)}
                                    className={`w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none ${
                                      formData.paidThroughAccountId === account.id ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                                    }`}
                                  >
                                    <div className="font-medium">{account.code} - {account.name}</div>
                                    {account.description && (
                                      <div className="text-xs text-gray-500 mt-1">{account.description}</div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                            
                            {/* Other Liabilities */}
                            {getFilteredPaidThroughAccounts().filter(acc => acc.type === 'OTHER_LIABILITY').length > 0 && (
                              <div>
                                <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  📋 Other Liabilities
                                </div>
                                {getFilteredPaidThroughAccounts().filter(acc => acc.type === 'OTHER_LIABILITY').map((account) => (
                                  <button
                                    key={account.id}
                                    type="button"
                                    onClick={() => handlePaidThroughAccountSelect(account.id)}
                                    className={`w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none ${
                                      formData.paidThroughAccountId === account.id ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                                    }`}
                                  >
                                    <div className="font-medium">{account.code} - {account.name}</div>
                                    {account.description && (
                                      <div className="text-xs text-gray-500 mt-1">{account.description}</div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                            
                            {/* Equity Accounts */}
                            {getFilteredPaidThroughAccounts().filter(acc => acc.type === 'EQUITY').length > 0 && (
                              <div>
                                <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  🏛️ Equity
                                </div>
                                {getFilteredPaidThroughAccounts().filter(acc => acc.type === 'EQUITY').map((account) => (
                                  <button
                                    key={account.id}
                                    type="button"
                                    onClick={() => handlePaidThroughAccountSelect(account.id)}
                                    className={`w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none ${
                                      formData.paidThroughAccountId === account.id ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                                    }`}
                                  >
                                    <div className="font-medium">{account.code} - {account.name}</div>
                                    {account.description && (
                                      <div className="text-xs text-gray-500 mt-1">{account.description}</div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                            
                            {/* Other Current Assets */}
                            {getFilteredPaidThroughAccounts().filter(acc => acc.type === 'OTHER_CURRENT_ASSET').length > 0 && (
                              <div>
                                <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  📁 Other Current Assets
                                </div>
                                {getFilteredPaidThroughAccounts().filter(acc => acc.type === 'OTHER_CURRENT_ASSET').map((account) => (
                                  <button
                                    key={account.id}
                                    type="button"
                                    onClick={() => handlePaidThroughAccountSelect(account.id)}
                                    className={`w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none ${
                                      formData.paidThroughAccountId === account.id ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                                    }`}
                                  >
                                    <div className="font-medium">{account.code} - {account.name}</div>
                                    {account.description && (
                                      <div className="text-xs text-gray-500 mt-1">{account.description}</div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                            
                            {/* Other Assets */}
                            {getFilteredPaidThroughAccounts().filter(acc => !['CASH', 'BANK', 'OTHER_CURRENT_LIABILITY', 'OTHER_LIABILITY', 'EQUITY', 'OTHER_CURRENT_ASSET'].includes(acc.type)).length > 0 && (
                              <div>
                                <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  📂 Other Assets
                                </div>
                                {getFilteredPaidThroughAccounts().filter(acc => !['CASH', 'BANK', 'OTHER_CURRENT_LIABILITY', 'OTHER_LIABILITY', 'EQUITY', 'OTHER_CURRENT_ASSET'].includes(acc.type)).map((account) => (
                                  <button
                                    key={account.id}
                                    type="button"
                                    onClick={() => handlePaidThroughAccountSelect(account.id)}
                                    className={`w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none ${
                                      formData.paidThroughAccountId === account.id ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                                    }`}
                                  >
                                    <div className="font-medium">{account.code} - {account.name}</div>
                                    {account.description && (
                                      <div className="text-xs text-gray-500 mt-1">{account.description}</div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {paidThroughAccounts.length === 0 && (
                  <p className="mt-1 text-xs text-red-500">
                    No paid through accounts found. Please add accounts in the Chart of Accounts section first.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter reference number"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.taxDeducted}
                  onChange={(e) => setFormData(prev => ({ ...prev, taxDeducted: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Tax deducted while making payment</span>
              </label>
            </div>
          </div>

          {/* Bill Allocation */}
          {formData.vendorId && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Bill Allocation</h2>
                <button
                  type="button"
                  onClick={() => loadVendorBills(formData.vendorId)}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                  disabled={loadingBills}
                >
                  {loadingBills ? 'Loading...' : 'Refresh Bills'}
                </button>
              </div>

              {loadingBills ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : pendingBills.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No pending bills for this vendor.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bill#
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Branch
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bill Amount
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount Due
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment Made on
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {billAllocations.map((allocation) => (
                        <tr key={allocation.billId} className={allocation.isOverdue ? 'bg-red-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(allocation.dueDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-blue-600">
                                {allocation.billNumber}
                              </span>
                              {allocation.isOverdue && (
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Overdue
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            Head Office
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatCurrency(allocation.totalAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatCurrency(allocation.remainingAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {formData.paymentDate ? formatDate(formData.paymentDate) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <input
                                type="number"
                                value={allocation.amountToPay}
                                onChange={(e) => handleBillAllocationChange(allocation.billId, parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                                min="0"
                                max={allocation.remainingAmount}
                                step="0.01"
                              />
                              <button
                                type="button"
                                onClick={() => handlePayFullAmount(allocation.billId)}
                                className="text-xs text-blue-600 hover:text-blue-700 underline"
                              >
                                Pay in Full
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Payment Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Charges (if any)
                </label>
                <input
                  type="number"
                  value={formData.bankCharges}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankCharges: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.01"
                />
              </div>

              {formData.taxDeducted && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Amount
                  </label>
                  <input
                    type="number"
                    value={formData.taxAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, taxAmount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Total Amount to be Deducted:</span>
                <span className="text-xl font-bold text-gray-900">{formatCurrency(calculateNetAmount())}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Internal use. Not visible to vendor)
                </label>
                <textarea
                  value={formData.internalNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, internalNotes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Enter internal notes..."
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save as Paid'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewPaymentMadePage;