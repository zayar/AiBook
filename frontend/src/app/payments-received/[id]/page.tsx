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
  Edit,
  Download,
  Printer,
  Share
} from 'lucide-react';
import { paymentReceivedAPI, PaymentReceived } from '@/lib/payment-received-api';
import { useParams, useRouter } from 'next/navigation';
import UltraEnhancedLoading from '@/components/UltraEnhancedLoading';
import Link from 'next/link';

const PaymentModeIcons = {
  CASH: Banknote,
  BANK_TRANSFER: Building2,
  CHECK: CreditCard,
  CREDIT_CARD: CreditCard,
  DEBIT_CARD: CreditCard,
  MOBILE_PAYMENT: CreditCard,
  ONLINE_TRANSFER: Building2,
  OTHER: DollarSign
};

export default function PaymentReceivedDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [payment, setPayment] = useState<PaymentReceived | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchPayment(params.id as string);
    }
  }, [params.id]);

  const fetchPayment = async (id: string) => {
    try {
      setLoading(true);
      const response = await paymentReceivedAPI.getPaymentReceivedById(id);
      setPayment(response.data);
    } catch (error) {
      console.error('Error fetching payment:', error);
      router.push('/payments-received');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'MMK') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'REFUNDED': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <UltraEnhancedLoading />;
  }

  if (!payment) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Not Found</h2>
          <p className="text-gray-600 mb-6">The payment you're looking for doesn't exist.</p>
          <Link href="/payments-received">
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
              Back to Payments
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const PaymentIcon = PaymentModeIcons[payment.paymentMode] || DollarSign;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
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
                <h1 className="text-3xl font-bold text-gray-900">Edit Payment</h1>
                <p className="text-gray-600">Payment #{payment.paymentNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print
              </motion.button>
              <Link href={`/payments-received/${payment.id}/edit`}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </motion.button>
              </Link>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-4 mb-6">
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(payment.status)}`}>
              {payment.status.toLowerCase()}
            </span>
            {payment.emailSent && (
              <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-full">
                <Mail className="w-3 h-3" />
                Email Sent
              </span>
            )}
          </div>
        </motion.div>

        {/* Payment Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-xl border border-blue-200 mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full mb-4">
                <DollarSign className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Amount Received</h3>
              <p className="text-3xl font-bold text-blue-600">{formatCurrency(payment.amount, payment.currency)}</p>
              {payment.bankCharges && payment.bankCharges > 0 && (
                <p className="text-sm text-red-600 mt-1">
                  Bank charges: {formatCurrency(payment.bankCharges, payment.currency)}
                </p>
              )}
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 text-white rounded-full mb-4">
                <PaymentIcon className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Mode</h3>
              <p className="text-xl font-medium text-gray-800 capitalize">
                {payment.paymentMode.replace('_', ' ').toLowerCase()}
              </p>
              <p className="text-sm text-gray-600 mt-1 capitalize">
                {payment.depositType.replace('_', ' ').toLowerCase()}
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 text-white rounded-full mb-4">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Date</h3>
              <p className="text-xl font-medium text-gray-800">{formatDate(payment.paymentDate)}</p>
              {payment.referenceNumber && (
                <p className="text-sm text-gray-600 mt-1">Ref: {payment.referenceNumber}</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Customer Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-gray-200 p-6 rounded-xl mb-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Customer Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Customer Name</h3>
              <p className="text-lg font-medium text-gray-900">
                {payment.customerName || payment.customer?.name || 'Walk-in Customer'}
              </p>
              {payment.customer?.email && (
                <p className="text-sm text-gray-600">{payment.customer.email}</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Branch</h3>
              <p className="text-lg font-medium text-gray-900">Head Office</p>
            </div>
          </div>
        </motion.div>

        {/* Applied Invoices */}
        {payment.invoicePayments && payment.invoicePayments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-gray-200 p-6 rounded-xl mb-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Applied to Invoices
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount Allocated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payment.invoicePayments.map((invoicePayment) => (
                    <tr key={invoicePayment.id}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-blue-600">
                          {invoicePayment.invoice.invoiceNumber}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">
                          {formatCurrency(invoicePayment.invoice.totalAmount, payment.currency)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(invoicePayment.amountAllocated, payment.currency)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center text-sm">
                <span>Total Amount Received:</span>
                <span className="font-medium">{formatCurrency(payment.amount, payment.currency)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Amount used for Payments:</span>
                <span className="font-medium">
                  {formatCurrency(
                    payment.invoicePayments.reduce((sum, ip) => sum + ip.amountAllocated, 0),
                    payment.currency
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Amount Refunded:</span>
                <span className="font-medium">MMK 0.00</span>
              </div>
              <div className="flex justify-between items-center text-sm font-medium text-red-600">
                <span>Amount in Excess:</span>
                <span>
                  {formatCurrency(
                    Math.max(0, payment.amount - payment.invoicePayments.reduce((sum, ip) => sum + ip.amountAllocated, 0)),
                    payment.currency
                  )}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tax Information */}
        {payment.taxDeducted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl mb-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tax Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Tax Deducted</h3>
                <p className="text-lg font-medium text-gray-900">Yes</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Tax Amount</h3>
                <p className="text-lg font-medium text-gray-900">
                  {payment.taxAmount ? formatCurrency(payment.taxAmount, payment.currency) : 'N/A'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Notes */}
        {(payment.notes || payment.internalNotes) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white border border-gray-200 p-6 rounded-xl mb-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
            
            {payment.notes && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Customer Notes</h3>
                <p className="text-gray-900 whitespace-pre-wrap">{payment.notes}</p>
              </div>
            )}

            {payment.internalNotes && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Internal Notes</h3>
                <p className="text-gray-900 whitespace-pre-wrap">{payment.internalNotes}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Additional Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gray-50 p-6 rounded-xl"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <h3 className="font-medium text-gray-500 mb-1">Created</h3>
              <p className="text-gray-900">{formatDate(payment.createdAt)}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-500 mb-1">Last Updated</h3>
              <p className="text-gray-900">{formatDate(payment.updatedAt)}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-500 mb-1">Thank You Email</h3>
              <p className="text-gray-900">
                {payment.sendThankYouEmail ? (payment.emailSent ? 'Sent' : 'Pending') : 'Not Enabled'}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}