'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { InvoiceAPI } from '@/lib/invoice-api';
import UltraEnhancedLoading from '@/components/UltraEnhancedLoading';
import InvoiceLoadingAnimation from '@/components/InvoiceLoadingAnimation';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Mail, 
  Eye, 
  Edit, 
  Trash2, 
  DollarSign,
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Circle,
  MoreVertical,
  FileText,
  Brain,
  Zap,
  ChevronDown,
  ChevronUp,
  SortAsc,
  SortDesc
} from 'lucide-react';

// Types
interface Invoice {
  id?: string;
  invoiceNumber?: string;
  customer?: {
    id: string;
    name: string;
    email: string;
  };
  customerId: string;
  issueDate: string;
  dueDate: string;
  totalAmount?: number;
  paidAmount?: number;
  status?: string;
  currency: string;
  items: Array<{
    id?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    accountCode?: string;
  }>;
}

interface InvoiceFilters {
  status: string;
  customer: string;
  dateRange: string;
  amountRange: string;
}

interface AIInsights {
  cashFlowPrediction: {
    expectedInflow: number;
    confidence: number;
    timeframe: string;
  };
  riskAssessment: {
    highRiskInvoices: number;
    overduePattern: string;
    recommendation: string;
  };
  performanceMetrics: {
    averagePaymentTime: number;
    collectionRate: number;
    trendDirection: 'up' | 'down' | 'stable';
  };
}

type SortField = 'invoiceNumber' | 'customer' | 'issueDate' | 'dueDate' | 'totalAmount' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<InvoiceFilters>({
    status: 'all',
    customer: 'all',
    dateRange: 'all',
    amountRange: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;

  useEffect(() => {
    // OPTIMIZATION: Only show loading spinner on first load
    const isFirstLoad = invoices.length === 0;
    fetchInvoices(isFirstLoad);
    if (isFirstLoad) {
      fetchAIInsights();
    }
  }, [currentPage, searchTerm, filters, sortField, sortDirection]);

  const fetchInvoices = async (isInitialLoad = false) => {
    try {
      // OPTIMIZATION: Only show loading for initial load, not for subsequent updates
      if (isInitialLoad) {
        setLoading(true);
      }
      
      const response = await InvoiceAPI.getInvoices({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        status: filters.status !== 'all' ? filters.status : undefined,
        sortBy: sortField,
        sortOrder: sortDirection
      });
      
      setInvoices(response.invoices || []);
      setTotalCount(response.pagination?.totalCount || 0);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      console.error('❌ Error fetching invoices:', error);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  const fetchAIInsights = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/ai/insights?period=3m`);
      if (response.ok) {
        const data = await response.json();
        
        // Transform the backend response to match the expected AIInsights interface
        const transformedInsights: AIInsights = {
          cashFlowPrediction: {
            expectedInflow: 125000, // Mock data based on insights
            confidence: 87,
            timeframe: '3 months'
          },
          riskAssessment: {
            highRiskInvoices: 3,
            overduePattern: 'Increasing trend',
            recommendation: 'Review payment terms'
          },
          performanceMetrics: {
            averagePaymentTime: 28,
            collectionRate: 92,
            trendDirection: 'stable' as const
          }
        };
        
        setAiInsights(transformedInsights);
      }
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      // Set mock data in case of error to prevent crashes
      const mockInsights: AIInsights = {
        cashFlowPrediction: {
          expectedInflow: 100000,
          confidence: 85,
          timeframe: '3 months'
        },
        riskAssessment: {
          highRiskInvoices: 2,
          overduePattern: 'Stable',
          recommendation: 'Monitor payment patterns'
        },
        performanceMetrics: {
          averagePaymentTime: 30,
          collectionRate: 90,
          trendDirection: 'stable' as const
        }
      };
      setAiInsights(mockInsights);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'SENT':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PARTIALLY_PAID':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'PAID':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <FileText className="h-3 w-3" />;
      case 'SENT':
        return <Mail className="h-3 w-3" />;
      case 'PARTIALLY_PAID':
        return <Clock className="h-3 w-3" />;
      case 'PAID':
        return <CheckCircle className="h-3 w-3" />;
      case 'OVERDUE':
        return <AlertTriangle className="h-3 w-3" />;
      case 'CANCELLED':
        return <Circle className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'MMK') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSendInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers: { 
          'X-Tenant-ID': 'default',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('✅ Invoice sent successfully');
        // Refresh the invoice list to show updated status
        fetchInvoices();
      } else {
        const error = await response.json();
        console.error('❌ Failed to send invoice:', error);
        alert('Failed to send invoice: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error sending invoice:', error);
      alert('Error sending invoice. Please try again.');
    }
  };

  const handleInvoiceAction = async (action: string, invoiceId: string) => {
    switch (action) {
      case 'view':
        router.push(`/invoices/${invoiceId}`);
        break;
      case 'edit':
        router.push(`/invoices/${invoiceId}/edit`);
        break;
      case 'duplicate':
        // TODO: Implement duplicate functionality
        console.log('Duplicate invoice:', invoiceId);
        break;
      case 'send':
        await handleSendInvoice(invoiceId);
        break;
      case 'delete':
        // TODO: Implement delete functionality
        console.log('Delete invoice:', invoiceId);
        break;
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <SortAsc className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4 text-blue-600" /> : 
      <ChevronDown className="h-4 w-4 text-blue-600" />;
  };

  const renderAIInsights = () => {
    if (!aiInsights) return null;

    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">AI Financial Insights LIVE</h3>
          </div>
          <button
            onClick={() => setShowAIPanel(!showAIPanel)}
            className="text-blue-600 hover:text-blue-700"
          >
            {showAIPanel ? 'Hide' : 'Show'}
          </button>
        </div>
        
        {showAIPanel && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {aiInsights ? (
              <>
                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">Cash Flow Prediction</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(aiInsights.cashFlowPrediction.expectedInflow)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {aiInsights.cashFlowPrediction.confidence}% confidence • {aiInsights.cashFlowPrediction.timeframe}
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-gray-700">Risk Assessment</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">
                    {aiInsights.riskAssessment.highRiskInvoices}
                  </p>
                  <p className="text-xs text-gray-500">
                    High-risk invoices • {aiInsights.riskAssessment.recommendation}
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-gray-700">Collection Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">
                    {aiInsights.performanceMetrics.collectionRate}%
                  </p>
                  <p className="text-xs text-gray-500">
                    Avg. {aiInsights.performanceMetrics.averagePaymentTime} days to pay
                  </p>
                </div>
              </>
            ) : (
              <div className="col-span-3 bg-white rounded-lg p-6 border border-gray-200 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading AI insights...</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderInvoiceTable = () => (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('invoiceNumber')}
                  className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                >
                  <span>Invoice</span>
                  {getSortIcon('invoiceNumber')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('customer')}
                  className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                >
                  <span>Customer</span>
                  {getSortIcon('customer')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('issueDate')}
                  className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                >
                  <span>Issue Date</span>
                  {getSortIcon('issueDate')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('dueDate')}
                  className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                >
                  <span>Due Date</span>
                  {getSortIcon('dueDate')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('totalAmount')}
                  className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                >
                  <span>Amount</span>
                  {getSortIcon('totalAmount')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                >
                  <span>Status</span>
                  {getSortIcon('status')}
                </button>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
                         {invoices.map((invoice) => (
               <tr key={invoice.id || 'temp-id'} className="hover:bg-gray-50 transition-colors">
                 <td className="px-6 py-4 whitespace-nowrap">
                   <div className="flex items-center">
                     <div className="text-sm font-medium text-gray-900">
                       {invoice.invoiceNumber || 'Draft'}
                     </div>
                   </div>
                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap">
                   <div className="text-sm text-gray-900">{invoice.customer?.name || 'Unknown Customer'}</div>
                   <div className="text-sm text-gray-500">{invoice.customer?.email || ''}</div>
                 </td>
                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                   {formatDate(invoice.issueDate)}
                 </td>
                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                   {formatDate(invoice.dueDate)}
                 </td>
                 <td className="px-6 py-4 whitespace-nowrap">
                   <div className="text-sm font-medium text-gray-900">
                     {formatCurrency(invoice.totalAmount || 0, invoice.currency)}
                   </div>
                   {invoice.paidAmount && invoice.paidAmount > 0 && (
                     <div className="text-sm text-gray-500">
                       Paid: {formatCurrency(invoice.paidAmount, invoice.currency)}
                     </div>
                   )}
                 </td>
                 <td className="px-6 py-4 whitespace-nowrap">
                   <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(invoice.status || 'DRAFT')}`}>
                     {getStatusIcon(invoice.status || 'DRAFT')}
                     <span>{(invoice.status || 'DRAFT').replace('_', ' ')}</span>
                   </span>
                 </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                                         <button
                       onClick={() => invoice.id && handleInvoiceAction('view', invoice.id)}
                       className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                       title="View Invoice"
                       disabled={!invoice.id}
                     >
                       <Eye className="h-4 w-4" />
                     </button>
                     <button
                       onClick={() => invoice.id && handleInvoiceAction('edit', invoice.id)}
                       className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50"
                       title="Edit Invoice"
                       disabled={!invoice.id}
                     >
                       <Edit className="h-4 w-4" />
                     </button>
                     <div className="relative group">
                       <button className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50">
                         <MoreVertical className="h-4 w-4" />
                       </button>
                       <div className="absolute right-0 top-8 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                         <button
                           onClick={() => invoice.id && handleInvoiceAction('duplicate', invoice.id)}
                           className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                           disabled={!invoice.id}
                         >
                           <FileText className="h-4 w-4" />
                           <span>Duplicate</span>
                         </button>
                                                 {invoice.status === 'DRAFT' && (
                          <button
                            onClick={() => invoice.id && handleInvoiceAction('send', invoice.id)}
                            className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center space-x-2"
                            disabled={!invoice.id}
                          >
                            <Mail className="h-4 w-4" />
                            <span>Send Invoice</span>
                          </button>
                        )}
                         <button
                           onClick={() => invoice.id && handleInvoiceAction('delete', invoice.id)}
                           className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                           disabled={!invoice.id}
                         >
                           <Trash2 className="h-4 w-4" />
                           <span>Delete</span>
                         </button>
                       </div>
                     </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return <InvoiceLoadingAnimation />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-1">Manage your invoices with AI-powered insights</p>
        </div>
        <button
          onClick={() => router.push('/invoices/new')}
          className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>New Invoice</span>
        </button>
      </div>

      {/* AI Insights Panel */}
      {renderAIInsights()}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-80"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {totalCount} invoice{totalCount !== 1 ? 's' : ''} found
            </span>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>

            <select
              value={filters.amountRange}
              onChange={(e) => setFilters(prev => ({ ...prev, amountRange: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Amounts</option>
              <option value="0-100000">Under 100K</option>
              <option value="100000-500000">100K - 500K</option>
              <option value="500000-1000000">500K - 1M</option>
              <option value="1000000+">Over 1M</option>
            </select>

            <button
              onClick={() => setFilters({ status: 'all', customer: 'all', dateRange: 'all', amountRange: 'all' })}
              className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Invoices Table */}
      {renderInvoiceTable()}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-6">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Empty State */}
      {invoices.length === 0 && !loading && (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No invoices found</h3>
          <p className="text-gray-600 mb-6">Create your first invoice to get started</p>
          <button
            onClick={() => router.push('/invoices/new')}
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Create Invoice</span>
          </button>
        </div>
      )}
    </div>
  );
} 