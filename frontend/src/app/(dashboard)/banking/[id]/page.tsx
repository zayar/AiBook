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
  MoreVertical,
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
  Plus
} from 'lucide-react';

const API_URL = '/api/v1'; // Use frontend proxy for consistent authentication

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
  description: string;
  amount: number;
  transactionDate: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'FEE' | 'INTEREST';
  reference?: string;
  category?: string;
  runningBalance: number;
  status: 'cleared' | 'pending' | 'unreconciled';
  reconciled: boolean;
  reconciledAt?: string;
  paymentMethod?: {
    id: string;
    name: string;
    accountNumber?: string;
    currency: string;
  };
}

interface BalanceSummary {
  openingBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  closingBalance: number;
  unreconciledAmount: number;
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
  
  console.log('🔍 Component initialized with params:', params);
  console.log('🔍 Account ID extracted:', accountId);
  
  const [account, setAccount] = useState<BankAccount | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [balanceSummary, setBalanceSummary] = useState<BalanceSummary | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // Ensure we're running on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load account details and transactions
  const loadAccountData = async () => {
    // Prevent multiple simultaneous calls
    if (isLoadingData) {
      console.log('🔍 Already loading data, skipping duplicate call');
      return;
    }
    
    try {
      setIsLoadingData(true);
      setLoading(true);
      
      // Check if we're running in the browser
      if (typeof window === 'undefined') {
        console.log('🔍 Running on server side, skipping localStorage access');
        return;
      }
      
      // Check if accountId is properly set
      if (!accountId) {
        console.log('❌ No account ID provided');
        return;
      }
      
      // Load payment methods to find the specific account
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const tenantId = localStorage.getItem('tenantId') || 'default';
      
      console.log('🔍 Debug info:', { token: token ? 'present' : 'missing', tenantId, accountId });
      
      // Try without authentication first to see if that's the issue
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('🔍 Making request with headers:', headers);
      
      const accountResponse = await fetch(`${API_URL}/banking/payment-methods`, { headers });
      
      console.log('🔍 Response status:', accountResponse.status);
      console.log('🔍 Response headers:', Object.fromEntries(accountResponse.headers.entries()));

      if (accountResponse.ok) {
        const accountData = await accountResponse.json();
        console.log('🔍 Payment methods response:', accountData);
        const paymentMethods = accountData.paymentMethods || [];
        console.log('🔍 Payment methods array:', paymentMethods);
        console.log('🔍 Looking for account ID:', accountId);
        console.log('🔍 Account ID type:', typeof accountId);
        console.log('🔍 Account ID length:', accountId?.length);
        
        // Check each payment method ID for comparison
        paymentMethods.forEach((acc: any, index: number) => {
          console.log(`🔍 Payment method ${index}:`, {
            id: acc.id,
            idType: typeof acc.id,
            idLength: acc.id?.length,
            matches: acc.id === accountId,
            strictEqual: acc.id === accountId,
            includes: acc.id?.includes(accountId),
            accountIdIncludes: accountId?.includes(acc.id)
          });
        });
        
        // Try multiple ways to find the account
        let foundAccount = paymentMethods.find((acc: any) => acc.id === accountId);
        
        if (!foundAccount) {
          // Try case-insensitive comparison
          foundAccount = paymentMethods.find((acc: any) => 
            acc.id?.toLowerCase() === accountId?.toLowerCase()
          );
        }
        
        if (!foundAccount) {
          // Try partial match
          foundAccount = paymentMethods.find((acc: any) => 
            acc.id?.includes(accountId) || accountId?.includes(acc.id)
          );
        }
        
        console.log('🔍 Found account:', foundAccount);
        
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

          // Load transactions with enhanced data
          await loadTransactions(accountId);

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
          console.error('❌ Account not found');
          console.error('❌ Available accounts:', paymentMethods.map((acc: any) => ({ id: acc.id, name: acc.name })));
          console.error('❌ Looking for ID:', accountId);
        }
      } else {
        console.error('❌ Failed to fetch payment methods');
        console.error('❌ Response status:', accountResponse.status);
        console.error('❌ Response text:', await accountResponse.text());
      }

    } catch (error) {
      console.error('❌ Error loading account data:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        accountId,
        API_URL
      });
    } finally {
      setLoading(false);
      setIsLoadingData(false);
    }
  };

  // Load transactions with enhanced API
  const loadTransactions = async (paymentMethodId: string) => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const tenantId = localStorage.getItem('tenantId') || 'default';
      const transactionResponse = await fetch(
        `${API_URL}/banking/payment-methods/${paymentMethodId}/transactions?page=1&limit=50&status=${filterStatus}${searchTerm ? `&search=${searchTerm}` : ''}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': tenantId,
            'Authorization': token ? `Bearer ${token}` : ''
          }
        }
      );

      if (transactionResponse.ok) {
        const transactionData = await transactionResponse.json();
        setTransactions(transactionData.transactions || []);
        setBalanceSummary(transactionData.balanceSummary);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      // Fallback to mock data
      setTransactions([
        {
          id: '1',
          description: 'Customer Payment - Sweet Connect',
          amount: 2200000.00,
          transactionDate: '2025-07-29',
          type: 'DEPOSIT',
          reference: 'PAY-001',
          category: 'Customer Payment',
          runningBalance: 67349504.10,
          status: 'cleared',
          reconciled: true,
          reconciledAt: '2025-07-29'
        },
        {
          id: '2',
          description: 'Interest for A Bank Loan',
          amount: -10000000.00,
          transactionDate: '2025-07-30',
          type: 'WITHDRAWAL',
          reference: 'INT-001',
          category: 'Interest Expenses',
          runningBalance: 57349504.10,
          status: 'pending',
          reconciled: false
        },
        {
          id: '3',
          description: 'Customer Payment',
          amount: 1218000.00,
          transactionDate: '2025-06-24',
          type: 'DEPOSIT',
          reference: 'PAY-002',
          category: 'Customer Payment',
          runningBalance: 85149504.10,
          status: 'cleared',
          reconciled: true,
          reconciledAt: '2025-06-24'
        },
        {
          id: '4',
          description: 'Customer Payment',
          amount: 1093528.00,
          transactionDate: '2025-06-19',
          type: 'DEPOSIT',
          reference: 'PAY-003',
          category: 'Customer Payment',
          runningBalance: 83931504.10,
          status: 'unreconciled',
          reconciled: false
        }
      ]);

      setBalanceSummary({
        openingBalance: 0,
        totalDeposits: 4511528.00,
        totalWithdrawals: 10000000.00,
        closingBalance: 67349504.10,
        unreconciledAmount: 1093528.00
      });
    }
  };

  useEffect(() => {
    console.log('🔍 useEffect triggered with accountId:', accountId, 'isClient:', isClient);
    if (accountId && isClient) {
      loadAccountData();
    }
  }, [accountId, isClient]); // Only depend on accountId and isClient

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

  const getTransactionIcon = (type: string, amount: number) => {
    if (amount > 0) {
      return <ArrowUpCircle className="h-5 w-5 text-green-600" />;
    } else {
      return <ArrowDownCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.reference && transaction.reference.toLowerCase().includes(searchTerm.toLowerCase()));
    
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
      {/* Enhanced Header */}
      <div className="bg-white shadow-sm border-b">
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
                <p className="text-sm text-gray-600">Account Number: xxxx{account.accountNumber.slice(-4)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setShowAddTransaction(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </button>
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
        {/* Enhanced Account Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg shadow-sm border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DollarSign className="h-10 w-10 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-700">Current Balance</p>
                  <p className="text-3xl font-bold text-blue-900">
                    {formatCurrency(balanceSummary?.closingBalance || account.balance, account.currency)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-600 font-medium">Account Status</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  account.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {account.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Reconciled Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(account.reconciledBalance || 0, account.currency)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Unreconciled</p>
                <p className="text-2xl font-bold text-gray-900">
                  {account.unreconciledTransactions || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
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

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-emerald-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-lg font-bold text-emerald-600">
                  +{formatCurrency(balanceSummary?.totalDeposits || 0, account.currency)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Reconciliation Summary */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Reconciliation Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600">Statement Balance</p>
              <p className="text-lg font-semibold">{formatCurrency(account.balance, account.currency)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Book Balance</p>
              <p className="text-lg font-semibold">{formatCurrency(account.reconciledBalance || 0, account.currency)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Difference</p>
              <p className={`text-lg font-semibold ${(account.balance - (account.reconciledBalance || 0)) === 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(account.balance - (account.reconciledBalance || 0), account.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                (account.balance - (account.reconciledBalance || 0)) === 0 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {(account.balance - (account.reconciledBalance || 0)) === 0 ? 'Reconciled' : 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Balance Control Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Balance Control</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adjust Statement Balance
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="0.01"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  value={account.balance}
                  onChange={(e) => {
                    const newBalance = parseFloat(e.target.value) || 0;
                    setAccount(prev => prev ? { ...prev, balance: newBalance } : null);
                  }}
                />
                <span className="text-sm text-gray-500">{account.currency}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Update the bank statement balance</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reconciled Balance
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="0.01"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  value={account.reconciledBalance || 0}
                  onChange={(e) => {
                    const newReconciledBalance = parseFloat(e.target.value) || 0;
                    setAccount(prev => prev ? { ...prev, reconciledBalance: newReconciledBalance } : null);
                  }}
                />
                <span className="text-sm text-gray-500">{account.currency}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Your book balance after reconciliation</p>
            </div>

            <div className="flex items-end space-x-2">
              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                    const tenantId = localStorage.getItem('tenantId') || 'default';
                    
                    // Get all unreconciled transactions to auto-reconcile
                    const unreconciledTransactions = transactions
                      .filter(tx => !tx.reconciled)
                      .map(tx => tx.id);
                    
                    if (unreconciledTransactions.length === 0) {
                      alert('All transactions are already reconciled');
                      return;
                    }

                    // Auto-reconcile by using current balance as statement balance
                    const response = await fetch(`${API_URL}/banking/payment-methods/${account.id}/reconcile`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'x-tenant-id': tenantId,
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                      },
                      body: JSON.stringify({
                        transactionIds: unreconciledTransactions,
                        statementBalance: account.balance, // Use current balance for auto-reconcile
                        reconciliationDate: new Date().toISOString(),
                        notes: `Auto-reconciliation of ${unreconciledTransactions.length} transactions`
                      })
                    });
                    
                    if (response.ok) {
                      const result = await response.json();
                      alert(`Auto-reconciliation completed! ${result.reconciledCount} transactions reconciled.`);
                      // Update local state to reflect reconciliation
                      setAccount(prev => prev ? { ...prev, reconciledBalance: prev.balance } : null);
                      // Refresh account data
                      loadAccountData();
                    } else {
                      const errorData = await response.json();
                      alert(`Failed to auto-reconcile: ${errorData.error || 'Unknown error'}`);
                    }
                  } catch (error) {
                    console.error('Error during auto-reconciliation:', error);
                    alert('Error during auto-reconciliation');
                  }
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Auto Reconcile
              </button>
              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                    const tenantId = localStorage.getItem('tenantId') || 'default';
                    
                    // Get all unreconciled transactions to reconcile them
                    const unreconciledTransactions = transactions
                      .filter(tx => !tx.reconciled)
                      .map(tx => tx.id);
                    
                    if (unreconciledTransactions.length === 0) {
                      alert('No unreconciled transactions to reconcile');
                      return;
                    }

                    // Call reconciliation endpoint
                    const response = await fetch(`${API_URL}/banking/payment-methods/${account.id}/reconcile`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'x-tenant-id': tenantId,
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                      },
                      body: JSON.stringify({
                        transactionIds: unreconciledTransactions,
                        statementBalance: account.reconciledBalance || account.balance,
                        reconciliationDate: new Date().toISOString(),
                        notes: `Manual reconciliation of ${unreconciledTransactions.length} transactions`
                      })
                    });
                    
                    if (response.ok) {
                      const result = await response.json();
                      alert(`Reconciliation completed! ${result.reconciledCount} transactions reconciled.`);
                      // Refresh account data
                      loadAccountData();
                    } else {
                      const errorData = await response.json();
                      alert(`Failed to reconcile: ${errorData.error || 'Unknown error'}`);
                    }
                  } catch (error) {
                    console.error('Error during reconciliation:', error);
                    alert('Error during reconciliation');
                  }
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Reconcile Transactions
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Transactions Section */}
        <div className="bg-white rounded-lg shadow-sm border">
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deposits
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Withdrawals
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Running Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
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
                      {new Date(transaction.transactionDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getTransactionIcon(transaction.type, transaction.amount)}
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{transaction.description}</div>
                          <div className="text-sm text-gray-500">{transaction.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.reference}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {transaction.amount > 0 ? (
                        <span className="text-green-600 font-semibold">
                          {formatCurrency(transaction.amount, account.currency)}
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {transaction.amount < 0 ? (
                        <span className="text-red-600 font-semibold">
                          {formatCurrency(Math.abs(transaction.amount), account.currency)}
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                      {formatCurrency(transaction.runningBalance, account.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
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