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
import { paymentReceivedAPI, PaymentReceived, UnpaidInvoice } from '@/lib/payment-received-api';
import { PaymentAPI, PaymentMethod } from '@/lib/payment-api';
import { useParams, useRouter } from 'next/navigation';
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

export default function EditPaymentReceivedPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payment, setPayment] = useState<PaymentReceived | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>([]);
  const [invoiceAllocations, setInvoiceAllocations] = useState<InvoiceAllocation[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<PaymentMethod[]>([]);

  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    amount: '',
    paymentDate: '',
    paymentMode: 'CASH',
    depositType: '',
    bankCharges: '',
    referenceNumber: '',
    taxDeducted: false,
    taxAmount: '',
    notes: '',
    internalNotes: '',
    sendThankYouEmail: false
  });

  useEffect(() => {
    if (params.id) {
      Promise.all([
        fetchPayment(params.id as string),
        fetchCustomers(),
        fetchBankAccounts()
      ]);
    }
  }, [params.id]);

  useEffect(() => {
    if (formData.customerId) {
      fetchUnpaidInvoices(formData.customerId);
    } else {
      setUnpaidInvoices([]);
      setInvoiceAllocations([]);
    }
  }, [formData.customerId]);

  const fetchPayment = async (id: string) => {
    try {
      const response = await paymentReceivedAPI.getPaymentReceivedById(id);
      const paymentData = response.data;
      setPayment(paymentData);

      // Populate form data
      setFormData({
        customerId: paymentData.customerId || '',
        customerName: paymentData.customerName || '',
        amount: paymentData.amount.toString(),
        paymentDate: paymentData.paymentDate.split('T')[0],
        paymentMode: paymentData.paymentMode,
        depositType: paymentData.depositType,
        bankCharges: paymentData.bankCharges?.toString() || '',
        referenceNumber: paymentData.referenceNumber || '',
        taxDeducted: paymentData.taxDeducted,
        taxAmount: paymentData.taxAmount?.toString() || '',
        notes: paymentData.notes || '',
        internalNotes: paymentData.internalNotes || '',
        sendThankYouEmail: paymentData.sendThankYouEmail
      });

      // Set invoice allocations
      if (paymentData.invoicePayments) {
        const allocations = paymentData.invoicePayments.map(ip => ({
          invoiceId: ip.invoiceId,
          invoiceNumber: ip.invoice.invoiceNumber,
          totalAmount: ip.invoice.totalAmount,
          amountDue: ip.invoice.totalAmount - ip.invoice.paidAmount + ip.amountAllocated, // Add back current allocation
          amountAllocated: ip.amountAllocated
        }));
        setInvoiceAllocations(allocations);
      }
    } catch (error) {
      console.error('Error fetching payment:', error);
      router.push('/payments-received');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await paymentReceivedAPI.getCustomers();
      setCustomers(response.customers || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const response = await PaymentAPI.getPaymentMethods(true);
      setBankAccounts(response.paymentMethods || []);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  const fetchUnpaidInvoices = async (customerId: string) => {
    try {
      setLoadingInvoices(true);
      const response = await paymentReceivedAPI.getUnpaidInvoices(customerId);
      setUnpaidInvoices(response.data || []);
    } catch (error) {
      console.error('Error fetching unpaid invoices:', error);
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

    if (!payment) return;

    setSaving(true);

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

      await paymentReceivedAPI.updatePaymentReceived(payment.id, payload);
      router.push(`/payments-received/${payment.id}`);
    } catch (error) {
      console.error('Error updating payment received:', error);
      alert('Failed to update payment received. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'MMK') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return <UltraEnhancedLoading />;
  }

  if (!payment) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Not Found</h2>
          <p className="text-gray-600 mb-6">The payment you're trying to edit doesn't exist.</p>
          <Link href="/payments-received">
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
              Back to Payments
            </button>
          </Link>
        </div>
      </div>
    );
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
            <Link href={`/payments-received/${payment.id}`}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Payment</h1>
              <p className="text-gray-600">Payment #{payment.paymentNumber}</p>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deposit To *
                </label>
                <select
                  name="depositType"
                  value={formData.depositType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select deposit account...</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} {account.bankName && `(${account.bankName})`} 
                      {account.accountNumber && ` - •••${account.accountNumber.slice(-4)}`}
                    </option>
                  ))}
                </select>
                {bankAccounts.length === 0 && (
                  <p className="mt-1 text-xs text-red-500">
                    No bank accounts found. Please add bank accounts (including Cash in Hand, Petty Cash, etc.) in the Banking section first.
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

          {/* Current Invoice Allocations */}
          {invoiceAllocations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-blue-50 border border-blue-200 p-6 rounded-xl"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Current Payment Allocation
              </h2>

              <div className="space-y-4">
                {invoiceAllocations.map(allocation => (
                  <div key={allocation.invoiceId} className="flex items-center gap-4 p-4 bg-white rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{allocation.invoiceNumber}</div>
                      <div className="text-sm text-gray-500">
                        Amount Due: {formatCurrency(allocation.amountDue)}
                      </div>
                    </div>
                    <div className="w-48">
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={allocation.amountAllocated}
                          onChange={(e) => updateAllocationAmount(allocation.invoiceId, parseFloat(e.target.value) || 0)}
                          step="0.01"
                          min="0"
                          max={allocation.amountDue}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => updateAllocationAmount(allocation.invoiceId, allocation.amountDue)}
                          className="px-2 py-2 text-xs font-medium text-white bg-green-600 border border-green-700 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-colors"
                          title={`Pay in Full (${formatCurrency(allocation.amountDue)})`}
                        >
                          Pay in Full
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeInvoiceAllocation(allocation.invoiceId)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center text-sm">
                    <span>Total:</span>
                    <span className="font-medium">{formatCurrency(parseFloat(formData.amount) || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Amount used for Payments:</span>
                    <span className="font-medium">{formatCurrency(getTotalAllocated())}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium text-red-600">
                    <span>Amount in Excess:</span>
                    <span>{formatCurrency(Math.max(0, getUnallocatedAmount()))}</span>
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
            <Link href={`/payments-received/${payment.id}`}>
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
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </motion.button>
          </motion.div>
        </form>
      </div>
    </div>
  );
}