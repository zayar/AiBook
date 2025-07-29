'use client';

import React, { useState, useEffect } from 'react';
import { PaymentAPI, PaymentMethod, CreatePaymentMethodData } from '@/lib/payment-api';
import { 
  CreditCard, 
  Plus, 
  Check, 
  X, 
  Edit, 
  Trash2, 
  Star,
  Building,
  Wallet,
  DollarSign,
  Calendar,
  FileText,
  AlertCircle,
  Settings,
  Banknote,
  Smartphone
} from 'lucide-react';

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
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [amount, setAmount] = useState<string>((invoice.totalAmount - invoice.paidAmount).toString());
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  
  // Payment method management states
  const [showCreatePaymentMethod, setShowCreatePaymentMethod] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState<CreatePaymentMethodData>({
    name: '',
    type: 'cash',
    accountNumber: '',
    bankName: '',
    isDefault: false
  });
  const [isCreatingPaymentMethod, setIsCreatingPaymentMethod] = useState(false);

  // Load payment methods
  const loadPaymentMethods = async () => {
    try {
      const response = await PaymentAPI.getPaymentMethods(true);
      setPaymentMethods(response.paymentMethods);
      
      // Set default payment method if available
      const defaultMethod = response.paymentMethods.find(pm => pm.isDefault);
      if (defaultMethod && !selectedPaymentMethod) {
        setSelectedPaymentMethod(defaultMethod.id);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
      setError('Failed to load payment methods');
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPaymentMethods();
    }
  }, [isOpen]);

  const handleCreatePaymentMethod = async () => {
    if (!newPaymentMethod.name.trim()) {
      setError('Payment method name is required');
      return;
    }

    setIsCreatingPaymentMethod(true);
    setError('');

    try {
      const created = await PaymentAPI.createPaymentMethod(newPaymentMethod);
      await loadPaymentMethods();
      setSelectedPaymentMethod(created.id);
      setShowCreatePaymentMethod(false);
      setNewPaymentMethod({
        name: '',
        type: 'cash',
        accountNumber: '',
        bankName: '',
        isDefault: false
      });
    } catch (error) {
      console.error('Error creating payment method:', error);
      setError('Failed to create payment method');
    } finally {
      setIsCreatingPaymentMethod(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedPaymentMethod) {
      setError('Please select a payment method');
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
      await PaymentAPI.recordPayment(invoice.id, {
        amount: parseFloat(amount),
        paymentMethod: selectedPaymentMethod,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        paymentDate
      });

      onPaymentRecorded();
      onClose();
    } catch (error) {
      console.error('Error recording payment:', error);
      setError('Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPaymentMethodIcon = (type: PaymentMethod['type']) => {
    switch (type) {
      case 'cash': return <Banknote className="h-4 w-4" />;
      case 'bank_transfer': return <Building className="h-4 w-4" />;
      case 'credit_card': return <CreditCard className="h-4 w-4" />;
      case 'debit_card': return <CreditCard className="h-4 w-4" />;
      case 'check': return <FileText className="h-4 w-4" />;
      case 'digital_wallet': return <Smartphone className="h-4 w-4" />;
      case 'cryptocurrency': return <DollarSign className="h-4 w-4" />;
      default: return <Wallet className="h-4 w-4" />;
    }
  };

  const formatPaymentMethodDisplay = (pm: PaymentMethod) => {
    let display = pm.name;
    if (pm.bankName) display += ` (${pm.bankName})`;
    if (pm.accountNumber) display += ` •••${pm.accountNumber.slice(-4)}`;
    return display;
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
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {/* Invoice Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Invoice Total:</span>
                <span className="text-lg font-bold text-gray-900">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: invoice.currency
                  }).format(invoice.totalAmount)}
                </span>
              </div>
            </div>

            {/* Payment Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Amount *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={invoice.totalAmount - invoice.paidAmount}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
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

            {/* Payment Method Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Payment Method *
                </label>
                <button
                  onClick={() => setShowCreatePaymentMethod(true)}
                  className="text-sm text-green-600 hover:text-green-700 flex items-center space-x-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add New</span>
                </button>
              </div>

              {showCreatePaymentMethod ? (
                <div className="border border-gray-300 rounded-lg p-4 space-y-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">Create Payment Method</h4>
                    <button
                      onClick={() => setShowCreatePaymentMethod(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={newPaymentMethod.name}
                        onChange={(e) => setNewPaymentMethod(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                        placeholder="e.g., Primary Business Account"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Type *
                      </label>
                      <select
                        value={newPaymentMethod.type}
                        onChange={(e) => setNewPaymentMethod(prev => ({ ...prev, type: e.target.value as PaymentMethod['type'] }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      >
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="credit_card">Credit Card</option>
                        <option value="debit_card">Debit Card</option>
                        <option value="check">Check</option>
                        <option value="digital_wallet">Digital Wallet</option>
                        <option value="cryptocurrency">Cryptocurrency</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {(newPaymentMethod.type === 'bank_transfer' || newPaymentMethod.type === 'credit_card' || newPaymentMethod.type === 'debit_card') && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Bank Name
                          </label>
                          <input
                            type="text"
                            value={newPaymentMethod.bankName || ''}
                            onChange={(e) => setNewPaymentMethod(prev => ({ ...prev, bankName: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                            placeholder="Bank name"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Account Number
                          </label>
                          <input
                            type="text"
                            value={newPaymentMethod.accountNumber || ''}
                            onChange={(e) => setNewPaymentMethod(prev => ({ ...prev, accountNumber: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                            placeholder="Last 4 digits"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="setDefault"
                      checked={newPaymentMethod.isDefault}
                      onChange={(e) => setNewPaymentMethod(prev => ({ ...prev, isDefault: e.target.checked }))}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="setDefault" className="text-sm text-gray-700">
                      Set as default payment method
                    </label>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowCreatePaymentMethod(false)}
                      className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreatePaymentMethod}
                      disabled={isCreatingPaymentMethod}
                      className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {isCreatingPaymentMethod ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {paymentMethods.map((pm) => (
                    <div
                      key={pm.id}
                      onClick={() => setSelectedPaymentMethod(pm.id)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedPaymentMethod === pm.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${
                            selectedPaymentMethod === pm.id ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            {getPaymentMethodIcon(pm.type)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">
                                {formatPaymentMethodDisplay(pm)}
                              </span>
                              {pm.isDefault && (
                                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                              )}
                            </div>
                            <span className="text-xs text-gray-500 capitalize">
                              {pm.type.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        {selectedPaymentMethod === pm.id && (
                          <Check className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
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
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Transaction reference, check number, etc."
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
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Additional notes about this payment..."
              />
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
              disabled={isSubmitting || !selectedPaymentMethod || !amount}
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