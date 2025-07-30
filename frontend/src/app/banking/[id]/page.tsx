'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Building2, 
  CreditCard, 
  Banknote,
  Download,
  Upload,
  Filter,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Calendar,
  FileText,
  Edit3,
  RefreshCw,
  MoreVertical
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface BankAccount {
  id: string;
  name: string;
  accountNumber: string;
  bankName: string;
  bankIdentifierCode?: string;
  type: 'bank' | 'credit_card';
  currency: string;
  branch?: string;
  description?: string;
  balance: number;
  reconciledBalance: number;
  unreconciledTransactions: number;
  lastReconciled: string | null;
  isDefault: boolean;
  isActive: boolean;
}

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  reference: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  status: 'cleared' | 'pending' | 'unreconciled';
  category: string;
  reconciled: boolean;
  reconciledAt?: string;
}

interface ReconciliationSummary {
  statementBalance: number;
  bookBalance: number;
  difference: number;
  unreconciledTransactions: number;
  lastReconciliationDate: string | null;
  status: 'reconciled' | 'pending' | 'discrepancy';
}

const BankingDetailsPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const accountId = params.id as string;

  const [account, setAccount] = useState<BankAccount | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);

  // Load account details and transactions
  const loadAccountData = async () => {
    try {
      setLoading(true);
      
      // Load payment methods to find the specific account
      const accountResponse = await fetch(`${API_URL}/banking/payment-methods`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': 'default'
        }
      });

      if (accountResponse.ok) {
        const accounts = await accountResponse.json();
        const foundAccount = accounts.find((acc: any) => acc.id === accountId);
        
        if (foundAccount) {
          const transformedAccount: BankAccount = {
            id: foundAccount.id,
            name: foundAccount.name,
            accountNumber: foundAccount.accountNumber || 'N/A',
            bankName: foundAccount.bankName || 'N/A',
            bankIdentifierCode: foundAccount.bankIdentifierCode || foundAccount.routingNumber || '',
            type: foundAccount.type === 'credit_card' ? 'credit_card' : 'bank',
            currency: foundAccount.currency || 'MMK',
            branch: foundAccount.branch || '',
            description: foundAccount.description || '',
            balance: foundAccount.balance || 0,
            reconciledBalance: foundAccount.reconciledBalance || 0,
            unreconciledTransactions: foundAccount.unreconciledTransactions || 0,
            lastReconciled: foundAccount.lastReconciled || null,
            isDefault: foundAccount.isDefault || false,
            isActive: foundAccount.isActive !== false
          };
          setAccount(transformedAccount);

          // Set reconciliation summary
          setReconciliation({
            statementBalance: transformedAccount.balance,
            bookBalance: transformedAccount.reconciledBalance,
            difference: transformedAccount.balance - transformedAccount.reconciledBalance,
            unreconciledTransactions: transformedAccount.unreconciledTransactions,
            lastReconciliationDate: transformedAccount.lastReconciled,
            status: transformedAccount.unreconciledTransactions === 0 ? 'reconciled' : 'pending'
          });
        } else {
          console.error('Account not found');
        }
      }

      // Load transactions for this account (mock data for now)
      setTransactions([
        {
          id: '1',
          date: '2025-07-29',
          description: 'Customer Payment - Sweet Connect',
          reference: 'PAY-001',
          amount: 2200000.00,
          type: 'deposit',
          status: 'cleared',
          category: 'Customer Payment',
          reconciled: true,
          reconciledAt: '2025-07-29'
        },
        {
          id: '2',
          date: '2025-07-28',
          description: 'Interest for Bank Loan',
          reference: 'INT-001',
          amount: -150000.00,
          type: 'withdrawal',
          status: 'pending',
          category: 'Interest Expenses',
          reconciled: false
        },
        {
          id: '3',
          date: '2025-07-27',
          description: 'Office Rent Payment',
          reference: 'RENT-001',
          amount: -1800000.00,
          type: 'withdrawal',
          status: 'cleared',
          category: 'Rent Expense',
          reconciled: true,
          reconciledAt: '2025-07-27'
        },
        {
          id: '4',
          date: '2025-07-26',
          description: 'Equipment Purchase',
          reference: 'EQ-001',
          amount: -2500000.00,
          type: 'withdrawal',
          status: 'unreconciled',
          category: 'Equipment',
          reconciled: false
        }
      ]);

    } catch (error) {
      console.error('Error loading account data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accountId) {
      loadAccountData();
    }
  }, [accountId]);

  const formatCurrency = (amount: number, currency: string = 'MMK') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'credit_card':
        return <CreditCard className="h-5 w-5" />;
      case 'bank':
        return <Building2 className="h-5 w-5" />;
      default:
        return <Banknote className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'cleared':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'unreconciled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.reference.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || transaction.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const toggleTransactionSelection = (transactionId: string) => {
    setSelectedTransactions(prev => 
      prev.includes(transactionId)
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  const handleReconcileSelected = () => {
    // Implement reconciliation logic
    console.log('Reconciling transactions:', selectedTransactions);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading account details...</span>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Account Not Found</h2>
          <p className="text-gray-600 mb-4">The requested bank account could not be found.</p>
          <button
            onClick={() => router.push('/banking')}
            className="text-blue-600 hover:text-blue-800"
          >
            Back to Banking Overview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/banking')}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              {getAccountIcon(account.type)}
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">{account.name}</h1>
                <p className="text-sm text-gray-600">{account.bankName} • {account.accountNumber}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-blue-600 hover:text-blue-800 flex items-center">
                <Upload className="h-4 w-4 mr-2" />
                Import Statement
              </button>
              <button className="text-blue-600 hover:text-blue-800 flex items-center">
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Account Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Current Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(account.balance, account.currency)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Reconciled Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(account.reconciledBalance, account.currency)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Unreconciled</p>
                <p className="text-2xl font-bold text-gray-900">
                  {account.unreconciledTransactions}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Last Reconciled</p>
                <p className="text-sm font-bold text-gray-900">
                  {account.lastReconciled ? new Date(account.lastReconciled).toLocaleDateString() : 'Never'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Reconciliation Summary */}
        {reconciliation && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reconciliation Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Statement Balance</p>
                <p className="text-lg font-semibold">{formatCurrency(reconciliation.statementBalance)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Book Balance</p>
                <p className="text-lg font-semibold">{formatCurrency(reconciliation.bookBalance)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Difference</p>
                <p className={`text-lg font-semibold ${reconciliation.difference === 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(reconciliation.difference)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  reconciliation.status === 'reconciled' ? 'bg-green-100 text-green-800' :
                  reconciliation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {reconciliation.status}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Transactions Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Transactions</h3>
              <div className="flex items-center space-x-4">
                {selectedTransactions.length > 0 && (
                  <button
                    onClick={handleReconcileSelected}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Reconcile Selected ({selectedTransactions.length})
                  </button>
                )}
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="cleared">Cleared</option>
                    <option value="pending">Pending</option>
                    <option value="unreconciled">Unreconciled</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.length === filteredTransactions.length && filteredTransactions.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTransactions(filteredTransactions.map(t => t.id));
                        } else {
                          setSelectedTransactions([]);
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reconciled
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.includes(transaction.id)}
                        onChange={() => toggleTransactionSelection(transaction.id)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{transaction.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.reference}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(Math.abs(transaction.amount), account.currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {transaction.reconciled ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-500" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
              <p className="text-gray-600">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filter criteria.' 
                  : 'No transactions have been recorded for this account yet.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BankingDetailsPage; 