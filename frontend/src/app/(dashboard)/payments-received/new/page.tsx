'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  DollarSign, 
  Calendar,
  CreditCard,
  Building2,
  Banknote,
  User,
  FileText,
  Mail,
  Plus,
  X,
  Calculator
} from 'lucide-react';
import { paymentReceivedAPI, UnpaidInvoice } from '@/lib/payment-received-api';
import { useRouter } from 'next/navigation';
import UltraEnhancedLoading from '@/components/UltraEnhancedLoading';
import Link from 'next/link';

interface Customer {
  id: string;
  name: string;
  email?: string;
}

interface InvoiceAllocation {
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  amountDue: number;
  amountAllocated: number;
}

export default function NewPaymentReceivedPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>([]);
  const [invoiceAllocations, setInvoiceAllocations] = useState<InvoiceAllocation[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [depositAccounts, setDepositAccounts] = useState<any[]>([]); // Chart of Accounts for deposit selection
  const [isDepositDropdownOpen, setIsDepositDropdownOpen] = useState(false);
  const [depositSearchTerm, setDepositSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'CASH',
    depositType: '', // Keep for backward compatibility
    depositToAccountId: '', // NEW: Chart of Accounts integration
    bankCharges: '',
    referenceNumber: '',
    taxDeducted: false,
    taxAmount: '',
    notes: '',
    internalNotes: '',
    sendThankYouEmail: false
  });

  useEffect(() => {
    fetchCustomers();
    fetchDepositAccounts(); // Fetch Chart of Accounts for deposit selection
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.deposit-dropdown')) {
        setIsDepositDropdownOpen(false);
        setDepositSearchTerm('');
      }
    };

    if (isDepositDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDepositDropdownOpen]);

  useEffect(() => {
    if (formData.customerId) {
      fetchUnpaidInvoices(formData.customerId);
    } else {
      setUnpaidInvoices([]);
      setInvoiceAllocations([]);
    }
  }, [formData.customerId]);

  const fetchCustomers = async () => {
    try {
      const response = await paymentReceivedAPI.getCustomers();
      setCustomers(response.customers || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };



  const fetchDepositAccounts = async () => {
    try {
      const response = await paymentReceivedAPI.getDepositAccounts();
      setDepositAccounts(response.accounts || []);
      
      // Set default deposit account if available
      const defaultAccount = response.accounts.find(acc => acc.type === 'CASH');
      if (defaultAccount && !formData.depositToAccountId) {
        setFormData(prev => ({ ...prev, depositToAccountId: defaultAccount.id }));
      } else if (response.accounts.length > 0 && !formData.depositToAccountId) {
        setFormData(prev => ({ ...prev, depositToAccountId: response.accounts[0].id }));
      }
    } catch (error) {
      console.error('Error fetching deposit accounts:', error);
    }
  };

  const fetchUnpaidInvoices = async (customerId: string) => {
    try {
      setLoadingInvoices(true);
      console.log('🔍 Fetching unpaid invoices for customer:', customerId);
      const response = await paymentReceivedAPI.getUnpaidInvoices(customerId);
      console.log('📋 Unpaid invoices response:', response);
      setUnpaidInvoices(response.data || []);
      
      // Reset allocations when customer changes
      setInvoiceAllocations([]);
    } catch (error) {
      console.error('❌ Error fetching unpaid invoices:', error);
      setUnpaidInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    setFormData(prev => ({
      ...prev,
      customerId,
      customerName: customer?.name || ''
    }));
  };

  const addInvoiceAllocation = (invoice: UnpaidInvoice) => {
    const existingAllocation = invoiceAllocations.find(a => a.invoiceId === invoice.id);
    if (existingAllocation) return;

    const newAllocation: InvoiceAllocation = {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      amountDue: invoice.amountDue,
      amountAllocated: Math.min(invoice.amountDue, parseFloat(formData.amount) || 0)
    };

    setInvoiceAllocations(prev => [...prev, newAllocation]);
  };

  const removeInvoiceAllocation = (invoiceId: string) => {
    setInvoiceAllocations(prev => prev.filter(a => a.invoiceId !== invoiceId));
  };

  const updateAllocationAmount = (invoiceId: string, amount: number) => {
    setInvoiceAllocations(prev =>
      prev.map(allocation =>
        allocation.invoiceId === invoiceId
          ? { ...allocation, amountAllocated: Math.min(amount, allocation.amountDue) }
          : allocation
      )
    );
  };

  const getTotalAllocated = () => {
    return invoiceAllocations.reduce((sum, allocation) => sum + allocation.amountAllocated, 0);
  };

  const getUnallocatedAmount = () => {
    const paymentAmount = parseFloat(formData.amount) || 0;
    return paymentAmount - getTotalAllocated();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        customerId: formData.customerId || undefined,
        customerName: formData.customerName || undefined,
        amount: parseFloat(formData.amount),
        paymentDate: formData.paymentDate,
        paymentMode: formData.paymentMode,
        depositType: formData.depositType || undefined, // Keep for backward compatibility
        depositToAccountId: formData.depositToAccountId || undefined, // NEW: Chart of Accounts integration
        bankCharges: formData.bankCharges ? parseFloat(formData.bankCharges) : undefined,
        referenceNumber: formData.referenceNumber || undefined,
        taxDeducted: formData.taxDeducted,
        taxAmount: formData.taxDeducted && formData.taxAmount ? parseFloat(formData.taxAmount) : undefined,
        notes: formData.notes || undefined,
        internalNotes: formData.internalNotes || undefined,
        sendThankYouEmail: formData.sendThankYouEmail,
        invoiceAllocations: invoiceAllocations.length > 0 ? invoiceAllocations.map(allocation => ({
          invoiceId: allocation.invoiceId,
          amountAllocated: allocation.amountAllocated
        })) : undefined
      };

      await paymentReceivedAPI.createPaymentReceived(payload);
      router.push('/payments-received');
    } catch (error) {
      console.error('Error creating payment received:', error);
      alert('Failed to create payment received. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | string, currency: string = 'MMK') => {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numericAmount || 0);
  };

  // Helper functions for custom dropdown
  const getSelectedDepositAccount = () => {
    return depositAccounts.find(acc => acc.id === formData.depositToAccountId);
  };

  const getFilteredDepositAccounts = () => {
    if (!depositSearchTerm) return depositAccounts;
    return depositAccounts.filter(acc => 
      acc.name.toLowerCase().includes(depositSearchTerm.toLowerCase()) ||
      acc.code.toLowerCase().includes(depositSearchTerm.toLowerCase())
    );
  };

  const handleDepositAccountSelect = (accountId: string) => {
    setFormData(prev => ({ ...prev, depositToAccountId: accountId }));
    setIsDepositDropdownOpen(false);
    setDepositSearchTerm('');
  };

  if (loading) {
    return <UltraEnhancedLoading />;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <Link href="/payments-received">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Record Payment</h1>
              <p className="text-gray-600">Encourage faster payments, reduce outstanding invoices and improve cash flow</p>
            </div>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Customer Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-50 p-6 rounded-xl"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Customer Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name *
                </label>
                <select
                  value={formData.customerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a customer or leave blank for walk-in</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch
                </label>
                <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="head-office">Head Office</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Payment Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-gray-200 p-6 rounded-xl"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Payment Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount Received *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">MMK</span>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                {/* Total unpaid amount and quick fill button */}
                {unpaidInvoices.length > 0 && (
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Total unpaid: <span className="font-semibold text-blue-600">
                        {formatCurrency(unpaidInvoices.reduce((sum, inv) => sum + inv.amountDue, 0))}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ 
                        ...prev, 
                        amount: unpaidInvoices.reduce((sum, inv) => sum + inv.amountDue, 0).toString() 
                      }))}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
                    >
                      ✓ Received full amount ({formatCurrency(unpaidInvoices.reduce((sum, inv) => sum + inv.amountDue, 0))})
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Charges (if any)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">MMK</span>
                  <input
                    type="number"
                    name="bankCharges"
                    value={formData.bankCharges}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Date *
                </label>
                <input
                  type="date"
                  name="paymentDate"
                  value={formData.paymentDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Mode
                </label>
                <select
                  name="paymentMode"
                  value={formData.paymentMode}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHECK">Check</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="MOBILE_PAYMENT">Mobile Payment</option>
                  <option value="ONLINE_TRANSFER">Online Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="relative deposit-dropdown">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deposit To *
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDepositDropdownOpen(!isDepositDropdownOpen)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-left flex items-center justify-between"
                  >
                    <span className={formData.depositToAccountId ? 'text-gray-900' : 'text-gray-500'}>
                      {formData.depositToAccountId 
                        ? `${getSelectedDepositAccount()?.code} - ${getSelectedDepositAccount()?.name}`
                        : 'Select deposit account...'
                      }
                    </span>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${isDepositDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isDepositDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
                      {/* Search Input */}
                      <div className="p-3 border-b border-gray-200">
                        <input
                          type="text"
                          placeholder="Search accounts..."
                          value={depositSearchTerm}
                          onChange={(e) => setDepositSearchTerm(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          autoFocus
                        />
                      </div>
                      
                      {/* Scrollable Options */}
                      <div className="max-h-60 overflow-y-auto">
                        {getFilteredDepositAccounts().length === 0 ? (
                          <div className="px-4 py-3 text-gray-500 text-sm">No accounts found</div>
                        ) : (
                          <>
                            {/* Cash Accounts */}
                            {getFilteredDepositAccounts().filter(acc => acc.type === 'CASH').length > 0 && (
                              <div>
                                <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  💰 Cash
                                </div>
                                {getFilteredDepositAccounts().filter(acc => acc.type === 'CASH').map((account) => (
                                  <button
                                    key={account.id}
                                    type="button"
                                    onClick={() => handleDepositAccountSelect(account.id)}
                                    className={`w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none ${
                                      formData.depositToAccountId === account.id ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
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
                            {getFilteredDepositAccounts().filter(acc => acc.type === 'BANK').length > 0 && (
                              <div>
                                <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  🏦 Bank
                                </div>
                                {getFilteredDepositAccounts().filter(acc => acc.type === 'BANK').map((account) => (
                                  <button
                                    key={account.id}
                                    type="button"
                                    onClick={() => handleDepositAccountSelect(account.id)}
                                    className={`w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none ${
                                      formData.depositToAccountId === account.id ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
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
                            {getFilteredDepositAccounts().filter(acc => acc.type === 'OTHER_CURRENT_ASSET').length > 0 && (
                              <div>
                                <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  📁 Other Current Assets
                                </div>
                                {getFilteredDepositAccounts().filter(acc => acc.type === 'OTHER_CURRENT_ASSET').map((account) => (
                                  <button
                                    key={account.id}
                                    type="button"
                                    onClick={() => handleDepositAccountSelect(account.id)}
                                    className={`w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none ${
                                      formData.depositToAccountId === account.id ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
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
                            {getFilteredDepositAccounts().filter(acc => !['CASH', 'BANK', 'OTHER_CURRENT_ASSET'].includes(acc.type)).length > 0 && (
                              <div>
                                <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  📂 Other Assets
                                </div>
                                {getFilteredDepositAccounts().filter(acc => !['CASH', 'BANK', 'OTHER_CURRENT_ASSET'].includes(acc.type)).map((account) => (
                                  <button
                                    key={account.id}
                                    type="button"
                                    onClick={() => handleDepositAccountSelect(account.id)}
                                    className={`w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none ${
                                      formData.depositToAccountId === account.id ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
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
                {depositAccounts.length === 0 && (
                  <p className="mt-1 text-xs text-red-500">
                    No deposit accounts found. Please add accounts in the Chart of Accounts section first.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference#
                </label>
                <input
                  type="text"
                  name="referenceNumber"
                  value={formData.referenceNumber}
                  onChange={handleInputChange}
                  placeholder="Enter reference number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Tax Section */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="taxDeducted"
                  name="taxDeducted"
                  checked={formData.taxDeducted}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="taxDeducted" className="text-sm font-medium text-gray-700">
                  Tax deducted
                </label>
              </div>

              {formData.taxDeducted && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">MMK</span>
                      <input
                        type="number"
                        name="taxAmount"
                        value={formData.taxAmount}
                        onChange={handleInputChange}
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Unpaid Invoices */}
          {formData.customerId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white border border-gray-200 p-6 rounded-xl"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Unpaid Invoices
              </h2>

              {loadingInvoices ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : unpaidInvoices.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-6 gap-4 text-sm font-semibold text-gray-700 pb-3 border-b-2 border-gray-200 bg-gray-50 px-4 py-2 rounded-t-lg">
                    <div className="text-blue-800">Date</div>
                    <div className="text-blue-800">Invoice Number</div>
                    <div className="text-blue-800">Branch</div>
                    <div className="text-blue-800">Invoice Amount</div>
                    <div className="text-blue-800">Amount Due</div>
                    <div className="text-blue-800">Payment Received On</div>
                  </div>

                  {unpaidInvoices.map(invoice => {
                    const isAllocated = invoiceAllocations.some(a => a.invoiceId === invoice.id);
                    
                    return (
                      <div key={invoice.id} className="grid grid-cols-6 gap-4 text-sm py-4 px-4 border-b border-gray-200 hover:bg-blue-50 rounded-lg">
                        <div className="text-gray-800 bg-blue-100 px-2 py-1 rounded text-center font-medium">{new Date(invoice.dueDate).toLocaleDateString()}</div>
                        <div className="font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded text-center">{invoice.invoiceNumber}</div>
                        <div className="text-gray-800 bg-blue-100 px-2 py-1 rounded text-center font-medium">Head Office</div>
                        <div className="text-gray-800 bg-blue-100 px-2 py-1 rounded text-center font-semibold">{formatCurrency(invoice.totalAmount)}</div>
                        <div className="text-gray-800 bg-blue-200 px-2 py-1 rounded text-center font-bold">{formatCurrency(invoice.amountDue)}</div>
                        <div className="text-center">
                          {!isAllocated ? (
                            <button
                              type="button"
                              onClick={() => addInvoiceAllocation(invoice)}
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-full font-medium text-xs transition-colors duration-200"
                            >
                              Apply Payment
                            </button>
                          ) : (
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium text-xs">Applied</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  There are no unpaid invoices associated with this customer.
                </p>
              )}
            </motion.div>
          )}

          {/* Invoice Allocations */}
          {invoiceAllocations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-blue-50 border border-blue-200 p-6 rounded-xl"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Payment Allocation
              </h2>

              <div className="space-y-4">
                {invoiceAllocations.map(allocation => (
                  <div key={allocation.invoiceId} className="flex items-center gap-4 p-4 bg-white border-2 border-blue-200 rounded-lg shadow-sm">
                    <div className="flex-1">
                      <div className="font-bold text-blue-800 text-lg">{allocation.invoiceNumber}</div>
                      <div className="text-sm text-gray-700 font-medium">
                        Amount Due: <span className="font-bold text-blue-600">{formatCurrency(allocation.amountDue)}</span>
                      </div>
                    </div>
                    <div className="w-48">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Amount</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={allocation.amountAllocated}
                          onChange={(e) => updateAllocationAmount(allocation.invoiceId, parseFloat(e.target.value) || 0)}
                          step="0.01"
                          min="0"
                          max={allocation.amountDue}
                          className="flex-1 px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-3 focus:ring-blue-200 focus:border-blue-500 text-gray-900 bg-white font-bold text-center shadow-sm"
                          placeholder="0.00"
                        />
                        <button
                          type="button"
                          onClick={() => updateAllocationAmount(allocation.invoiceId, allocation.amountDue)}
                          className="px-2 py-2 text-xs font-medium text-white bg-green-600 border border-green-700 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-colors"
                          title={`Pay in Full (${formatCurrency(allocation.amountDue)})`}
                        >
                          Pay in Full
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeInvoiceAllocation(allocation.invoiceId)}
                      className="bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-800 p-2 rounded-full transition-colors duration-200"
                      title="Remove allocation"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}

                <div className="pt-6 border-t-2 border-gray-300 bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center text-base py-2">
                    <span className="font-semibold text-gray-700">Total:</span>
                    <span className="font-bold text-gray-900 text-lg">{formatCurrency(parseFloat(formData.amount) || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-base py-2">
                    <span className="font-semibold text-gray-700">Amount Received:</span>
                    <span className="font-bold text-blue-600 text-lg">{formatCurrency(getTotalAllocated())}</span>
                  </div>
                  <div className="flex justify-between items-center text-base py-2">
                    <span className="font-semibold text-gray-700">Amount used for Payments:</span>
                    <span className="font-bold text-green-600 text-lg">{formatCurrency(getTotalAllocated())}</span>
                  </div>
                  <div className="flex justify-between items-center text-base py-2">
                    <span className="font-semibold text-gray-700">Amount Refunded:</span>
                    <span className="font-bold text-gray-600 text-lg">MMK 0.00</span>
                  </div>
                  <div className="flex justify-between items-center text-lg py-3 font-bold text-red-700 bg-red-50 px-3 rounded border-l-4 border-red-400">
                    <span>Amount in Excess:</span>
                    <span className="text-xl">{formatCurrency(Math.max(0, getUnallocatedAmount()))}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Notes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white border border-gray-200 p-6 rounded-xl"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Internal use. Not visible to customer)
                </label>
                <textarea
                  name="internalNotes"
                  value={formData.internalNotes}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add internal notes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachments
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <div className="text-gray-500 mb-2">Upload File</div>
                  <div className="text-sm text-gray-400">You can upload a maximum of 5 files, 5MB each</div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="sendThankYouEmail"
                  checked={formData.sendThankYouEmail}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Email a "Thank you" note for this payment</span>
              </label>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-end gap-4 pt-6"
          >
            <Link href="/payments-received">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </motion.button>
            </Link>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save'}
            </motion.button>
          </motion.div>
        </form>
      </div>
    </div>
  );
}