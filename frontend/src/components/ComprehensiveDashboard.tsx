'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardData {
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    cashFlow: number;
    invoicesOutstanding: number;
    billsPayable: number;
  };
  recentActivity: Array<{
    id: string;
    type: 'invoice' | 'sales_order' | 'expense' | 'payment';
    description: string;
    amount: number;
    date: string;
    status: string;
  }>;
  aiInsights: Array<{
    type: 'success' | 'warning' | 'info' | 'error';
    title: string;
    message: string;
    action?: string;
    confidence: number;
  }>;
  cashFlowForecast: Array<{
    period: string;
    predicted: number;
    actual?: number;
  }>;
  topCustomers: Array<{
    name: string;
    amount: number;
    invoiceCount: number;
  }>;
  expenseCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

export default function ComprehensiveDashboard() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('3m');
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatResponse, setChatResponse] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Simulate loading multiple API endpoints
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock dashboard data with realistic financial numbers
      setDashboardData({
        summary: {
          totalRevenue: 234500,
          totalExpenses: 156800,
          netIncome: 77700,
          cashFlow: 45200,
          invoicesOutstanding: 23400,
          billsPayable: 18900
        },
        recentActivity: [
          {
            id: '1',
            type: 'invoice',
            description: 'Invoice INV-001 sent to Acme Corp',
            amount: 5500,
            date: '2024-01-15',
            status: 'sent'
          },
          {
            id: '2',
            type: 'payment',
            description: 'Payment received from Tech Solutions',
            amount: 3200,
            date: '2024-01-14',
            status: 'completed'
          },
          {
            id: '3',
            type: 'expense',
            description: 'Office Supplies - Amazon',
            amount: -245,
            date: '2024-01-14',
            status: 'pending'
          },
          {
            id: '4',
            type: 'sales_order',
            description: 'Sales Order SO-003 fulfilled',
            amount: 8900,
            date: '2024-01-13',
            status: 'fulfilled'
          }
        ],
        aiInsights: [
          {
            type: 'success',
            title: 'Strong Cash Flow Position',
            message: 'Your cash flow is 23% above industry average. Consider investing excess cash.',
            action: 'Explore investment options',
            confidence: 0.92
          },
          {
            type: 'warning',
            title: 'Overdue Invoices Detected',
            message: '3 invoices totaling $12,400 are past due. Automated follow-up recommended.',
            action: 'Send payment reminders',
            confidence: 0.95
          },
          {
            type: 'info',
            title: 'Expense Pattern Analysis',
            message: 'Office expenses increased 15% this month. Review for cost optimization.',
            action: 'Analyze expense categories',
            confidence: 0.88
          },
          {
            type: 'success',
            title: 'Revenue Growth Trend',
            message: 'Revenue is trending up 18% compared to last quarter. Strong performance!',
            confidence: 0.91
          }
        ],
        cashFlowForecast: [
          { period: 'Jan 2024', predicted: 45200, actual: 45200 },
          { period: 'Feb 2024', predicted: 48500 },
          { period: 'Mar 2024', predicted: 52100 },
          { period: 'Apr 2024', predicted: 49800 },
          { period: 'May 2024', predicted: 53200 },
          { period: 'Jun 2024', predicted: 56700 }
        ],
        topCustomers: [
          { name: 'Acme Corporation', amount: 45600, invoiceCount: 8 },
          { name: 'Tech Solutions Inc', amount: 32400, invoiceCount: 12 },
          { name: 'Global Industries', amount: 28900, invoiceCount: 6 },
          { name: 'Digital Dynamics', amount: 21300, invoiceCount: 9 },
          { name: 'Innovation Labs', amount: 18700, invoiceCount: 4 }
        ],
        expenseCategories: [
          { category: 'Office Expenses', amount: 23400, percentage: 32 },
          { category: 'Marketing', amount: 18200, percentage: 25 },
          { category: 'Travel', amount: 12800, percentage: 17 },
          { category: 'Software', amount: 9600, percentage: 13 },
          { category: 'Professional Services', amount: 7200, percentage: 10 },
          { category: 'Other', amount: 2400, percentage: 3 }
        ]
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: 'create-invoice',
      title: 'Create Invoice',
      description: 'Generate professional invoices with AI categorization',
      icon: '📄',
      route: '/invoices/create',
      color: 'bg-blue-500'
    },
    {
      id: 'sales-order',
      title: 'New Sales Order',
      description: 'Create orders with fulfillment tracking',
      icon: '📋',
      route: '/sales-orders/create',
      color: 'bg-green-500'
    },
    {
      id: 'expense-entry',
      title: 'Add Expense',
      description: 'Record expenses with AI categorization',
      icon: '💰',
      route: '/expenses/create',
      color: 'bg-orange-500'
    },
    {
      id: 'bank-reconciliation',
      title: 'Bank Reconciliation',
      description: 'AI-powered reconciliation tools',
      icon: '🏦',
      route: '/banking/reconciliation',
      color: 'bg-purple-500'
    }
  ];

  const handleAIChat = async () => {
    if (!chatMessage.trim()) return;
    
    try {
              const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': localStorage.getItem('tenantId') || ''
        },
        body: JSON.stringify({ query: chatMessage })
      });

      if (response.ok) {
        const result = await response.json();
        setChatResponse(result.answer);
      }
    } catch (error) {
      console.error('AI chat error:', error);
      setChatResponse('Sorry, I encountered an error processing your request. Please try again.');
    }
  };

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 border-green-500 text-green-800';
      case 'warning': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'error': return 'bg-red-100 border-red-500 text-red-800';
      default: return 'bg-blue-100 border-blue-500 text-blue-800';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'invoice': return '📄';
      case 'payment': return '💳';
      case 'expense': return '💰';
      case 'sales_order': return '📋';
      default: return '📊';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">🤖 Loading AI-powered insights...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p>Failed to load dashboard data. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI-Powered Dashboard</h1>
            <p className="text-gray-600 mt-1">Real-time insights for your bookkeeping operations</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1m">Last Month</option>
              <option value="3m">Last 3 Months</option>
              <option value="6m">Last 6 Months</option>
              <option value="1y">Last Year</option>
            </select>
            <button
              onClick={() => setShowAIChat(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              🤖 AI Assistant
            </button>
          </div>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">${dashboardData.summary.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="text-2xl">📈</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">${dashboardData.summary.totalExpenses.toLocaleString()}</p>
            </div>
            <div className="text-2xl">📉</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Income</p>
              <p className="text-2xl font-bold text-blue-600">${dashboardData.summary.netIncome.toLocaleString()}</p>
            </div>
            <div className="text-2xl">💰</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cash Flow</p>
              <p className="text-2xl font-bold text-indigo-600">${dashboardData.summary.cashFlow.toLocaleString()}</p>
            </div>
            <div className="text-2xl">🌊</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Outstanding</p>
              <p className="text-2xl font-bold text-orange-600">${dashboardData.summary.invoicesOutstanding.toLocaleString()}</p>
            </div>
            <div className="text-2xl">⏰</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bills Payable</p>
              <p className="text-2xl font-bold text-purple-600">${dashboardData.summary.billsPayable.toLocaleString()}</p>
            </div>
            <div className="text-2xl">📋</div>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">🤖 AI-Powered Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dashboardData.aiInsights.map((insight, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-l-4 ${getStatusColor(insight.type)}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold">{insight.title}</h3>
                  <p className="text-sm mt-1">{insight.message}</p>
                  {insight.action && (
                    <button className="text-sm underline mt-2 hover:no-underline">
                      {insight.action}
                    </button>
                  )}
                </div>
                <div className="text-xs text-gray-500 ml-4">
                  {(insight.confidence * 100).toFixed(0)}% confidence
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <div
              key={action.id}
              onClick={() => router.push(action.route)}
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center text-white text-xl mb-4`}>
                {action.icon}
              </div>
              <h3 className="font-semibold text-gray-900">{action.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{action.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Cash Flow Forecast */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 AI Cash Flow Forecast</h3>
          <div className="space-y-2">
            {dashboardData.cashFlowForecast.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{item.period}</span>
                <div className="flex items-center space-x-2">
                  {item.actual && (
                    <span className="text-sm text-green-600">${item.actual.toLocaleString()}</span>
                  )}
                  <span className="text-sm text-blue-600">${item.predicted.toLocaleString()}</span>
                  {!item.actual && <span className="text-xs text-gray-400">(predicted)</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">👥 Top Customers</h3>
          <div className="space-y-3">
            {dashboardData.topCustomers.map((customer, index) => (
              <div key={index} className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">{customer.name}</p>
                  <p className="text-xs text-gray-500">{customer.invoiceCount} invoices</p>
                </div>
                <span className="font-semibold text-gray-900">${customer.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity & Expense Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Recent Activity</h3>
          <div className="space-y-3">
            {dashboardData.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3">
                <div className="text-2xl">{getActivityIcon(activity.type)}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500">{activity.date}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${activity.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${Math.abs(activity.amount).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{activity.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Categories */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Expense Breakdown</h3>
          <div className="space-y-3">
            {dashboardData.expenseCategories.map((category, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-900">{category.category}</span>
                    <span className="text-sm text-gray-600">${category.amount.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                </div>
                <span className="text-xs text-gray-500">{category.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Chat Modal */}
      {showAIChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">🤖 AI Assistant</h3>
              <button
                onClick={() => setShowAIChat(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ask me about your finances:
                </label>
                <textarea
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 'How can I optimize my cash flow?' or 'What are my biggest expenses?'"
                />
              </div>
              
              {chatResponse && (
                <div className="p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-800">{chatResponse}</p>
                </div>
              )}
              
              <button
                onClick={handleAIChat}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={!chatMessage.trim()}
              >
                Ask AI Assistant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 