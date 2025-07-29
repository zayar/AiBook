'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, 
  Brain, 
  DollarSign, 
  Calendar, 
  Tag, 
  FileText,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  Camera,
  X,
  Zap
} from 'lucide-react'
import { ApiService, TransactionCategorizationResult } from '@/lib/api'
import toast from 'react-hot-toast'

interface TransactionFormProps {
  onSubmit: (transaction: any) => void
  onCancel: () => void
}

export default function TransactionForm({ onSubmit, onCancel }: TransactionFormProps) {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    merchant: '',
    notes: ''
  })
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [aiCategorization, setAiCategorization] = useState<TransactionCategorizationResult | null>(null)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = async (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Auto-categorize when description changes
    if (field === 'description' && value.length > 10) {
      await categorizeTransaction(value, parseFloat(formData.amount) || 0)
    }
  }

  const categorizeTransaction = async (description: string, amount: number) => {
    if (!description || !amount) return
    
    try {
      setIsProcessing(true)
      const result = await ApiService.categorizeTransaction({
        description,
        amount,
        date: formData.date
      })
      
      setAiCategorization(result)
      setFormData(prev => ({ 
        ...prev, 
        category: result.category,
        merchant: description.split(' ')[0] // Simple merchant extraction
      }))
      
      toast.success(`AI categorized as: ${result.category} (${Math.round(result.confidence * 100)}% confidence)`)
    } catch (error) {
      console.error('Categorization error:', error)
      toast.error('Failed to categorize transaction')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReceiptUpload = async (file: File) => {
    if (!file) return
    
    // Preview
    const reader = new FileReader()
    reader.onload = (e) => setReceiptPreview(e.target?.result as string)
    reader.readAsDataURL(file)
    
    setReceiptFile(file)
    
    try {
      setIsProcessing(true)
      const result = await ApiService.uploadReceipt(file)
      
      // Auto-fill form with extracted data
      setFormData(prev => ({
        ...prev,
        description: result.transactionData.description || prev.description,
        amount: result.transactionData.amount?.toString() || prev.amount,
        merchant: result.transactionData.merchant || prev.merchant
      }))
      
      // Auto-categorize
      if (result.transactionData.description && result.transactionData.amount) {
        await categorizeTransaction(result.transactionData.description, result.transactionData.amount)
      }
      
      toast.success(`Receipt processed! Confidence: ${Math.round(result.confidence * 100)}%`)
    } catch (error) {
      console.error('Receipt processing error:', error)
      toast.error('Failed to process receipt')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.description || !formData.amount) {
      toast.error('Please fill in all required fields')
      return
    }
    
    try {
      setIsProcessing(true)
      
      // Create journal entry
      const transaction = {
        memo: formData.description,
        reference: `TXN-${Date.now()}`,
        entries: [
          {
            accountCode: aiCategorization?.suggestedAccount || '1111', // Default to cash
            amount: parseFloat(formData.amount),
            type: 'DEBIT' as const
          },
          {
            accountCode: '3100', // Default to accounts payable
            amount: parseFloat(formData.amount),
            type: 'CREDIT' as const
          }
        ]
      }
      
      await ApiService.createTransaction(transaction)
      toast.success('Transaction created successfully!')
      onSubmit(transaction)
    } catch (error) {
      console.error('Transaction creation error:', error)
      toast.error('Failed to create transaction')
    } finally {
      setIsProcessing(false)
    }
  }

  const removeReceipt = () => {
    setReceiptFile(null)
    setReceiptPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
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
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">New Transaction</h2>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-600 mt-1">AI-powered transaction entry with automatic categorization</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Receipt Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Receipt Upload (Optional)</h3>
            </div>
            
            {receiptPreview ? (
              <div className="relative">
                <img 
                  src={receiptPreview} 
                  alt="Receipt preview" 
                  className="w-full max-w-xs rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={removeReceipt}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleReceiptUpload(e.target.files[0])}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 text-gray-600 hover:text-blue-600"
                >
                  <Upload className="w-8 h-8" />
                  <span>Click to upload receipt</span>
                  <span className="text-sm">or drag and drop</span>
                </button>
              </div>
            )}
          </div>

          {/* AI Categorization Display */}
          {aiCategorization && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-50 border border-blue-200 rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900">AI Categorization</span>
                <div className="ml-auto flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-700">
                    {Math.round(aiCategorization.confidence * 100)}% confidence
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-blue-800">
                  <strong>Category:</strong> {aiCategorization.category}
                </p>
                {aiCategorization.subcategory && (
                  <p className="text-blue-800">
                    <strong>Subcategory:</strong> {aiCategorization.subcategory}
                  </p>
                )}
                <p className="text-blue-700 text-sm">{aiCategorization.reasoning}</p>
                {aiCategorization.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {aiCategorization.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Transaction description..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Auto-categorized by AI"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Merchant
              </label>
              <input
                type="text"
                value={formData.merchant}
                onChange={(e) => handleInputChange('merchant', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Merchant name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Additional notes..."
                rows={3}
              />
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
              disabled={isProcessing}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Create Transaction
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
} 