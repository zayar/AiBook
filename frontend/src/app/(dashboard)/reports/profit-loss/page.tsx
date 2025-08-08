'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ReportsAPI, ReportParams } from '../../../lib/reports-api';

interface ProfitLossData {
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    grossProfit: number;
    netIncome: number;
    profitMargin: number;
  };
  revenue: {
    accounts: Array<{
      code: string;
      name: string;
      amount: number;
    }>;
    total: number;
  };
  expenses: {
    accounts: Array<{
      code: string;
      name: string;
      amount: number;
    }>;
    total: number;
  };
}

export default function ProfitLossPage() {
  const router = useRouter();
  const [reportData, setReportData] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter controls
  const [period, setPeriod] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    loadProfitLoss();
  }, []);

  const loadProfitLoss = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: ReportParams = {
        period: period !== 'custom' ? period as any : undefined,
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined
      };

      const response = await ReportsAPI.getProfitLoss(params);
      setReportData(response);
    } catch (error) {
      console.error('Error loading profit & loss:', error);
      setError('Failed to load profit & loss report');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = () => {
    loadProfitLoss();
  };

  const formatDateRange = () => {
    if (reportData) {
      return ReportsAPI.getPeriodDisplayName(period);
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
              <span className="mr-3">💰</span>
              Profit & Loss Statement
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Revenue and expenses overview
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => ReportsAPI.exportToPDF('profit-loss', { period: period as any })}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              📄 Export PDF
            </button>
            <button
              onClick={() => ReportsAPI.exportToExcel('profit-loss', { period: period as any })}
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
            <p className="text-gray-600">Generating profit & loss statement...</p>
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
                Profit & Loss Summary - {formatDateRange()}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {ReportsAPI.formatCurrency(reportData.summary.totalRevenue)}
                  </div>
                  <div className="text-sm text-gray-600">Total Revenue</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">
                    {ReportsAPI.formatCurrency(reportData.summary.totalExpenses)}
                  </div>
                  <div className="text-sm text-gray-600">Total Expenses</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {ReportsAPI.formatCurrency(reportData.summary.netIncome)}
                  </div>
                  <div className="text-sm text-gray-600">Net Income</div>
                </div>
                
                <div className="text-center">
                  <div className={`text-3xl font-bold ${reportData.summary.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {reportData.summary.profitMargin.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Profit Margin</div>
                </div>
              </div>
            </div>

            {/* Revenue Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
                <h3 className="text-lg font-semibold text-green-800">Revenue</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.revenue.accounts.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-6 py-4 text-center text-gray-500">
                          No revenue for selected period
                        </td>
                      </tr>
                    ) : (
                      reportData.revenue.accounts.map((account, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-900">
                                {account.code} - {account.name}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-green-600">
                            {ReportsAPI.formatCurrency(account.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-green-50">
                    <tr className="border-t-2 border-green-300">
                      <td className="px-6 py-3 font-bold text-green-800">
                        TOTAL REVENUE
                      </td>
                      <td className="px-6 py-3 text-right font-bold text-green-800">
                        {ReportsAPI.formatCurrency(reportData.revenue.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Expenses Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
                <h3 className="text-lg font-semibold text-red-800">Expenses</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.expenses.accounts.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-6 py-4 text-center text-gray-500">
                          No expenses for selected period
                        </td>
                      </tr>
                    ) : (
                      reportData.expenses.accounts.map((account, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-900">
                                {account.code} - {account.name}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-red-600">
                            {ReportsAPI.formatCurrency(account.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-red-50">
                    <tr className="border-t-2 border-red-300">
                      <td className="px-6 py-3 font-bold text-red-800">
                        TOTAL EXPENSES
                      </td>
                      <td className="px-6 py-3 text-right font-bold text-red-800">
                        {ReportsAPI.formatCurrency(reportData.expenses.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Net Income Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Net Income</h3>
                <div className={`text-4xl font-bold ${reportData.summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {ReportsAPI.formatCurrency(reportData.summary.netIncome)}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Profit Margin: {reportData.summary.profitMargin.toFixed(1)}%
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 