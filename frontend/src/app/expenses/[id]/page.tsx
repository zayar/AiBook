'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, Edit, Trash2, CheckCircle, XCircle, Download, 
  FileText, Calendar, DollarSign, Building, User, Receipt,
  Tag, CreditCard, AlertTriangle, Clock, TrendingUp,
  Printer, Share, Eye, ExternalLink
} from 'lucide-react';
import { ExpenseAPI, Expense, JournalEntry, ExpenseDetail } from '@/lib/expense-api';

const ExpenseDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const expenseId = params.id as string;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [doubleEntry, setDoubleEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (expenseId) {
      loadExpenseDetail();
    }
  }, [expenseId]);

  const loadExpenseDetail = async () => {
    try {
      setLoading(true);
      const response: ExpenseDetail = await ExpenseAPI.getExpense(expenseId);
      setExpense(response.expense);
      setJournalEntries(response.journalEntries || []);
      setDoubleEntry(response.doubleEntry);
      setError(null);
    } catch (error) {
      console.error('Error loading expense detail:', error);
      setError('Failed to load expense details');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveExpense = async () => {
    if (!expense || !confirm('Are you sure you want to approve this expense?')) return;
    
    try {
      await ExpenseAPI.approveExpense(expense.id);
      loadExpenseDetail(); // Reload to get updated data with journal entries
    } catch (error) {
      console.error('Error approving expense:', error);
      alert('Failed to approve expense');
    }
  };

  const handleDeleteExpense = async () => {
    if (!expense || !confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      await ExpenseAPI.deleteExpense(expense.id);
      router.push('/expenses');
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense');
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading expense details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error || 'Expense not found'}</p>
            <button
              onClick={() => router.push('/expenses')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Expenses
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/expenses')}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Expenses
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{expense.expenseNumber}</h1>
            <p className="text-gray-600 mt-1">{expense.description}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {expense.status === 'PENDING' && (
            <>
              <button
                onClick={() => router.push(`/expenses/${expense.id}/edit`)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleApproveExpense}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Approve
              </button>
              <button
                onClick={handleDeleteExpense}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`p-4 rounded-lg border flex items-center gap-3 ${ExpenseAPI.getStatusColor(expense.status)}`}>
        <span className="text-2xl">{ExpenseAPI.getStatusIcon(expense.status)}</span>
        <div>
          <p className="font-semibold">Status: {expense.status}</p>
          {expense.approvedAt && (
            <p className="text-sm">
              {expense.status === 'APPROVED' ? 'Approved' : 'Updated'} on {new Date(expense.approvedAt).toLocaleString()}
              {expense.approvedBy && ` by ${expense.approvedBy}`}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Expense Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-gray-900 mt-1">{expense.description}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Expense Date</label>
                <p className="text-gray-900 mt-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(expense.expenseDate).toLocaleDateString()}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Category</label>
                <p className="text-gray-900 mt-1 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  {expense.category}
                  {expense.subcategory && ` / ${expense.subcategory}`}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Branch</label>
                <p className="text-gray-900 mt-1 flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  {expense.branch || 'Head Office'}
                </p>
              </div>
              
              {expense.reference && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Reference</label>
                  <p className="text-gray-900 mt-1">{expense.reference}</p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-500">Billable</label>
                <p className="text-gray-900 mt-1">
                  {expense.billable ? (
                    <span className="text-green-600 font-medium">Yes</span>
                  ) : (
                    <span className="text-gray-600">No</span>
                  )}
                </p>
              </div>
            </div>

            {expense.notes && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <label className="text-sm font-medium text-gray-500">Notes</label>
                <p className="text-gray-900 mt-1 whitespace-pre-wrap">{expense.notes}</p>
              </div>
            )}
          </div>

          {/* Amount Breakdown */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Amount Breakdown
            </h2>
            
            <div className="space-y-4">
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Base Amount:</span>
                <span className="font-medium">{ExpenseAPI.formatAmount(expense.amount, expense.currency)}</span>
              </div>
              
              {expense.taxAmount > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">
                    Tax ({expense.taxRate?.name} - {expense.taxRate?.rate}%):
                  </span>
                  <span className="font-medium">{ExpenseAPI.formatAmount(expense.taxAmount, expense.currency)}</span>
                </div>
              )}
              
              <div className="border-t border-gray-200 pt-2">
                <div className="flex justify-between py-2">
                  <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
                  <span className="text-lg font-bold text-blue-600">
                    {ExpenseAPI.formatAmount(expense.totalAmount, expense.currency)}
                  </span>
                </div>
              </div>
              
              {expense.currency !== 'MMK' && (
                <div className="text-sm text-gray-500">
                  Exchange Rate: 1 {expense.currency} = {expense.exchangeRate} MMK
                </div>
              )}
            </div>
          </div>

          {/* Accounts Information */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Building className="w-5 h-5" />
              Account Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Expense Account</label>
                <p className="text-gray-900 mt-1">
                  <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded mr-2">
                    {expense.expenseAccount.code}
                  </span>
                  {expense.expenseAccount.name}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Paid Through</label>
                <p className="text-gray-900 mt-1 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded mr-2">
                    {expense.paidThrough.code}
                  </span>
                  {expense.paidThrough.name}
                </p>
              </div>
            </div>
          </div>

          {/* Vendor & Customer Information */}
          {(expense.vendor || expense.customer) && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <User className="w-5 h-5" />
                Vendor & Customer Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {expense.vendor && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Vendor</label>
                    <p className="text-gray-900 mt-1">
                      {expense.vendor.displayName || expense.vendor.name}
                    </p>
                    {expense.vendor.email && (
                      <p className="text-sm text-gray-600">{expense.vendor.email}</p>
                    )}
                  </div>
                )}
                
                {expense.customer && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Customer</label>
                    <p className="text-gray-900 mt-1">{expense.customer.name}</p>
                    {expense.customer.email && (
                      <p className="text-sm text-gray-600">{expense.customer.email}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Double Entry Journal Records */}
          {doubleEntry && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Journal Entries (Double Entry)
              </h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Branch
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
                    {journalEntries.map((entry, index) => (
                      <tr key={entry.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded mr-2">
                                {entry.account.code}
                              </span>
                              {entry.account.name}
                            </div>
                            <div className="text-sm text-gray-500">{entry.memo}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {expense.branch || 'Head Office'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {entry.type === 'DEBIT' ? (
                            <span className="text-gray-900">
                              {ExpenseAPI.formatAmount(entry.amount, entry.currency)}
                            </span>
                          ) : (
                            <span className="text-gray-400">0.00</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {entry.type === 'CREDIT' ? (
                            <span className="text-gray-900">
                              {ExpenseAPI.formatAmount(entry.amount, entry.currency)}
                            </span>
                          ) : (
                            <span className="text-gray-400">0.00</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100">
                    <tr>
                      <td colSpan={2} className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                        Totals:
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                        {ExpenseAPI.formatAmount(doubleEntry.totalDebits, expense.currency)}
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                        {ExpenseAPI.formatAmount(doubleEntry.totalCredits, expense.currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-900 font-medium">Double Entry Validation:</span>
                  <span className={`font-bold ${
                    Math.abs(doubleEntry.totalDebits - doubleEntry.totalCredits) < 0.01 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {Math.abs(doubleEntry.totalDebits - doubleEntry.totalCredits) < 0.01 
                      ? '✅ Balanced' 
                      : '❌ Unbalanced'
                    }
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Info</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="text-gray-900">{new Date(expense.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Updated:</span>
                <span className="text-gray-900">{new Date(expense.updatedAt).toLocaleDateString()}</span>
              </div>
              {expense.paidAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Paid:</span>
                  <span className="text-green-600">{new Date(expense.paidAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Receipts */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Receipts
            </h3>
            {expense.receiptFiles && expense.receiptFiles.length > 0 ? (
              <div className="space-y-2">
                {expense.receiptFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                    <span className="text-sm text-gray-700">Receipt {index + 1}</span>
                    <button className="text-blue-600 hover:text-blue-700">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No receipts attached</p>
            )}
          </div>

          {/* Actions */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => window.print()}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print Expense
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Share className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDetailPage;