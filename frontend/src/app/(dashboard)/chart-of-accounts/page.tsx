'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Eye, Edit, Trash2, X, Save,
  BarChart3, DollarSign, TrendingUp, TrendingDown,
  FileText, Building, Users,
  ChevronRight, ChevronDown, AlertTriangle, List
} from 'lucide-react';
import { ChartOfAccountsAPI, Account, AccountsResponse, AccountSummary } from '@/lib/chart-of-accounts-api';
import CreateAccountForm from '@/components/CreateAccountForm';
import EditAccountForm from '@/components/EditAccountForm';

const ChartOfAccountsPage = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [view, setView] = useState<'list' | 'hierarchy'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [sortBy, setSortBy] = useState<string>('code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Load accounts
  const loadAccounts = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        search: searchTerm || undefined,
        type: selectedType || undefined,
        isActive: showInactive ? undefined : true,
        sortBy: sortBy as any,
        sortOrder,
      };

      const response = await ChartOfAccountsAPI.getAccounts(params);
      setAccounts(response.accounts);
      setSummary(response.summary);
      setError(null);
    } catch (error) {
      console.error('Error loading accounts:', error);
      setError('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [page, searchTerm, selectedType, showInactive, sortBy, sortOrder]);

  // Handle account creation
  const handleCreateAccount = () => {
    setSelectedAccount(null);
    setShowCreateModal(true);
  };

  // Handle account creation submission
  const handleCreateSubmit = async (formData: any) => {
    try {
      await ChartOfAccountsAPI.createAccount(formData);
      setShowCreateModal(false);
      loadAccounts(); // Refresh the list
    } catch (error) {
      console.error('Error creating account:', error);
    }
  };

  // Handle account editing
  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account);
    setShowEditModal(true);
  };

  // Handle account deletion
  const handleDeleteAccount = (account: Account) => {
    setSelectedAccount(account);
    setShowDeleteModal(true);
  };

  // Confirm deletion
  const confirmDeleteAccount = async () => {
    if (!selectedAccount) return;

    try {
      await ChartOfAccountsAPI.deleteAccount(selectedAccount.id);
      setShowDeleteModal(false);
      setSelectedAccount(null);
      loadAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  // Summary cards data
  const summaryCards = summary ? [
    {
      title: 'Total Assets',
      value: summary.totalAssets,
      icon: TrendingUp,
      color: 'text-green-600 bg-green-50',
      change: '+12.5%',
    },
    {
      title: 'Total Liabilities',
      value: summary.totalLiabilities,
      icon: TrendingDown,
      color: 'text-red-600 bg-red-50',
      change: '+8.3%',
    },
    {
      title: 'Total Equity',
      value: summary.totalEquity,
      icon: Building,
      color: 'text-blue-600 bg-blue-50',
      change: '+15.2%',
    },
    {
      title: 'Net Income',
      value: summary.totalRevenue - summary.totalExpenses,
      icon: BarChart3,
      color: 'text-purple-600 bg-purple-50',
      change: '+22.1%',
    },
  ] : [];

  if (loading && accounts.length === 0) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Chart of Accounts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chart of Accounts</h1>
          <p className="text-gray-600 mt-1">Manage your accounting structure and accounts</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView(view === 'list' ? 'hierarchy' : 'list')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
          >
            {view === 'list' ? <List className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            {view === 'list' ? 'Hierarchy View' : 'List View'}
          </button>
          <button
            onClick={handleCreateAccount}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Account
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {summaryCards.map((card, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {ChartOfAccountsAPI.formatBalance(card.value)}
                  </p>
                  <p className="text-sm text-green-600 mt-1">{card.change}</p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${card.color}`}>
                  <card.icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search accounts by name, code, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="ASSET">Assets</option>
              <option value="LIABILITY">Liabilities</option>
              <option value="EQUITY">Equity</option>
              <option value="REVENUE">Revenue</option>
              <option value="EXPENSE">Expenses</option>
            </select>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Show Inactive</span>
            </label>
          </div>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Accounts</h2>
        </div>

        {error ? (
          <div className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
            <button
              onClick={loadAccounts}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-6 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No accounts found</p>
            <button
              onClick={handleCreateAccount}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create First Account
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      setSortBy('code');
                      setSortOrder(sortBy === 'code' && sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                  >
                    Code
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      setSortBy('name');
                      setSortOrder(sortBy === 'name' && sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                  >
                    Account Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      setSortBy('balance');
                      setSortOrder(sortBy === 'balance' && sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                  >
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
                {accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {account.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{account.name}</div>
                        {account.description && (
                          <div className="text-sm text-gray-500">{account.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${ChartOfAccountsAPI.getAccountTypeColor(account.type)}`}>
                        <span>{ChartOfAccountsAPI.getAccountTypeIcon(account.type)}</span>
                        {account.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ChartOfAccountsAPI.formatBalance(account.balance, account.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        account.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {account.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => window.location.href = `/chart-of-accounts/${account.id}`}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="text-sm font-medium">View</span>
                        </button>
                        <button
                          onClick={() => handleEditAccount(account)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Edit Account"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(account)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Account Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreateModal(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowCreateModal(false);
            }
          }}
          tabIndex={-1}
        >
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
              <h3 className="text-lg font-semibold text-gray-900">Create New Account</h3>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  form="create-account-form"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Create Account
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <CreateAccountForm 
                onSubmit={handleCreateSubmit}
                onCancel={() => setShowCreateModal(false)}
                formId="create-account-form"
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {showEditModal && selectedAccount && (
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
                  form="edit-account-form"
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
                account={selectedAccount}
                onSubmit={async (formData) => {
                  try {
                    await ChartOfAccountsAPI.updateAccount(selectedAccount.id, formData);
                    setShowEditModal(false);
                    loadAccounts();
                  } catch (error) {
                    console.error('Error updating account:', error);
                  }
                }}
                onCancel={() => setShowEditModal(false)}
                formId="edit-account-form"
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedAccount && (
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
              Are you sure you want to delete the account "{selectedAccount.name}" ({selectedAccount.code})? 
              This action will deactivate the account.
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

export default ChartOfAccountsPage;