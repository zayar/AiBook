'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ReportsAPI, ReportParams } from '../../../lib/reports-api';

interface Transaction {
  date: string;
  journalId: string;
  reference: string;
  memo: string;
  debit: number;
  credit: number;
  balance: number;
}

interface AccountLedger {
  accountCode: string;
  accountName: string;
  accountType: string;
  openingBalance: number;
  totalDebits: number;
  totalCredits: number;
  netBalance: number;
  transactions: Transaction[];
  transactionCount: number;
}

interface GeneralLedgerData {
  summary: {
    totalAccounts: number;
    totalDebits: number;
    totalCredits: number;
    reportDate: string;
    dateRange: { startDate?: string; endDate?: string };
  };
  accounts: AccountLedger[];
}

export default function GeneralLedgerPage() {
  const router = useRouter();
  const [reportData, setReportData] = useState<GeneralLedgerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  
  // Filter controls
  const [period, setPeriod] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [includeZeroBalances, setIncludeZeroBalances] = useState(false);

  useEffect(() => {
    loadGeneralLedger();
  }, []);

  const loadGeneralLedger = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: ReportParams = {
        period: period !== 'custom' ? period as any : undefined,
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined,
        includeZeroBalances
      };

      const response = await ReportsAPI.getGeneralLedger(params);
      setReportData(response);
    } catch (error) {
      console.error('Error loading general ledger:', error);
      setError('Failed to load general ledger report');
    } finally {
      setLoading(false);
    }
  };

  const toggleAccountExpansion = (accountCode: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountCode)) {
      newExpanded.delete(accountCode);
    } else {
      newExpanded.add(accountCode);
    }
    setExpandedAccounts(newExpanded);
  };

  const expandAllAccounts = () => {
    if (reportData) {
      setExpandedAccounts(new Set(reportData.accounts.map(acc => acc.accountCode)));
    }
  };

  const collapseAllAccounts = () => {
    setExpandedAccounts(new Set());
  };

  const getAccountTypeIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      'ASSET': '💰',
      'LIABILITY': '📋',
      'EQUITY': '🏛️',
      'REVENUE': '📈',
      'EXPENSE': '📊'
    };
    return icons[type] || '📄';
  };

  const getAccountTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'ASSET': 'text-green-700 bg-green-50',
      'LIABILITY': 'text-red-700 bg-red-50',
      'EQUITY': 'text-blue-700 bg-blue-50',
      'REVENUE': 'text-purple-700 bg-purple-50',
      'EXPENSE': 'text-orange-700 bg-orange-50'
    };
    return colors[type] || 'text-gray-700 bg-gray-50';
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
              <span className="mr-3">📈</span>
              General Ledger
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              All account transactions with running balances
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => ReportsAPI.exportToPDF('general-ledger', { period: period as any })}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              📄 Export PDF
            </button>
            <button
              onClick={() => ReportsAPI.exportToExcel('general-ledger', { period: period as any })}
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

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeZeroBalances"
                checked={includeZeroBalances}
                onChange={(e) => setIncludeZeroBalances(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="includeZeroBalances" className="ml-2 block text-sm text-gray-700">
                Include Zero Balances
              </label>
            </div>
          </div>

          <div className="mt-4 flex space-x-3">
            <button
              onClick={loadGeneralLedger}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
            
            {reportData && (
              <>
                <button
                  onClick={expandAllAccounts}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAllAccounts}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Collapse All
                </button>
              </>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Generating general ledger...</p>
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
                General Ledger Summary - {formatDateRange()}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {reportData.summary.totalAccounts}
                  </div>
                  <div className="text-sm text-gray-600">Total Accounts</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {ReportsAPI.formatCurrency(reportData.summary.totalDebits)}
                  </div>
                  <div className="text-sm text-gray-600">Total Debits</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">
                    {ReportsAPI.formatCurrency(reportData.summary.totalCredits)}
                  </div>
                  <div className="text-sm text-gray-600">Total Credits</div>
                </div>
              </div>
            </div>

            {/* General Ledger */}
            <div className="space-y-6">
              {reportData.accounts.map((account) => (
                <div key={account.accountCode} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Account Header */}
                  <div 
                    className="px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleAccountExpansion(account.accountCode)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="mr-3">
                          {expandedAccounts.has(account.accountCode) ? '▼' : '▶'}
                        </span>
                        <span className="mr-3">{getAccountTypeIcon(account.accountType)}</span>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">
                            {account.accountCode} - {account.accountName}
                          </h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getAccountTypeColor(account.accountType)}`}>
                            {account.accountType}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {ReportsAPI.formatCurrency(Math.abs(account.netBalance))}
                        </div>
                        <div className="text-sm text-gray-500">
                          {account.transactionCount} transactions
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Account Transactions */}
                  {expandedAccounts.has(account.accountCode) && (
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
                        {account.transactions.length > 0 && (
                          <tfoot className="bg-gray-50">
                            <tr className="border-t-2 border-gray-300">
                              <td className="px-6 py-3 font-bold text-gray-900" colSpan={3}>
                                Account Total
                              </td>
                              <td className="px-6 py-3 text-right font-bold text-gray-900">
                                {ReportsAPI.formatCurrency(account.totalDebits)}
                              </td>
                              <td className="px-6 py-3 text-right font-bold text-gray-900">
                                {ReportsAPI.formatCurrency(account.totalCredits)}
                              </td>
                              <td className="px-6 py-3 text-right font-bold text-gray-900">
                                {ReportsAPI.formatCurrency(Math.abs(account.netBalance))}
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}