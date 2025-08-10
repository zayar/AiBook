'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ReportsAPI } from '../../../lib/reports-api';

interface Report {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  icon: string;
}

interface ReportCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  reports: Report[];
}

interface QuickAction {
  name: string;
  endpoint: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const [reportsMenu, setReportsMenu] = useState<{
    categories: ReportCategory[];
    quickActions: QuickAction[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReportsMenu();
  }, []);

  const loadReportsMenu = async () => {
    try {
      setLoading(true);
      const response = await ReportsAPI.getReportsMenu();
      setReportsMenu(response.menu);
    } catch (error) {
      console.error('Error loading reports menu:', error);
      setError('Failed to load reports menu');
    } finally {
      setLoading(false);
    }
  };

  const handleReportClick = (reportId: string) => {
    router.push(`/reports/${reportId}`);
  };

  const handleQuickAction = async (endpoint: string) => {
    const reportType = endpoint.split('/reports/')[1].split('?')[0];
    router.push(`/reports/${reportType}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading reports...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">Error</div>
          <div className="text-gray-600">{error}</div>
          <button 
            onClick={loadReportsMenu}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
          <p className="mt-2 text-lg text-gray-600">
            Generate comprehensive accounting reports and financial statements
          </p>
        </div>

        {/* Quick Actions */}
        {reportsMenu?.quickActions && reportsMenu.quickActions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {reportsMenu.quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action.endpoint)}
                  className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all duration-200 text-left"
                >
                  <div className="flex items-center">
                    <div className="text-2xl mr-3">⚡</div>
                    <div>
                      <div className="font-medium text-gray-900">{action.name}</div>
                      <div className="text-sm text-gray-500">Generate instantly</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Report Categories */}
        <div className="space-y-8">
          {reportsMenu?.categories.map((category) => (
            <div key={category.id}>
              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-3">{category.icon}</span>
                  <h2 className="text-2xl font-bold text-gray-900">{category.name}</h2>
                </div>
                <p className="text-gray-600">{category.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.reports.map((report) => (
                  <div
                    key={report.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all duration-200 cursor-pointer"
                    onClick={() => handleReportClick(report.id)}
                  >
                    <div className="p-6">
                      <div className="flex items-start">
                        <div className="text-3xl mr-4">{report.icon}</div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {report.name}
                          </h3>
                          <p className="text-gray-600 text-sm leading-relaxed">
                            {report.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <button className="w-full py-2 px-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors duration-200 font-medium">
                          Generate Report
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Features Overview */}
        <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Report Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-2">📊</div>
              <div className="font-medium text-gray-900">Real-time Data</div>
              <div className="text-sm text-gray-600">Always up-to-date</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">📅</div>
              <div className="font-medium text-gray-900">Date Ranges</div>
              <div className="text-sm text-gray-600">Flexible periods</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">📄</div>
              <div className="font-medium text-gray-900">Export Options</div>
              <div className="text-sm text-gray-600">PDF, Excel, CSV</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">⚖️</div>
              <div className="font-medium text-gray-900">GAAP Compliant</div>
              <div className="text-sm text-gray-600">Standard formats</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}