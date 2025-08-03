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

  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'CASH',
    depositType: 'CASH_IN_HAND',
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
  }, []);

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
        depositType: formData.depositType,
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deposit To *
                </label>
                <select
                  name="depositType"
                  value={formData.depositType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="CASH_IN_HAND">Cash in Hand</option>
                  <option value="BANK_DEPOSIT">Bank Deposit</option>
                  <option value="PETTY_CASH">Petty Cash</option>
                  <option value="UNDEPOSITED_FUNDS">Undeposited Funds</option>
                </select>
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
                    <div className="w-40">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Amount</label>
                      <input
                        type="number"
                        value={allocation.amountAllocated}
                        onChange={(e) => updateAllocationAmount(allocation.invoiceId, parseFloat(e.target.value) || 0)}
                        step="0.01"
                        min="0"
                        max={allocation.amountDue}
                        className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-3 focus:ring-blue-200 focus:border-blue-500 text-gray-900 bg-white font-bold text-lg text-center shadow-sm"
                        placeholder="0.00"
                      />
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