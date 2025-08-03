'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ReportsAPI, ReportParams, AccountSummary } from '../../../lib/reports-api';

interface AccountTransactionsData {
  accounts: AccountSummary[];
  summary: {
    accountCount: number;
    totalTransactions: number;
    dateRange: { startDate?: string; endDate?: string };
  };
}

export default function AccountTransactionsPage() {
  const router = useRouter();
  const [reportData, setReportData] = useState<AccountTransactionsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [accounts, setAccounts] = useState<any[]>([]);
  
  // Filter controls
  const [period, setPeriod] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    loadAccounts();
    loadAccountTransactions();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/v1/accounts');
      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const loadAccountTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: ReportParams = {
        period: period !== 'custom' ? period as any : undefined,
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined,
        accountId: selectedAccount || undefined
      };

      const response = await ReportsAPI.getAccountTransactions(params);
      setReportData(response);
    } catch (error) {
      console.error('Error loading account transactions:', error);
      setError('Failed to load account transactions report');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = () => {
    loadAccountTransactions();
  };

  const formatDateRange = () => {
    if (reportData?.summary.dateRange.startDate && reportData?.summary.dateRange.endDate) {
      return `${ReportsAPI.formatDate(reportData.summary.dateRange.startDate)} to ${ReportsAPI.formatDate(reportData.summary.dateRange.endDate)}`;
    }
    return ReportsAPI.getPeriodDisplayName(period);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <span className="mr-2">←</span> Back to Reports
            </button>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <span className="mr-3">📋</span>
              Account Transactions
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Detailed transactions for specific accounts
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => ReportsAPI.exportToPDF('account-transactions', { period: period as any })}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              📄 Export PDF
            </button>
            <button
              onClick={() => ReportsAPI.exportToExcel('account-transactions', { period: period as any })}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              📊 Export Excel
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Filters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account
              </label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Accounts</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.code} - {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="this_quarter">This Quarter</option>
                <option value="this_year">This Year</option>
                <option value="last_month">Last Month</option>
                <option value="last_quarter">Last Quarter</option>
                <option value="last_year">Last Year</option>
                <option value="custom">Custom Period</option>
              </select>
            </div>

            {period === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-4">
            <button
              onClick={handleFilterChange}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Generating account transactions...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="text-red-400 mr-3">⚠️</div>
              <div>
                <h3 className="text-red-800 font-semibold">Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Report Data */}
        {reportData && !loading && (
          <>
            {/* Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Account Transactions Summary - {formatDateRange()}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {reportData.summary.accountCount}
                  </div>
                  <div className="text-sm text-gray-600">Accounts</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {reportData.summary.totalTransactions}
                  </div>
                  <div className="text-sm text-gray-600">Total Transactions</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {reportData.accounts.length > 0 ? 
                      ReportsAPI.formatCurrency(reportData.accounts.reduce((sum, acc) => sum + acc.totalDebits, 0)) : 
                      '0'
                    }
                  </div>
                  <div className="text-sm text-gray-600">Total Debits</div>
                </div>
              </div>
            </div>

            {/* Account Transactions */}
            <div className="space-y-6">
              {reportData.accounts.map((account) => (
                <div key={account.account.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Account Header */}
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {account.account.code} - {account.account.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {account.account.type} • {account.transactionCount} transactions
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {ReportsAPI.formatCurrency(Math.abs(account.closingBalance))}
                        </div>
                        <div className="text-sm text-gray-500">
                          Closing Balance
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Account Summary */}
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-sm text-gray-500">Opening Balance</div>
                        <div className="font-semibold text-gray-900">
                          {ReportsAPI.formatCurrency(account.openingBalance)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Total Debits</div>
                        <div className="font-semibold text-green-600">
                          {ReportsAPI.formatCurrency(account.totalDebits)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Total Credits</div>
                        <div className="font-semibold text-red-600">
                          {ReportsAPI.formatCurrency(account.totalCredits)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Net Change</div>
                        <div className={`font-semibold ${account.closingBalance - account.openingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {ReportsAPI.formatCurrency(account.closingBalance - account.openingBalance)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Reference
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Debit
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Credit
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Balance
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {account.transactions.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                              No transactions for selected period
                            </td>
                          </tr>
                        ) : (
                          account.transactions.map((transaction, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {ReportsAPI.formatDate(transaction.date)}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {transaction.journalId}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {transaction.memo || transaction.reference || '-'}
                              </td>
                              <td className="px-6 py-4 text-sm text-right text-gray-900">
                                {transaction.debit > 0 ? ReportsAPI.formatCurrency(transaction.debit) : '-'}
                              </td>
                              <td className="px-6 py-4 text-sm text-right text-gray-900">
                                {transaction.credit > 0 ? ReportsAPI.formatCurrency(transaction.credit) : '-'}
                              </td>
                              <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                                {ReportsAPI.formatCurrency(Math.abs(transaction.balance))}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
} 