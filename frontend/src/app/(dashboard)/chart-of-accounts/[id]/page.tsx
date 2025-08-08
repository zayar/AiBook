'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Edit, Trash2, Calendar, DollarSign, X, Save,
  BarChart3, Activity, Users, FileText, AlertTriangle,
  TrendingUp, TrendingDown, Clock, Eye
} from 'lucide-react';
import { ChartOfAccountsAPI, AccountDetail, Account } from '@/lib/chart-of-accounts-api';
import EditAccountForm from '@/components/EditAccountForm';

const AccountDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const accountId = params.id as string;

  const [accountDetail, setAccountDetail] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (accountId) {
      loadAccountDetail();
    }
  }, [accountId]);

  const loadAccountDetail = async () => {
    try {
      setLoading(true);
      const response = await ChartOfAccountsAPI.getAccount(accountId);
      setAccountDetail(response);
      setError(null);
    } catch (error) {
      console.error('Error loading account detail:', error);
      setError('Failed to load account details');
    } finally {
      setLoading(false);
    }
  };

  const handleEditAccount = () => {
    setShowEditModal(true);
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    if (!accountDetail) return;

    try {
      await ChartOfAccountsAPI.deleteAccount(accountDetail.account.id);
      setShowDeleteModal(false);
      router.push('/chart-of-accounts');
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading account details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !accountDetail) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error || 'Account not found'}</p>
            <button
              onClick={() => router.push('/chart-of-accounts')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Chart of Accounts
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { account, statistics, recentActivity } = accountDetail;

  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/chart-of-accounts')}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{account.name}</h1>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${ChartOfAccountsAPI.getAccountTypeColor(account.type)}`}>
                <span>{ChartOfAccountsAPI.getAccountTypeIcon(account.type)}</span>
                {account.type}
              </span>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                account.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {account.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-gray-600 mt-1">Account Code: {account.code}</p>
            {account.description && (
              <p className="text-gray-500 mt-1">{account.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleEditAccount}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit Account
          </button>
          <button
            onClick={handleDeleteAccount}
            className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Account Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600">Current Balance</p>
              <p className="text-2xl font-bold text-gray-900">
                {ChartOfAccountsAPI.formatBalance(account.balance, account.currency)}
              </p>
              <p className="text-sm text-gray-500 mt-1">{account.currency}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">
                {statistics.totalEntries.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">All time</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600">Transaction Amount</p>
              <p className="text-2xl font-bold text-gray-900">
                {ChartOfAccountsAPI.formatBalance(statistics.totalAmount, account.currency)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Total activity</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600">Sub-Accounts</p>
              <p className="text-2xl font-bold text-gray-900">
                {statistics.childrenCount}
              </p>
              <p className="text-sm text-gray-500 mt-1">Child accounts</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Account Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Account Information
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Account Code</label>
                <p className="text-sm text-gray-900 font-mono">{account.code}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Account Type</label>
                <p className="text-sm text-gray-900">{account.type}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Currency</label>
                <p className="text-sm text-gray-900">{account.currency}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <p className="text-sm text-gray-900">{account.isActive ? 'Active' : 'Inactive'}</p>
              </div>
            </div>

            {account.parent && (
              <div>
                <label className="text-sm font-medium text-gray-500">Parent Account</label>
                <p className="text-sm text-gray-900">
                  {account.parent.code} - {account.parent.name}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-sm text-gray-900 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(account.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-sm text-gray-900 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {new Date(account.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Transaction Activity
            </h2>
          </div>
          <div className="p-6">
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {activity.type === 'DEBIT' ? (
                        <TrendingDown className="w-5 h-5 text-red-500" />
                      ) : (
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {activity.type} Transactions
                        </p>
                        <p className="text-xs text-gray-500">
                          {activity.count} transaction{activity.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {ChartOfAccountsAPI.formatBalance(activity.totalAmount, account.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No transaction activity yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-accounts */}
      {account.children && account.children.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Sub-Accounts ({account.children.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {account.children.map((child) => (
                  <tr key={child.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {child.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{child.name}</div>
                      {child.description && (
                        <div className="text-sm text-gray-500">{child.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ChartOfAccountsAPI.formatBalance(child.balance, child.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        child.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {child.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => router.push(`/chart-of-accounts/${child.id}`)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="text-sm font-medium">View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {showEditModal && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditModal(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowEditModal(false);
            }
          }}
          tabIndex={-1}
        >
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
              <h3 className="text-lg font-semibold text-gray-900">Edit Account</h3>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  form="edit-account-detail-form"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Update Account
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <EditAccountForm 
                account={account}
                onSubmit={async (formData) => {
                  try {
                    await ChartOfAccountsAPI.updateAccount(account.id, formData);
                    setShowEditModal(false);
                    loadAccountDetail();
                  } catch (error) {
                    console.error('Error updating account:', error);
                  }
                }}
                onCancel={() => setShowEditModal(false)}
                formId="edit-account-detail-form"
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteModal(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowDeleteModal(false);
            }
          }}
          tabIndex={-1}
        >
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">Delete Account</h3>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the account "{account.name}" ({account.code})? 
              This action will deactivate the account and cannot be undone.
              {statistics.totalEntries > 0 && (
                <span className="block mt-2 text-orange-600 font-medium">
                  ⚠️ This account has {statistics.totalEntries} transactions.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAccount}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountDetailPage;