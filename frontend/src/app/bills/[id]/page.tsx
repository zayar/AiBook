'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Edit, Calendar, Building, FileText, DollarSign, CreditCard, BookOpen, Activity } from 'lucide-react';
import { billApi } from '@/lib/bill-api';

interface BillItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  taxRate: string;
  accountCode: string;
}

interface Vendor {
  id: string;
  name: string;
  displayName?: string;
  email?: string;
  phone?: string;
}

interface Bill {
  id: string;
  billNumber: string;
  vendorId: string;
  billDate: string;
  dueDate: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  paidAmount: string;
  status: string;
  currency: string;
  notes?: string;
  vendor: Vendor;
  items: BillItem[];
  createdAt: string;
  updatedAt: string;
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  totalDebit: string;
  totalCredit: string;
  entries: {
    id: string;
    accountCode: string;
    accountName: string;
    debitAmount: string;
    creditAmount: string;
    memo?: string;
  }[];
}

export default function BillDetailPage() {
  const router = useRouter();
  const params = useParams();
  const billId = params.id as string;

  const [bill, setBill] = useState<Bill | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'journal'>('details');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (billId) {
      loadBillDetails();
    }
  }, [billId]);

  const loadBillDetails = async () => {
    try {
      setLoading(true);
      const response = await billApi.getBillById(billId);
      const billData = response.bill;
      setBill(billData);

      // Load journal entries for this bill
      // Note: This would need to be implemented in the backend
      // For now, we'll create mock data based on the bill
      await loadJournalEntries(billData);
    } catch (error: any) {
      console.error('Error loading bill:', error);
      setError('Failed to load bill details');
    } finally {
      setLoading(false);
    }
  };

  const loadJournalEntries = async (billData: Bill) => {
    try {
      // For now, we'll create mock journal entries based on the bill data
      // In a real implementation, this would fetch from the backend
      const mockJournalEntry: JournalEntry = {
        id: `journal-${billData.id}`,
        entryNumber: `BILL-${billData.billNumber}`,
        date: billData.billDate,
        description: `Bill ${billData.billNumber} - ${billData.vendor.name}`,
        totalDebit: billData.totalAmount,
        totalCredit: billData.totalAmount,
        entries: [
          // Debit entries for each line item
          ...billData.items.map((item, index) => ({
            id: `entry-${index}-debit`,
            accountCode: item.accountCode,
            accountName: getAccountName(item.accountCode),
            debitAmount: item.totalPrice,
            creditAmount: '0',
            memo: item.description
          })),
          // Tax entry if there's tax
          ...(parseFloat(billData.taxAmount) > 0 ? [{
            id: 'entry-tax',
            accountCode: '1103',
            accountName: 'Tax Receivable',
            debitAmount: billData.taxAmount,
            creditAmount: '0',
            memo: 'Sales tax on purchases'
          }] : []),
          // Credit entry for Accounts Payable
          {
            id: 'entry-ap-credit',
            accountCode: '2000',
            accountName: 'Accounts Payable',
            debitAmount: '0',
            creditAmount: billData.totalAmount,
            memo: `Amount owed to ${billData.vendor.name}`
          }
        ]
      };

      setJournalEntries([mockJournalEntry]);
    } catch (error) {
      console.error('Error loading journal entries:', error);
    }
  };

  const getAccountName = (accountCode: string): string => {
    const accountMap: Record<string, string> = {
      '6000': 'Office Expenses',
      '6100': 'Marketing Expenses',
      '6200': 'Travel Expenses',
      '6300': 'Software Subscriptions',
      '6400': 'Professional Services',
      '5000': 'Cost of Goods Sold',
      '1103': 'Tax Receivable',
      '2000': 'Accounts Payable'
    };
    return accountMap[accountCode] || `Account ${accountCode}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'OVERDUE': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: string, currency: string = 'MMK') => {
    return `${currency} ${parseFloat(amount).toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Bill not found'}</p>
            <button
              onClick={() => router.push('/bills')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Bills
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bill {bill.billNumber}</h1>
            <p className="text-gray-600">Bill details and journal entries</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(bill.status)}`}>
            {bill.status}
          </span>
          <button
            onClick={() => router.push(`/bills/${bill.id}/edit`)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="w-4 h-4" />
            <span>Edit</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Bill Details</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('journal')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'journal'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4" />
              <span>Journal Entries</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          {/* Bill Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <div className="flex items-center space-x-2 text-gray-600 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Bill Date</span>
                </div>
                <p className="font-semibold">{formatDate(bill.billDate)}</p>
              </div>
              <div>
                <div className="flex items-center space-x-2 text-gray-600 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Due Date</span>
                </div>
                <p className="font-semibold">{formatDate(bill.dueDate)}</p>
              </div>
              <div>
                <div className="flex items-center space-x-2 text-gray-600 mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm">Total Amount</span>
                </div>
                <p className="font-semibold text-lg">{formatCurrency(bill.totalAmount, bill.currency)}</p>
              </div>
              <div>
                <div className="flex items-center space-x-2 text-gray-600 mb-1">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-sm">Amount Due</span>
                </div>
                <p className="font-semibold text-lg text-red-600">
                  {formatCurrency((parseFloat(bill.totalAmount) - parseFloat(bill.paidAmount)).toString(), bill.currency)}
                </p>
              </div>
            </div>
          </div>

          {/* Vendor Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Building className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Vendor Information</h2>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">{bill.vendor.displayName || bill.vendor.name}</h3>
              {bill.vendor.email && (
                <p className="text-gray-600">Email: {bill.vendor.email}</p>
              )}
              {bill.vendor.phone && (
                <p className="text-gray-600">Phone: {bill.vendor.phone}</p>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Line Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Description</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Account</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Qty</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Unit Price</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Tax %</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">{item.description}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {item.accountCode} - {getAccountName(item.accountCode)}
                      </td>
                      <td className="py-3 px-4 text-right">{parseFloat(item.quantity)}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(item.unitPrice, bill.currency)}</td>
                      <td className="py-3 px-4 text-right">{parseFloat(item.taxRate)}%</td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(item.totalPrice, bill.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200 mt-4 pt-4">
              <div className="space-y-2 text-right max-w-sm ml-auto">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(bill.subtotal, bill.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax Amount:</span>
                  <span className="font-medium">{formatCurrency(bill.taxAmount, bill.currency)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                  <span>Total Amount:</span>
                  <span className="text-blue-600">{formatCurrency(bill.totalAmount, bill.currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {bill.notes && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Notes</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{bill.notes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'journal' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Activity className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Journal Entries</h2>
              <span className="text-sm text-gray-500">(Double-Entry Accounting)</span>
            </div>

            {journalEntries.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No journal entries found for this bill.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {journalEntries.map((journal) => (
                  <div key={journal.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-medium text-gray-900">Entry: {journal.entryNumber}</h3>
                        <p className="text-sm text-gray-600">{journal.description}</p>
                        <p className="text-sm text-gray-500">Date: {formatDate(journal.date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          Total Debit: <span className="font-medium">{formatCurrency(journal.totalDebit, bill.currency)}</span>
                        </p>
                        <p className="text-sm text-gray-600">
                          Total Credit: <span className="font-medium">{formatCurrency(journal.totalCredit, bill.currency)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left py-2 px-3 font-medium text-gray-700">Account</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-700">Description</th>
                            <th className="text-right py-2 px-3 font-medium text-gray-700">Debit</th>
                            <th className="text-right py-2 px-3 font-medium text-gray-700">Credit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {journal.entries.map((entry) => (
                            <tr key={entry.id} className="border-b border-gray-100">
                              <td className="py-2 px-3">
                                <div>
                                  <span className="font-medium">{entry.accountCode}</span>
                                  <div className="text-sm text-gray-600">{entry.accountName}</div>
                                </div>
                              </td>
                              <td className="py-2 px-3 text-sm text-gray-600">{entry.memo}</td>
                              <td className="py-2 px-3 text-right">
                                {parseFloat(entry.debitAmount) > 0 && (
                                  <span className="font-medium text-green-600">
                                    {formatCurrency(entry.debitAmount, bill.currency)}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {parseFloat(entry.creditAmount) > 0 && (
                                  <span className="font-medium text-blue-600">
                                    {formatCurrency(entry.creditAmount, bill.currency)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                            <td className="py-2 px-3" colSpan={2}>Total</td>
                            <td className="py-2 px-3 text-right text-green-600">
                              {formatCurrency(journal.totalDebit, bill.currency)}
                            </td>
                            <td className="py-2 px-3 text-right text-blue-600">
                              {formatCurrency(journal.totalCredit, bill.currency)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div className="mt-3 p-3 bg-blue-50 rounded text-sm">
                      <p className="text-blue-800">
                        <strong>Accounting Impact:</strong> This bill increases expenses and accounts payable, 
                        following double-entry bookkeeping principles where total debits equal total credits.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}