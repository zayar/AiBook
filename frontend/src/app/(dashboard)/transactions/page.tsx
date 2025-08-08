'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  Upload,
  Brain,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Calendar,
  Tag,
  Bot,
  Camera,
  FileText,
  RefreshCw,
  Zap,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  X
} from 'lucide-react'
import { ApiService, Transaction, TransactionCategorizationRequest, TransactionCategorizationResult } from '@/lib/api'
import toast from 'react-hot-toast'

interface TransactionWithAI extends Omit<Transaction, 'status'> {
  aiConfidence?: number
  aiCategory?: string
  aiReasoning?: string
  status: 'pending' | 'categorized' | 'reviewed' | 'processing'
}

const mockTransactions: TransactionWithAI[] = [
  { 
    id: '1', 
    description: 'Office Supplies Purchase', 
    amount: 250, 
    type: 'DEBIT', 
    category: 'Office Expenses', 
    date: '2024-01-27', 
    merchant: 'Staples',
    aiConfidence: 0.95,
    aiCategory: 'Office Supplies',
    aiReasoning: 'High confidence - office supplies from known vendor',
    status: 'categorized'
  },
  { 
    id: '2', 
    description: 'Client Payment - ABC Corp', 
    amount: 5000, 
    type: 'CREDIT', 
    category: 'Client Revenue', 
    date: '2024-01-26', 
    merchant: 'ABC Corporation',
    aiConfidence: 0.98,
    aiCategory: 'Client Revenue',
    aiReasoning: 'Client payment with clear identification',
    status: 'categorized'
  },
  { 
    id: '3', 
    description: 'Software Subscription', 
    amount: 150, 
    type: 'DEBIT', 
    category: 'Software', 
    date: '2024-01-25', 
    merchant: 'Adobe',
    aiConfidence: 0.92,
    aiCategory: 'Software Subscriptions',
    aiReasoning: 'Recurring software subscription payment',
    status: 'categorized'
  },
  { 
    id: '4', 
    description: 'Travel Expenses', 
    amount: 450, 
    type: 'DEBIT', 
    category: 'Travel', 
    date: '2024-01-24', 
    merchant: 'Uber',
    aiConfidence: 0.89,
    aiCategory: 'Travel & Transportation',
    aiReasoning: 'Transportation service for business travel',
    status: 'categorized'
  },
  { 
    id: '5', 
    description: 'Marketing Campaign', 
    amount: 1200, 
    type: 'DEBIT', 
    category: 'Marketing', 
    date: '2024-01-23', 
    merchant: 'Google Ads',
    aiConfidence: 0.87,
    aiCategory: 'Digital Marketing',
    aiReasoning: 'Digital advertising platform payment',
    status: 'categorized'
  }
]

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionWithAI[]>(mockTransactions)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [isLoading, setIsLoading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showAICategorization, setShowAICategorization] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithAI | null>(null)
  const [aiCategorizationResult, setAiCategorizationResult] = useState<TransactionCategorizationResult | null>(null)
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAICategorization = async (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId)
    if (!transaction) return

    setIsLoading(true)
    setSelectedTransaction(transaction)
    setShowAICategorization(true)

    try {
      const request: TransactionCategorizationRequest = {
        description: transaction.description,
        amount: transaction.amount,
        merchant: transaction.merchant,
        date: transaction.date
      }

      const result = await ApiService.categorizeTransaction(request)
      setAiCategorizationResult(result)

      // Update transaction with AI results
      setTransactions(prev => prev.map(t => 
        t.id === transactionId 
          ? { 
              ...t, 
              status: 'categorized', 
              aiConfidence: result.confidence,
              aiCategory: result.category,
              aiReasoning: result.reasoning
            }
          : t
      ))

      toast.success('AI categorization completed!')
    } catch (error) {
      console.error('AI categorization error:', error)
      toast.error('Failed to categorize transaction')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkCategorization = async () => {
    setIsLoading(true)
    
    try {
      const uncategorizedTransactions = transactions.filter(t => t.status === 'pending')
      
      for (const transaction of uncategorizedTransactions) {
        const request: TransactionCategorizationRequest = {
          description: transaction.description,
          amount: transaction.amount,
          merchant: transaction.merchant,
          date: transaction.date
        }

        const result = await ApiService.categorizeTransaction(request)
        
        setTransactions(prev => prev.map(t => 
          t.id === transaction.id 
            ? { 
                ...t, 
                status: 'categorized', 
                aiConfidence: result.confidence,
                aiCategory: result.category,
                aiReasoning: result.reasoning
              }
            : t
        ))
      }

      toast.success(`AI categorized ${uncategorizedTransactions.length} transactions!`)
    } catch (error) {
      console.error('Bulk categorization error:', error)
      toast.error('Failed to categorize some transactions')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessingReceipt(true)
    setShowUploadModal(true)

    try {
      const result = await ApiService.uploadReceipt(file)
      
      // Create new transaction from receipt data
      const newTransaction: TransactionWithAI = {
        id: Date.now().toString(),
        description: result.transactionData.description,
        amount: result.transactionData.amount,
        type: 'DEBIT',
        category: 'Uncategorized',
        date: result.transactionData.date,
        merchant: result.transactionData.merchant,
        aiConfidence: result.confidence,
        status: 'processing'
      }

      setTransactions(prev => [newTransaction, ...prev])
      toast.success('Receipt processed successfully!')
    } catch (error) {
      console.error('Receipt processing error:', error)
      toast.error('Failed to process receipt')
    } finally {
      setIsProcessingReceipt(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.merchant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === 'all' || transaction.type === filterType
    return matchesSearch && matchesFilter
  })

  const stats = {
    total: transactions.length,
    categorized: transactions.filter(t => t.status === 'categorized').length,
    pending: transactions.filter(t => t.status === 'pending').length,
    averageConfidence: transactions
      .filter(t => t.aiConfidence)
      .reduce((acc, t) => acc + (t.aiConfidence || 0), 0) / 
      transactions.filter(t => t.aiConfidence).length
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Transactions</h1>
                <p className="text-sm text-gray-500">AI-powered transaction management</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload Receipt
              </button>
              <button
                onClick={handleBulkCategorization}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Brain className="w-4 h-4" />
                )}
                AI Categorize All
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">AI Categorized</p>
                <p className="text-2xl font-bold text-green-600">{stats.categorized}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">AI Confidence</p>
                <p className="text-2xl font-bold text-purple-600">{Math.round(stats.averageConfidence * 100)}%</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="DEBIT">Debits</option>
              <option value="CREDIT">Credits</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Filter className="w-4 h-4" />
              More Filters
            </button>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {filteredTransactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      transaction.type === 'CREDIT' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {transaction.type === 'CREDIT' ? (
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      ) : (
                        <TrendingDown className="w-6 h-6 text-red-600" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-medium text-gray-900">{transaction.description}</h3>
                        {transaction.aiConfidence && (
                          <div className="flex items-center gap-1">
                            <Brain className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-medium text-blue-600">
                              {Math.round(transaction.aiConfidence * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Tag className="w-4 h-4" />
                          {transaction.category}
                        </span>
                        {transaction.merchant && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {transaction.merchant}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(transaction.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`font-semibold text-lg ${
                        transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'CREDIT' ? '+' : '-'}${transaction.amount.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${
                          transaction.status === 'categorized' ? 'bg-green-500' :
                          transaction.status === 'pending' ? 'bg-yellow-500' :
                          transaction.status === 'processing' ? 'bg-blue-500' : 'bg-gray-500'
                        }`} />
                        <span className="text-xs text-gray-500 capitalize">{transaction.status}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {transaction.status === 'pending' && (
                        <button
                          onClick={() => handleAICategorization(transaction.id)}
                          disabled={isLoading}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="AI Categorize"
                        >
                          <Brain className="w-4 h-4" />
                        </button>
                      )}
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Upload Receipt</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  {isProcessingReceipt ? (
                    <div className="flex items-center justify-center gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="text-gray-600">Processing receipt with AI...</span>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">Drop your receipt here or click to browse</p>
                      <p className="text-sm text-gray-500">Supports JPG, PNG, PDF up to 10MB</p>
                    </div>
                  )}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleReceiptUpload}
                  className="hidden"
                />
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingReceipt}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isProcessingReceipt ? 'Processing...' : 'Choose File'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Categorization Modal */}
      <AnimatePresence>
        {showAICategorization && selectedTransaction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowAICategorization(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-lg mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">AI Categorization</h3>
                <button
                  onClick={() => setShowAICategorization(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Transaction Details</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Description:</span> {selectedTransaction.description}</p>
                    <p><span className="font-medium">Amount:</span> ${selectedTransaction.amount}</p>
                    <p><span className="font-medium">Merchant:</span> {selectedTransaction.merchant || 'Unknown'}</p>
                    <p><span className="font-medium">Date:</span> {selectedTransaction.date}</p>
                  </div>
                </div>
                
                {aiCategorizationResult && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      AI Analysis Results
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Category:</span> {aiCategorizationResult.category}</p>
                      <p><span className="font-medium">Subcategory:</span> {aiCategorizationResult.subcategory || 'N/A'}</p>
                      <p><span className="font-medium">Confidence:</span> {Math.round(aiCategorizationResult.confidence * 100)}%</p>
                      <p><span className="font-medium">Reasoning:</span> {aiCategorizationResult.reasoning}</p>
                      <p><span className="font-medium">Suggested Account:</span> {aiCategorizationResult.suggestedAccount}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {aiCategorizationResult.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAICategorization(false)}
                    className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      // Apply AI categorization
                      setShowAICategorization(false)
                    }}
                    className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Apply Categorization
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 