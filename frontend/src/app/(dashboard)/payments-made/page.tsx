'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { VendorPaymentAPI, VendorPayment, VendorPaymentsResponse } from '@/lib/vendor-payment-api';

const PaymentsMadePage = () => {
  const router = useRouter();
  const [vendorPayments, setVendorPayments] = useState<VendorPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<VendorPaymentsResponse['summary'] | null>(null);

  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVendor, setFilterVendor] = useState('');
  const [filterPaymentMode, setFilterPaymentMode] = useState('');
  const [sortBy, setSortBy] = useState<'paymentDate' | 'amount' | 'paymentNumber' | 'createdAt'>('paymentDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadVendorPayments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await VendorPaymentAPI.getVendorPayments({
        page: currentPage,
        limit: 20,
        search: searchTerm || undefined,
        vendorId: filterVendor || undefined,
        paymentMode: filterPaymentMode || undefined,
        sortBy,
        sortOrder,
      });

      setVendorPayments(response.vendorPayments);
      setSummary(response.summary);
      setTotalPages(response.pagination.pages);
    } catch (err) {
      console.error('Error loading vendor payments:', err);
      setError('Failed to load payments made');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendorPayments();
  }, [currentPage, searchTerm, filterVendor, filterPaymentMode, sortBy, sortOrder]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadVendorPayments();
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

  const getStatusColor = (hasJournal: boolean) => {
    return hasJournal 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">All Payments Made</h1>
              <p className="text-gray-600 mt-1">Manage vendor payments and track payment history</p>
            </div>
            <button
              onClick={() => router.push('/payments-made/new')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <span>+</span>
              New Payment
            </button>
          </div>

          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-600 font-medium">Total Payments</div>
                <div className="text-2xl font-bold text-blue-900">{summary.totalPayments}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-sm text-green-600 font-medium">Total Amount</div>
                <div className="text-2xl font-bold text-green-900">{formatCurrency(summary.totalAmount)}</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="text-sm text-orange-600 font-medium">Bank Charges</div>
                <div className="text-2xl font-bold text-orange-900">{formatCurrency(summary.totalBankCharges)}</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="text-sm text-purple-600 font-medium">Tax Amount</div>
                <div className="text-2xl font-bold text-purple-900">{formatCurrency(summary.totalTaxAmount)}</div>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <form onSubmit={handleSearch} className="flex gap-4 mb-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={filterPaymentMode}
              onChange={(e) => setFilterPaymentMode(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Payment Modes</option>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHECK">Check</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="DEBIT_CARD">Debit Card</option>
              <option value="MOBILE_PAYMENT">Mobile Payment</option>
              <option value="OTHER">Other</option>
            </select>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
              <button
                onClick={loadVendorPayments}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : vendorPayments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No payments made found</p>
              <button
                onClick={() => router.push('/payments-made/new')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create First Payment
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('paymentDate')}
                      >
                        Date
                        {sortBy === 'paymentDate' && (
                          <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Branch
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('paymentNumber')}
                      >
                        Payment #
                        {sortBy === 'paymentNumber' && (
                          <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reference#
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendor Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bill#
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mode
                      </th>
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('amount')}
                      >
                        Amount
                        {sortBy === 'amount' && (
                          <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vendorPayments.map((payment) => (
                      <tr 
                        key={payment.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/payments-made/${payment.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(payment.paymentDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.branch || 'Head Office'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-blue-600">
                            {payment.paymentNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.referenceNumber || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {payment.vendor?.displayName || payment.vendor?.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.billPayments && payment.billPayments.length > 0 
                            ? payment.billPayments.map(bp => bp.bill?.billNumber).join(', ')
                            : '-'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${VendorPaymentAPI.getPaymentModeColor(payment.paymentMode)}`}>
                            {VendorPaymentAPI.getPaymentModeIcon(payment.paymentMode)} {getPaymentModeDisplay(payment.paymentMode)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(!!payment.journalId)}`}>
                            {payment.journalId ? 'PAID' : 'PENDING'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing page <span className="font-medium">{currentPage}</span> of{' '}
                        <span className="font-medium">{totalPages}</span>
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentsMadePage;