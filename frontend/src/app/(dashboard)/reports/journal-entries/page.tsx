'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ReportsAPI, ReportParams, JournalEntry } from '../../../lib/reports-api';

interface JournalReportData {
  summary: {
    totalJournalEntries: number;
    totalTransactions: number;
    totalDebits: number;
    totalCredits: number;
    balancedEntries: number;
    unbalancedEntries: number;
  };
  journalEntries: JournalEntry[];
}

export default function JournalEntriesPage() {
  const router = useRouter();
  const [reportData, setReportData] = useState<JournalReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter controls
  const [period, setPeriod] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    loadJournalReport();
  }, []);

  const loadJournalReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: ReportParams = {
        period: period !== 'custom' ? period as any : undefined,
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined
      };

      const response = await ReportsAPI.getJournalReport(params);
      setReportData(response);
    } catch (error) {
      console.error('Error loading journal report:', error);
      setError('Failed to load journal report');
    } finally {
      setLoading(false);
    }
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
              <span className="mr-3">📖</span>
              Journal Report
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              All journal entries with complete details
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => ReportsAPI.exportToPDF('journal-entries', { period: period as any })}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              📄 Export PDF
            </button>
            <button
              onClick={() => ReportsAPI.exportToExcel('journal-entries', { period: period as any })}
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
              onClick={loadJournalReport}
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
            <p className="text-gray-600">Generating journal report...</p>
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
                    {reportData.summary.totalJournalEntries}
                  </div>
                  <div className="text-sm text-gray-600">Journal Entries</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {reportData.summary.balancedEntries}
                  </div>
                  <div className="text-sm text-gray-600">Balanced Entries</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {reportData.summary.totalTransactions}
                  </div>
                  <div className="text-sm text-gray-600">Total Transactions</div>
                </div>
                
                <div className="text-center">
                  <div className={`text-3xl font-bold ${reportData.summary.unbalancedEntries > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {reportData.summary.unbalancedEntries > 0 ? '❌' : '✅'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {reportData.summary.unbalancedEntries > 0 ? 'Issues Found' : 'All Balanced'}
                  </div>
                </div>
              </div>
            </div>

            {/* Journal Entries */}
            <div className="space-y-6">
              {reportData.journalEntries.map((journal) => (
                <div key={journal.journalId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Journal Header */}
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {journal.journalId}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {ReportsAPI.formatDate(journal.date)} • {journal.reference || 'No reference'}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-sm font-medium ${journal.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                          {journal.isBalanced ? '✅ Balanced' : '❌ Unbalanced'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {journal.entryCount} entries
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Journal Entries */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Account
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
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {journal.entries.map((entry, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div>
                                <div className="font-medium text-gray-900">
                                  {entry.accountCode} - {entry.accountName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {entry.accountType}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {entry.memo || '-'}
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-gray-900">
                              {entry.debit > 0 ? ReportsAPI.formatCurrency(entry.debit) : '-'}
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-gray-900">
                              {entry.credit > 0 ? ReportsAPI.formatCurrency(entry.credit) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr className="border-t-2 border-gray-300">
                          <td className="px-6 py-3 font-bold text-gray-900" colSpan={2}>
                            TOTAL
                          </td>
                          <td className="px-6 py-3 text-right font-bold text-gray-900">
                            {ReportsAPI.formatCurrency(journal.totalDebits)}
                          </td>
                          <td className="px-6 py-3 text-right font-bold text-gray-900">
                            {ReportsAPI.formatCurrency(journal.totalCredits)}
                          </td>
                        </tr>
                      </tfoot>
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