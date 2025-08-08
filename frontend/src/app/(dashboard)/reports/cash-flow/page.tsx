'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ReportsAPI, ReportParams } from '../../../lib/reports-api';

interface CashFlowData {
  success: boolean;
  statement: {
    operatingActivities: {
      items: Array<{
        date: string;
        description: string;
        amount: number;
        accountName: string;
      }>;
      total: number;
    };
    investingActivities: {
      items: Array<{
        date: string;
        description: string;
        amount: number;
        accountName: string;
      }>;
      total: number;
    };
    financingActivities: {
      items: Array<{
        date: string;
        description: string;
        amount: number;
        accountName: string;
      }>;
      total: number;
    };
    netCashFlow: number;
    beginningCash: number;
    endingCash: number;
  };
  summary: {
    netOperatingCashFlow: number;
    netInvestingCashFlow: number;
    netFinancingCashFlow: number;
    netCashFlow: number;
    totalTransactions: number;
  };
}

export default function CashFlowPage() {
  const router = useRouter();
  const [reportData, setReportData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter controls
  const [period, setPeriod] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    loadCashFlow();
  }, []);

  const loadCashFlow = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: ReportParams = {
        period: period !== 'custom' ? period as any : undefined,
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined
      };

      const response = await ReportsAPI.getCashFlow(params);
      setReportData(response);
    } catch (error) {
      console.error('Error loading cash flow:', error);
      setError('Failed to load cash flow report');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = () => {
    loadCashFlow();
  };

  const formatDateRange = () => {
    if (reportData) {
      return ReportsAPI.getPeriodDisplayName(period);
    }
    return ReportsAPI.getPeriodDisplayName(period);
  };

  const renderActivitySection = (
    title: string,
    activities: Array<{ date: string; description: string; amount: number; accountName: string }>,
    netAmount: number,
    bgColor: string,
    textColor: string
  ) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
      <div className={`px-6 py-4 border-b border-gray-200 ${bgColor}`}>
        <h3 className={`text-lg font-semibold ${textColor}`}>{title}</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Account
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {activities.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No activities for selected period
                </td>
              </tr>
            ) : (
              activities.map((activity, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {ReportsAPI.formatDate(activity.date)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">
                      {activity.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {activity.accountName}
                  </td>
                  <td className={`px-6 py-4 text-right font-medium ${activity.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {ReportsAPI.formatCurrency(Math.abs(activity.amount))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className={bgColor}>
            <tr className="border-t-2 border-gray-300">
              <td colSpan={3} className="px-6 py-3 font-bold text-gray-800">
                NET {title.toUpperCase()}
              </td>
              <td className={`px-6 py-3 text-right font-bold ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {ReportsAPI.formatCurrency(Math.abs(netAmount))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

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
              <span className="mr-3">💸</span>
              Cash Flow Statement
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Cash movement analysis
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => ReportsAPI.exportToPDF('cash-flow', { period: period as any })}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              📄 Export PDF
            </button>
            <button
              onClick={() => ReportsAPI.exportToExcel('cash-flow', { period: period as any })}
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
            <p className="text-gray-600">Generating cash flow statement...</p>
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
                Cash Flow Summary - {formatDateRange()}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {ReportsAPI.formatCurrency(reportData.statement.beginningCash)}
                  </div>
                  <div className="text-sm text-gray-600">Beginning Cash</div>
                </div>
                
                <div className="text-center">
                  <div className={`text-3xl font-bold ${reportData.statement.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {ReportsAPI.formatCurrency(reportData.statement.netCashFlow)}
                  </div>
                  <div className="text-sm text-gray-600">Net Cash Flow</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {ReportsAPI.formatCurrency(reportData.statement.endingCash)}
                  </div>
                  <div className="text-sm text-gray-600">Ending Cash</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {ReportsAPI.formatCurrency(reportData.summary.netOperatingCashFlow)}
                  </div>
                  <div className="text-sm text-gray-600">Operating Cash Flow</div>
                </div>
              </div>
            </div>

            {/* Operating Activities */}
            {renderActivitySection(
              'Operating Activities',
              reportData.statement.operatingActivities.items,
              reportData.statement.operatingActivities.total,
              'bg-blue-50',
              'text-blue-800'
            )}

            {/* Investing Activities */}
            {renderActivitySection(
              'Investing Activities',
              reportData.statement.investingActivities.items,
              reportData.statement.investingActivities.total,
              'bg-green-50',
              'text-green-800'
            )}

            {/* Financing Activities */}
            {renderActivitySection(
              'Financing Activities',
              reportData.statement.financingActivities.items,
              reportData.statement.financingActivities.total,
              'bg-purple-50',
              'text-purple-800'
            )}

            {/* Cash Flow Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Cash Flow Summary</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="font-medium text-gray-700">Beginning Cash Balance</span>
                  <span className="font-semibold text-gray-900">
                    {ReportsAPI.formatCurrency(reportData.statement.beginningCash)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="font-medium text-gray-700">Net Operating Cash Flow</span>
                  <span className={`font-semibold ${reportData.summary.netOperatingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {ReportsAPI.formatCurrency(reportData.summary.netOperatingCashFlow)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="font-medium text-gray-700">Net Investing Cash Flow</span>
                  <span className={`font-semibold ${reportData.summary.netInvestingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {ReportsAPI.formatCurrency(reportData.summary.netInvestingCashFlow)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="font-medium text-gray-700">Net Financing Cash Flow</span>
                  <span className={`font-semibold ${reportData.summary.netFinancingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {ReportsAPI.formatCurrency(reportData.summary.netFinancingCashFlow)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-t-2 border-gray-300">
                  <span className="font-bold text-gray-900">Ending Cash Balance</span>
                  <span className="font-bold text-gray-900">
                    {ReportsAPI.formatCurrency(reportData.statement.endingCash)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 