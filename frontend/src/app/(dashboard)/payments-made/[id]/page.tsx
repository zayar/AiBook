'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { VendorPaymentAPI, VendorPaymentDetail } from '@/lib/vendor-payment-api';

const PaymentDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const paymentId = params.id as string;

  const [paymentDetail, setPaymentDetail] = useState<VendorPaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showJournal, setShowJournal] = useState(false);

  useEffect(() => {
    if (paymentId) {
      loadPaymentDetail();
    }
  }, [paymentId]);

  const loadPaymentDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await VendorPaymentAPI.getVendorPayment(paymentId);
      setPaymentDetail(response);
    } catch (err) {
      console.error('Error loading payment detail:', err);
      setError('Failed to load payment details');
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

  const getPaymentModeDisplay = (mode: string) => {
    const modes = {
      'CASH': 'Cash',
      'BANK_TRANSFER': 'Bank Transfer',
      'CHECK': 'Check',
      'CREDIT_CARD': 'Credit Card',
      'DEBIT_CARD': 'Debit Card',
      'MOBILE_PAYMENT': 'Mobile Payment',
      'OTHER': 'Other'
    };
    return modes[mode as keyof typeof modes] || mode;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !paymentDetail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Payment not found'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { vendorPayment, journalEntries, doubleEntry } = paymentDetail;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.back()}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ← Back
                </button>
                <h1 className="text-2xl font-bold text-gray-900">All Payments Made</h1>
              </div>
              <p className="text-gray-600 mt-1">Payment details and journal entries</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Branch: {vendorPayment.branch || 'Head Office'}</div>
              <div className="text-2xl font-bold text-gray-900">{vendorPayment.paymentNumber}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Payment Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Payment Information</h2>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  vendorPayment.journalId 
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                }`}>
                  {vendorPayment.journalId ? 'PAID' : 'PENDING'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Payment #</div>
                  <div className="text-lg font-semibold text-blue-600">{vendorPayment.paymentNumber}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Payment Date</div>
                  <div className="text-lg font-semibold text-gray-900">{formatDate(vendorPayment.paymentDate)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Paid To</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {vendorPayment.vendor?.displayName || vendorPayment.vendor?.name}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Payment Mode</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {getPaymentModeDisplay(vendorPayment.paymentMode)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Paid Through</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {vendorPayment.paidThrough?.name}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Reference Number</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {vendorPayment.referenceNumber || '-'}
                  </div>
                </div>
              </div>

              {vendorPayment.notes && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="text-sm text-gray-500 mb-1">Notes</div>
                  <div className="text-gray-900">{vendorPayment.notes}</div>
                </div>
              )}
            </div>

            {/* Bills Paid */}
            {vendorPayment.billPayments && vendorPayment.billPayments.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment for</h2>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bill Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bill Date
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bill Amount
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {vendorPayment.billPayments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-blue-600">
                              {payment.bill?.billNumber}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {payment.bill?.billDate ? formatDate(payment.bill.billDate) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {payment.bill?.totalAmount ? formatCurrency(payment.bill.totalAmount) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                            {formatCurrency(payment.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Journal Entries */}
            {journalEntries && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Journal Entries</h2>
                  <button
                    onClick={() => setShowJournal(!showJournal)}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    {showJournal ? 'Hide' : 'Show'} Journal
                  </button>
                </div>

                {showJournal && (
                  <div className="space-y-4">
                    <div className="text-center text-sm text-gray-600 mb-4">
                      Payments Made - {vendorPayment.paymentNumber}
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Account
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Branch
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Debit
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Credit
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {journalEntries.map((entry) => (
                            <tr key={entry.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {entry.account.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {vendorPayment.branch || 'Head Office'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                {entry.type === 'DEBIT' ? formatCurrency(entry.amount) : '0.00'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                {entry.type === 'CREDIT' ? formatCurrency(entry.amount) : '0.00'}
                              </td>
                            </tr>
                          ))}
                          {/* Totals Row */}
                          <tr className="bg-gray-50 font-medium">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" colSpan={2}>
                              <strong>Total</strong>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              <strong>{doubleEntry ? formatCurrency(doubleEntry.totalDebits) : '0.00'}</strong>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              <strong>{doubleEntry ? formatCurrency(doubleEntry.totalCredits) : '0.00'}</strong>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                    {doubleEntry && (
                      <div className="text-sm text-gray-600 text-center">
                        {doubleEntry.totalDebits === doubleEntry.totalCredits ? (
                          <span className="text-green-600">✓ Balanced ({formatCurrency(doubleEntry.totalDebits)})</span>
                        ) : (
                          <span className="text-red-600">⚠ Unbalanced (Difference: {formatCurrency(Math.abs(doubleEntry.totalDebits - doubleEntry.totalCredits))})</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Amount Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Amount Summary</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="font-medium text-green-600">{formatCurrency(vendorPayment.amount)}</span>
                </div>
                
                {vendorPayment.bankCharges > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bank Charges:</span>
                    <span className="font-medium">{formatCurrency(vendorPayment.bankCharges)}</span>
                  </div>
                )}
                
                {vendorPayment.taxDeducted && vendorPayment.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax Deducted:</span>
                    <span className="font-medium">{formatCurrency(vendorPayment.taxAmount)}</span>
                  </div>
                )}
                
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-900 font-semibold">Total Deducted:</span>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(vendorPayment.amount + vendorPayment.bankCharges + vendorPayment.taxAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Vendor Information */}
            {vendorPayment.vendor && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Information</h3>
                
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-500">Vendor Name</div>
                    <div className="font-medium text-gray-900">
                      {vendorPayment.vendor.displayName || vendorPayment.vendor.name}
                    </div>
                  </div>
                  
                  {vendorPayment.vendor.email && (
                    <div>
                      <div className="text-sm text-gray-500">Email</div>
                      <div className="text-gray-900">{vendorPayment.vendor.email}</div>
                    </div>
                  )}
                  
                  {vendorPayment.vendor.phone && (
                    <div>
                      <div className="text-sm text-gray-500">Phone</div>
                      <div className="text-gray-900">{vendorPayment.vendor.phone}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => window.print()}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Print Payment
                </button>
                
                <button
                  onClick={() => router.push(`/vendors/${vendorPayment.vendorId}`)}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  View Vendor
                </button>
                
                <button
                  onClick={() => router.push('/payments-made/new')}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  New Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetailPage;