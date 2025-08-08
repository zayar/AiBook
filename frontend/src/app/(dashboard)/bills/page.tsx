'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  X
} from 'lucide-react';
import { billApi, Bill, BillStats } from '../../lib/bill-api';

interface FormErrors {
  [key: string]: string;
}

const BillsPage = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [stats, setStats] = useState<BillStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [billToDelete, setBillToDelete] = useState<Bill | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadBills = async () => {
    try {
      setLoading(true);
      setError(null);

      const [billsResponse, statsResponse] = await Promise.all([
        billApi.getBills({
          page: currentPage,
          limit: 20,
          search: searchTerm || undefined,
          status: statusFilter || undefined,
        }),
        billApi.getBillStats(),
      ]);

      setBills(billsResponse.bills);
      setTotalPages(billsResponse.pagination.totalPages);
      setStats(statsResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, [currentPage, searchTerm, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadBills();
  };

  const handleDeleteBill = async () => {
    if (!billToDelete) return;

    try {
      setDeleteLoading(true);
      await billApi.deleteBill(billToDelete.id);
      setShowDeleteModal(false);
      setBillToDelete(null);
      loadBills(); // Reload the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bill');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'text-green-600 bg-green-100';
      case 'PENDING': return 'text-yellow-600 bg-yellow-100';
      case 'PARTIAL': return 'text-blue-600 bg-blue-100';
      case 'OVERDUE': return 'text-red-600 bg-red-100';
      case 'CANCELLED': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'MMK',
      minimumFractionDigits: 0,
    }).format(amount).replace('MMK', 'MMK ');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading && bills.length === 0) {
    return (
      <div className="p-6 bg-white min-h-screen">
        {/* Header Skeleton */}
        <div className="animate-pulse mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-64"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded w-24"></div>
          </div>
        </div>

        {/* Statistics Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filter Skeleton */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6 animate-pulse">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
            <div className="w-32 h-10 bg-gray-200 rounded"></div>
            <div className="w-24 h-10 bg-gray-200 rounded"></div>
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse">
          <div className="p-6 border-b border-gray-200">
            <div className="h-6 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="divide-y divide-gray-200">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                    <div className="h-8 bg-gray-200 rounded w-8"></div>
                    <div className="h-8 bg-gray-200 rounded w-8"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      {/* Loading Overlay for Refresh */}
      {loading && bills.length > 0 && (
        <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Refreshing bills...</p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bills</h1>
          <p className="text-gray-600 mt-1">Manage your vendor bills and payables</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.location.href = '/bills/new'}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Bill
        </motion.button>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2"
        >
          <AlertTriangle className="w-5 h-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Bills</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalBills}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Outstanding</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalOutstanding)}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue Bills</p>
                <p className="text-2xl font-bold text-orange-600">{stats.overdueBills}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Paid Bills</p>
                <p className="text-2xl font-bold text-green-600">{stats.paidBills}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search bills by number, vendor, or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIAL">Partial</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </form>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bill Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bills.map((bill) => (
                <motion.tr
                  key={bill.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{bill.billNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900">{bill.vendor?.displayName || bill.vendor?.name}</div>
                    {bill.vendor?.email && (
                      <div className="text-sm text-gray-500">{bill.vendor.email}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {formatDate(bill.billDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-gray-900 ${bill.isOverdue ? 'text-red-600 font-medium' : ''}`}>
                      {formatDate(bill.dueDate)}
                    </div>
                    {bill.isOverdue && (
                      <div className="text-sm text-red-500">
                        {bill.daysOverdue} days overdue
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900 font-medium">{formatCurrency(bill.totalAmount)}</div>
                    {bill.paidAmount > 0 && (
                      <div className="text-sm text-gray-500">
                        Paid: {formatCurrency(bill.paidAmount)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(bill.status)}`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => window.location.href = `/bills/${bill.id}`}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="View Bill"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {bill.status !== 'PAID' && (
                        <button
                          onClick={() => window.location.href = `/bills/${bill.id}/edit`}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded"
                          title="Edit Bill"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {bill.paidAmount === 0 && (
                        <button
                          onClick={() => {
                            setBillToDelete(bill);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="Delete Bill"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {bills.length === 0 && !loading && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bills found</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first bill.</p>
              <button
                onClick={() => window.location.href = '/bills/new'}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Bill
              </button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && billToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Delete Bill</h3>
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete bill {billToDelete.billNumber}?
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setBillToDelete(null);
                }}
                disabled={deleteLoading}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBill}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleteLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BillsPage;