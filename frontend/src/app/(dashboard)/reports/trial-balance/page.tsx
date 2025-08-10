'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ReportsAPI, ReportParams, TrialBalanceAccount } from '../../../../lib/reports-api';

interface TrialBalanceData {
  summary: {
    totalAccounts: number;
    totalDebits: number;
    totalCredits: number;
    difference: number;
    isBalanced: boolean;
    accountTypes: string[];
    asOfDate: string;
  };
  accounts: TrialBalanceAccount[];
  groupedByType: { [key: string]: any };
}

export default function TrialBalancePage() {
  const router = useRouter();
  const [reportData, setReportData] = useState<TrialBalanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter controls
  const [period, setPeriod] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [includeZeroBalances, setIncludeZeroBalances] = useState(false);

  useEffect(() => {
    loadTrialBalance();
  }, []);

  const loadTrialBalance = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: ReportParams = {
        period: period !== 'custom' ? period as any : undefined,
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined,
        includeZeroBalances
      };

      const response = await ReportsAPI.getTrialBalance(params);
      setReportData(response);
    } catch (error) {
      console.error('Error loading trial balance:', error);
      setError('Failed to load trial balance report');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = () => {
    loadTrialBalance();
  };

  const handleExportPDF = async () => {
    try {
      const params: ReportParams = {
        period: period !== 'custom' ? period as any : undefined,
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined,
        includeZeroBalances
      };
      await ReportsAPI.exportToPDF('trial-balance', params);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
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
              <span className="mr-3">⚖️</span>
              Trial Balance
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Verify that total debits equal total credits
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleExportPDF}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              📄 Export PDF
            </button>
            <button
              onClick={() => ReportsAPI.exportToExcel('trial-balance', { period: period as any })}
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
            <p className="text-gray-600">Generating trial balance...</p>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                
                <div className="text-center">
                  <div className={`text-3xl font-bold ${reportData.summary.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                    {reportData.summary.isBalanced ? '✅' : '❌'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {reportData.summary.isBalanced ? 'Balanced' : 'Out of Balance'}
                  </div>
                </div>
              </div>

              {!reportData.summary.isBalanced && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="text-red-400 mr-3">⚠️</div>
                    <div>
                      <h4 className="text-red-800 font-semibold">Trial Balance is Out of Balance</h4>
                      <p className="text-red-700">
                        Difference: {ReportsAPI.formatCurrency(Math.abs(reportData.summary.difference))}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Trial Balance Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Trial Balance as of {ReportsAPI.formatDate(reportData.summary.asOfDate)}
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Debit Balance
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Credit Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.accounts.map((account, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">
                              {account.accountCode} - {account.accountName}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAccountTypeColor(account.accountType)}`}>
                            <span className="mr-1">{getAccountTypeIcon(account.accountType)}</span>
                            {account.accountType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-gray-900">
                          {account.debitBalance > 0 ? ReportsAPI.formatCurrency(account.debitBalance) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-gray-900">
                          {account.creditBalance > 0 ? ReportsAPI.formatCurrency(account.creditBalance) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr className="border-t-2 border-gray-300">
                      <td className="px-6 py-4 font-bold text-gray-900" colSpan={2}>
                        TOTAL
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">
                        {ReportsAPI.formatCurrency(reportData.summary.totalDebits)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">
                        {ReportsAPI.formatCurrency(reportData.summary.totalCredits)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}