'use client';

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  X, 
  DollarSign,
  Calendar,
  FileText,
  AlertCircle
} from 'lucide-react';
import { paymentReceivedAPI } from '@/lib/payment-received-api';

interface PaymentRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentRecorded: () => void;
  invoice: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    paidAmount: number;
    currency: string;
    customer: {
      name: string;
    };
  };
}

const PaymentRecordModal: React.FC<PaymentRecordModalProps> = ({
  isOpen,
  onClose,
  onPaymentRecorded,
  invoice
}) => {
  const [depositAccounts, setDepositAccounts] = useState<any[]>([]);
  const [isDepositDropdownOpen, setIsDepositDropdownOpen] = useState(false);
  const [depositSearchTerm, setDepositSearchTerm] = useState('');
  const [amount, setAmount] = useState<string>((invoice.totalAmount - invoice.paidAmount).toString());
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  
  const [formData, setFormData] = useState({
    paymentMode: 'CASH',
    depositToAccountId: '',
  });

  // Load deposit accounts (Chart of Accounts for deposit selection)
  const fetchDepositAccounts = async () => {
    try {
      const response = await paymentReceivedAPI.getDepositAccounts();
      console.log('Deposit accounts response:', response); // Debug log
      
      // Backend returns { success: true, accounts: [...] }
      const accounts = response.accounts || response.data || response || [];
      // Ensure we always set an array
      setDepositAccounts(Array.isArray(accounts) ? accounts : []);
    } catch (error) {
      console.error('Error loading deposit accounts:', error);
      setError('Failed to load deposit accounts');
      setDepositAccounts([]); // Set empty array on error
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDepositAccounts();
    }
  }, [isOpen]);

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

  // Helper functions for deposit accounts
  const getSelectedDepositAccount = () => {
    if (!Array.isArray(depositAccounts)) return null;
    return depositAccounts.find(acc => acc.id === formData.depositToAccountId);
  };

  const getFilteredDepositAccounts = () => {
    if (!Array.isArray(depositAccounts)) return [];
    if (!depositSearchTerm) return depositAccounts;
    return depositAccounts.filter(account =>
      account.name.toLowerCase().includes(depositSearchTerm.toLowerCase()) ||
      account.code.toLowerCase().includes(depositSearchTerm.toLowerCase())
    );
  };

  const handleDepositAccountSelect = (accountId: string) => {
    setFormData(prev => ({ ...prev, depositToAccountId: accountId }));
    setIsDepositDropdownOpen(false);
    setDepositSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRecordPayment = async () => {
    if (!formData.depositToAccountId) {
      setError('Please select a deposit account');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    const remainingBalance = invoice.totalAmount - invoice.paidAmount;
    if (parseFloat(amount) > remainingBalance) {
      setError(`Payment amount cannot exceed remaining balance of ${remainingBalance.toFixed(2)} ${invoice.currency}`);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // OPTIMIZATION: Close modal immediately for better UX
      onClose();
      
      // OPTIMIZATION: Call onPaymentRecorded early for optimistic update
      onPaymentRecorded();

      // Use the payments-received API to record the payment
      await paymentReceivedAPI.createPaymentReceived({
        customerId: undefined, // Invoice payment, not from a customer
        amount: parseFloat(amount),
        paymentDate,
        paymentMode: formData.paymentMode,
        depositToAccountId: formData.depositToAccountId,
        referenceNumber: reference,
        notes,
        invoiceAllocations: [{
          invoiceId: invoice.id,
          amountAllocated: parseFloat(amount)
        }]
      });

      console.log('✅ Payment recorded successfully');
    } catch (error) {
      console.error('Error recording payment:', error);
      // Re-open modal and show error if the payment failed
      // User will need to retry
      alert('Failed to record payment. Please try again.');
      // You could also trigger a data refresh here to revert optimistic updates
      onPaymentRecorded();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Record Payment</h2>
                <p className="text-sm text-gray-500">
                  {invoice.invoiceNumber} • {invoice.customer.name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Invoice Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Invoice Total:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: invoice.currency
                    }).format(invoice.totalAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Remaining:</span>
                  <span className="ml-2 font-semibold text-green-600">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: invoice.currency
                    }).format(invoice.totalAmount - invoice.paidAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <div className="space-y-4">
              {/* Payment Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    {invoice.currency}
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    step="0.01"
                    min="0"
                    max={invoice.totalAmount - invoice.paidAmount}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Remaining balance: {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: invoice.currency
                  }).format(invoice.totalAmount - invoice.paidAmount)}
                </p>
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Mode *
                </label>
                <select
                  name="paymentMode"
                  value={formData.paymentMode}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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

              {/* Deposit To */}
              <div className="relative deposit-dropdown">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deposit To *
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDepositDropdownOpen(!isDepositDropdownOpen)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-left flex items-center justify-between"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
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
                                    className={`w-full px-4 py-3 text-left hover:bg-green-50 focus:bg-green-50 focus:outline-none ${
                                      formData.depositToAccountId === account.id ? 'bg-green-100 text-green-900' : 'text-gray-900'
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
                                    className={`w-full px-4 py-3 text-left hover:bg-green-50 focus:bg-green-50 focus:outline-none ${
                                      formData.depositToAccountId === account.id ? 'bg-green-100 text-green-900' : 'text-gray-900'
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
                                    className={`w-full px-4 py-3 text-left hover:bg-green-50 focus:bg-green-50 focus:outline-none ${
                                      formData.depositToAccountId === account.id ? 'bg-green-100 text-green-900' : 'text-gray-900'
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
              </div>

              {/* Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference (Optional)
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Transaction reference, check number, etc."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Additional notes about this payment..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleRecordPayment}
              disabled={isSubmitting || !formData.depositToAccountId || !amount}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentRecordModal;