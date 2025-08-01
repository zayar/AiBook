'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  CreditCard,
  Banknote,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Eye,
  Settings
} from 'lucide-react';
import AddBankModal from '@/components/AddBankModal';
import { useRouter } from 'next/navigation';

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
  category?: string;
  reconciled: boolean;
}

const BankingPage: React.FC = () => {
  const router = useRouter();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);

    // Load banking data from API
  const loadBankingData = async () => {
    try {
      setLoading(true);
      
      // Load payment methods (bank accounts)
      const bankResponse = await fetch(`${API_URL}/banking/payment-methods`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': 'default'
        }
      });

      if (bankResponse.ok) {
        const bankData = await bankResponse.json();
        
        // Transform payment methods to bank accounts format
        const transformedAccounts: BankAccount[] = bankData.paymentMethods.map((pm: any) => ({
          id: pm.id,
          name: pm.name,
          accountNumber: pm.accountNumber || 'N/A',
          bankName: pm.bankName || 'N/A',
          bankIdentifierCode: pm.bankIdentifierCode || pm.routingNumber || '',
          type: pm.type === 'credit_card' ? 'credit_card' : 'bank',
          currency: pm.currency || 'MMK',
          branch: pm.branch || '',
          description: pm.description || '',
          balance: pm.balance || 0,
          reconciledBalance: pm.reconciledBalance || 0,
          unreconciledTransactions: pm.unreconciledTransactions || 0,
          lastReconciled: pm.lastReconciled || null,
          isDefault: pm.isDefault || false,
          isActive: pm.isActive !== false
        }));
        
        setBankAccounts(transformedAccounts);
      } else {
        console.error('Failed to load bank accounts');
        // Fallback to empty array
        setBankAccounts([]);
      }

      // For now, use mock transactions until bank transactions API is implemented
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
          reconciled: true
        },
        {
          id: '2',
          date: '2025-07-28',
          description: 'Interest for A Bank Loan',
          reference: 'INT-001',
          amount: -10000000.00,
          type: 'withdrawal',
          status: 'pending',
          category: 'Interest Expenses',
          reconciled: false
        },
        {
          id: '3',
          date: '2025-07-27',
          description: 'Software Expense - Atlassian',
          reference: 'EXP-001',
          amount: -319763.90,
          type: 'withdrawal',
          status: 'cleared',
          category: 'Software',
          reconciled: true
        }
      ]);

    } catch (error) {
      console.error('Error loading banking data:', error);
      setBankAccounts([]);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBankingData();
  }, []);

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

  const totalBalance = bankAccounts.reduce((sum, account) => sum + account.balance, 0);
  const totalUnreconciled = bankAccounts.reduce((sum, account) => sum + account.unreconciledTransactions, 0);

  const handleSaveBank = async (bank: any) => {
    try {
      if (editingBank) {
        // Update existing bank
        const response = await fetch(`${API_URL}/banking/payment-methods/${editingBank.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': 'default'
          },
          body: JSON.stringify(bank)
        });
        
        if (response.ok) {
          const result = await response.json();
          // Transform the response to match BankAccount interface
          const paymentMethod = result.paymentMethod || result;
          const transformedAccount: BankAccount = {
            id: paymentMethod.id,
            name: paymentMethod.name,
            accountNumber: paymentMethod.accountNumber || 'N/A',
            bankName: paymentMethod.bankName || 'N/A',
            bankIdentifierCode: paymentMethod.bankIdentifierCode || paymentMethod.routingNumber || '',
            type: paymentMethod.type === 'credit_card' ? 'credit_card' : 'bank',
            currency: paymentMethod.currency || 'MMK',
            branch: paymentMethod.branch || '',
            description: paymentMethod.description || '',
            balance: paymentMethod.balance || 0,
            reconciledBalance: paymentMethod.reconciledBalance || 0,
            unreconciledTransactions: paymentMethod.unreconciledTransactions || 0,
            lastReconciled: paymentMethod.lastReconciled || null,
            isDefault: paymentMethod.isDefault || false,
            isActive: paymentMethod.isActive !== false
          };
          setBankAccounts(prev => prev.map(b => b.id === editingBank.id ? transformedAccount : b));
        }
      } else {
        // Add new bank
        const response = await fetch(`${API_URL}/banking/payment-methods`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': 'default'
          },
          body: JSON.stringify(bank)
        });
        
        if (response.ok) {
          const result = await response.json();
          // Transform the response to match BankAccount interface
          const paymentMethod = result.paymentMethod || result;
          const transformedAccount: BankAccount = {
            id: paymentMethod.id,
            name: paymentMethod.name,
            accountNumber: paymentMethod.accountNumber || 'N/A',
            bankName: paymentMethod.bankName || 'N/A',
            bankIdentifierCode: paymentMethod.bankIdentifierCode || paymentMethod.routingNumber || '',
            type: paymentMethod.type === 'credit_card' ? 'credit_card' : 'bank',
            currency: paymentMethod.currency || 'MMK',
            branch: paymentMethod.branch || '',
            description: paymentMethod.description || '',
            balance: paymentMethod.balance || 0,
            reconciledBalance: paymentMethod.reconciledBalance || 0,
            unreconciledTransactions: paymentMethod.unreconciledTransactions || 0,
            lastReconciled: paymentMethod.lastReconciled || null,
            isDefault: paymentMethod.isDefault || false,
            isActive: paymentMethod.isActive !== false
          };
          setBankAccounts(prev => [...prev, transformedAccount]);
        }
      }
      
      // Reload data to ensure consistency
      await loadBankingData();
    } catch (error) {
      console.error('Error saving bank:', error);
    }
    
    setShowAddBankModal(false);
    setEditingBank(null);
  };

  const handleEditBank = (bank: BankAccount) => {
    setEditingBank(bank);
    setShowAddBankModal(true);
  };

  const handleAddBank = () => {
    setEditingBank(null);
    setShowAddBankModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading banking data...</span>
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
              <Building2 className="h-8 w-8 text-blue-600" />
              <h1 className="ml-3 text-2xl font-bold text-gray-900">Banking Overview</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-blue-600 hover:text-blue-800 flex items-center">
                <Upload className="h-4 w-4 mr-2" />
                Import Statement
              </button>
              <button 
                onClick={handleAddBank}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Bank or Credit Card
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalBalance)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Accounts</p>
                <p className="text-2xl font-bold text-gray-900">{bankAccounts.filter(a => a.isActive).length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Unreconciled</p>
                <p className="text-2xl font-bold text-gray-900">{totalUnreconciled}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Reconciled Today</p>
                <p className="text-2xl font-bold text-gray-900">3</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Accounts List */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Bank Accounts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unreconciled
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Reconciled
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bankAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                            {getAccountIcon(account.type)}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{account.name}</div>
                          <div className="text-sm text-gray-500">{account.accountNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {account.type === 'credit_card' ? 'Credit Card' : 'Bank Account'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className={`font-medium ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(account.balance, account.currency)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {account.unreconciledTransactions > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {account.unreconciledTransactions} items
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          All reconciled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {account.lastReconciled ? new Date(account.lastReconciled).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => router.push(`/banking/${account.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleEditBank(account)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Edit Account"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button 
                          className="text-gray-600 hover:text-gray-900"
                          title="Settings"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Recent Transactions</h2>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="cleared">Cleared</option>
                  <option value="pending">Pending</option>
                  <option value="unreconciled">Unreconciled</option>
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
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
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{transaction.description}</div>
                      {transaction.category && (
                        <div className="text-sm text-gray-500">{transaction.category}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.reference}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium flex items-center ${
                        transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.amount >= 0 ? (
                          <TrendingUp className="h-4 w-4 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 mr-1" />
                        )}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">
                        {transaction.reconciled ? 'View' : 'Reconcile'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Bank Modal */}
      <AddBankModal
        isOpen={showAddBankModal}
        onClose={() => {
          setShowAddBankModal(false);
          setEditingBank(null);
        }}
        onSave={handleSaveBank}
        editingBank={editingBank}
      />
    </div>
  );
};

export default BankingPage; 