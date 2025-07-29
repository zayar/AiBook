'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  Minus, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  X,
  Save,
  Calculator,
  BookOpen,
  Zap,
  Loader2
} from 'lucide-react'
import { ApiService } from '@/lib/api'
import toast from 'react-hot-toast'

interface GLEntry {
  id?: string
  memo: string
  reference?: string
  date: string
  entries: GLEntryLine[]
}

interface GLEntryLine {
  id?: string
  accountCode: string
  accountName?: string
  amount: number
  type: 'DEBIT' | 'CREDIT'
  description?: string
  currency?: string
  exchangeRate?: number
}

interface GLEntryFormProps {
  onSubmit: (entry: GLEntry) => void
  onCancel: () => void
  initialData?: Partial<GLEntry>
}

export default function GLEntryForm({ onSubmit, onCancel, initialData }: GLEntryFormProps) {
  const [formData, setFormData] = useState<GLEntry>({
    memo: '',
    reference: '',
    date: new Date().toISOString().split('T')[0],
    entries: [
      { accountCode: '', amount: 0, type: 'DEBIT', description: '' },
      { accountCode: '', amount: 0, type: 'CREDIT', description: '' }
    ],
    ...initialData
  })
  
  const [accounts, setAccounts] = useState<Array<{ code: string; name: string; type: string }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isBalanced, setIsBalanced] = useState(false)
  const [balanceDifference, setBalanceDifference] = useState(0)

  // Load accounts on component mount
  useEffect(() => {
    loadAccounts()
  }, [])

  // Check balance whenever entries change
  useEffect(() => {
    checkBalance()
  }, [formData.entries])

  const loadAccounts = async () => {
    try {
      const response = await ApiService.getAccounts()
      setAccounts(response.accounts || [])
    } catch (error) {
      console.error('Failed to load accounts:', error)
      toast.error('Failed to load chart of accounts')
    }
  }

  const checkBalance = () => {
    const debits = formData.entries
      .filter(entry => entry.type === 'DEBIT')
      .reduce((sum, entry) => sum + (entry.amount || 0), 0)
    
    const credits = formData.entries
      .filter(entry => entry.type === 'CREDIT')
      .reduce((sum, entry) => sum + (entry.amount || 0), 0)
    
    const difference = debits - credits
    setBalanceDifference(difference)
    setIsBalanced(Math.abs(difference) < 0.01) // Allow for small rounding differences
  }

  const addEntry = () => {
    setFormData(prev => ({
      ...prev,
      entries: [
        ...prev.entries,
        { accountCode: '', amount: 0, type: 'DEBIT', description: '' }
      ]
    }))
  }

  const removeEntry = (index: number) => {
    if (formData.entries.length <= 2) {
      toast.error('At least two entries are required for double-entry accounting')
      return
    }
    
    setFormData(prev => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== index)
    }))
  }

  const updateEntry = (index: number, field: keyof GLEntryLine, value: any) => {
    setFormData(prev => ({
      ...prev,
      entries: prev.entries.map((entry, i) => 
        i === index ? { ...entry, [field]: value } : entry
      )
    }))
  }

  const autoBalance = () => {
    const debits = formData.entries
      .filter(entry => entry.type === 'DEBIT')
      .reduce((sum, entry) => sum + (entry.amount || 0), 0)
    
    const credits = formData.entries
      .filter(entry => entry.type === 'CREDIT')
      .reduce((sum, entry) => sum + (entry.amount || 0), 0)
    
    const difference = debits - credits
    
    if (Math.abs(difference) > 0.01) {
      // Find the last credit entry and adjust it
      const creditEntries = formData.entries
        .map((entry, index) => ({ ...entry, index }))
        .filter(entry => entry.type === 'CREDIT')
      
      if (creditEntries.length > 0) {
        const lastCreditIndex = creditEntries[creditEntries.length - 1].index
        const newAmount = (formData.entries[lastCreditIndex].amount || 0) + difference
        
        updateEntry(lastCreditIndex, 'amount', newAmount)
        toast.success('Entry auto-balanced!')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.memo.trim()) {
      toast.error('Memo is required')
      return
    }
    
    if (!isBalanced) {
      toast.error('Entries must be balanced before posting')
      return
    }
    
    // Validate that all entries have account codes
    const invalidEntries = formData.entries.filter(entry => !entry.accountCode.trim())
    if (invalidEntries.length > 0) {
      toast.error('All entries must have account codes')
      return
    }
    
    try {
      setIsLoading(true)
      
      const journalEntry = {
        memo: formData.memo,
        reference: formData.reference,
        entries: formData.entries.map(entry => ({
          accountCode: entry.accountCode,
          amount: entry.amount,
          type: entry.type,
          description: entry.description,
          currency: entry.currency || 'USD',
          exchangeRate: entry.exchangeRate || 1
        }))
      }
      
      await ApiService.createTransaction(journalEntry)
      toast.success('Journal entry posted successfully!')
      onSubmit(formData)
    } catch (error) {
      console.error('Failed to post journal entry:', error)
      toast.error('Failed to post journal entry')
    } finally {
      setIsLoading(false)
    }
  }

  const getAccountName = (code: string) => {
    const account = accounts.find(acc => acc.code === code)
    return account ? `${account.code} - ${account.name}` : code
  }

  const getAccountType = (code: string) => {
    const account = accounts.find(acc => acc.code === code)
    return account?.type || ''
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">General Ledger Entry</h2>
              <p className="text-gray-600 mt-1">Create a balanced double-entry journal entry</p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Header Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Memo *
              </label>
              <input
                type="text"
                value={formData.memo}
                onChange={(e) => setFormData(prev => ({ ...prev, memo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter memo..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Optional reference..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Balance Status */}
          <div className={`p-4 rounded-lg border ${
            isBalanced 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {isBalanced ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
              <span className={`font-medium ${
                isBalanced ? 'text-green-800' : 'text-red-800'
              }`}>
                {isBalanced ? 'Entries are balanced' : 'Entries are not balanced'}
              </span>
              {!isBalanced && (
                <span className="text-red-700">
                  (Difference: ${balanceDifference.toFixed(2)})
                </span>
              )}
            </div>
          </div>

          {/* Journal Entries */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Journal Entries</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={autoBalance}
                  disabled={isBalanced}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <Calculator className="w-4 h-4" />
                  Auto Balance
                </button>
                <button
                  type="button"
                  onClick={addEntry}
                  className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Entry
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {formData.entries.map((entry, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-12 gap-3 p-4 border border-gray-200 rounded-lg"
                >
                  {/* Account Selection */}
                  <div className="col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account
                    </label>
                    <select
                      value={entry.accountCode}
                      onChange={(e) => updateEntry(index, 'accountCode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Account</option>
                      {accounts.map(account => (
                        <option key={account.code} value={account.code}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </select>
                    {entry.accountCode && (
                      <p className="text-xs text-gray-500 mt-1">
                        Type: {getAccountType(entry.accountCode)}
                      </p>
                    )}
                  </div>

                  {/* Entry Type */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={entry.type}
                      onChange={(e) => updateEntry(index, 'type', e.target.value as 'DEBIT' | 'CREDIT')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="DEBIT">Debit</option>
                      <option value="CREDIT">Credit</option>
                    </select>
                  </div>

                  {/* Amount */}
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={entry.amount || ''}
                        onChange={(e) => updateEntry(index, 'amount', parseFloat(e.target.value) || 0)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={entry.description || ''}
                      onChange={(e) => updateEntry(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Optional..."
                    />
                  </div>

                  {/* Remove Button */}
                  <div className="col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={() => removeEntry(index)}
                      disabled={formData.entries.length <= 2}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !isBalanced}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Post Entry
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
} 