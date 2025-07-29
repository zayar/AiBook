'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Download,
  RefreshCw,
  Loader2
} from 'lucide-react'
import { ApiService } from '@/lib/api'
import toast from 'react-hot-toast'

interface CashFlowWidgetProps {
  period?: string
}

export function CashFlowWidget({ period = '30d' }: CashFlowWidgetProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCashFlowData()
  }, [period])

  const loadCashFlowData = async () => {
    try {
      setLoading(true)
      const response = await ApiService.getCashFlowReport(period)
      setData(response.report)
    } catch (error) {
      console.error('Failed to load cash flow data:', error)
      toast.error('Failed to load cash flow data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </motion.div>
    )
  }

  if (!data) return null

  const { summary, forecast } = data
  const isPositive = summary.netCashFlow > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Cash Flow</h3>
        </div>
        <button
          onClick={loadCashFlowData}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Net Cash Flow */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600">Net Cash Flow</p>
            <p className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              ${Math.abs(summary.netCashFlow).toLocaleString()}
            </p>
          </div>
          <div className={`p-2 rounded-full ${isPositive ? 'bg-green-100' : 'bg-red-100'}`}>
            {isPositive ? (
              <ArrowUpRight className="w-5 h-5 text-green-600" />
            ) : (
              <ArrowDownRight className="w-5 h-5 text-red-600" />
            )}
          </div>
        </div>

        {/* Cash Flow Breakdown */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xs text-gray-500">Operating</p>
            <p className={`font-semibold ${summary.operatingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${Math.abs(summary.operatingCashFlow).toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Investing</p>
            <p className={`font-semibold ${summary.investingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${Math.abs(summary.investingCashFlow).toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Financing</p>
            <p className={`font-semibold ${summary.financingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${Math.abs(summary.financingCashFlow).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Forecast Preview */}
        {forecast && forecast.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">3-Month Forecast</p>
            <div className="space-y-2">
              {forecast.slice(0, 3).map((period: any, index: number) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Month {period.period}</span>
                  <span className={`font-medium ${period.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${period.netCashFlow.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

interface RecentTransactionsWidgetProps {
  limit?: number
}

export function RecentTransactionsWidget({ limit = 5 }: RecentTransactionsWidgetProps) {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecentTransactions()
  }, [limit])

  const loadRecentTransactions = async () => {
    try {
      setLoading(true)
      const response = await ApiService.getTransactions({ limit })
      setTransactions(response.transactions || [])
    } catch (error) {
      console.error('Failed to load recent transactions:', error)
      toast.error('Failed to load recent transactions')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
        </div>
        <button
          onClick={loadRecentTransactions}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="space-y-3">
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No recent transactions</p>
        ) : (
          transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-gray-900 truncate">
                  {transaction.description || transaction.memo}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(transaction.date).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${Math.abs(transaction.amount).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  {transaction.category?.name || 'Uncategorized'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <button className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium">
          View All Transactions
        </button>
      </div>
    </motion.div>
  )
}

interface AIInsightsWidgetProps {
  refreshInterval?: number
}

export function AIInsightsWidget({ refreshInterval = 300000 }: AIInsightsWidgetProps) {
  const [insights, setInsights] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAIInsights()
    
    if (refreshInterval > 0) {
      const interval = setInterval(loadAIInsights, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshInterval])

  const loadAIInsights = async () => {
    try {
      setLoading(true)
      const insights = await ApiService.getAIInsights()
      setInsights(insights || [])
    } catch (error) {
      console.error('Failed to load AI insights:', error)
      toast.error('Failed to load AI insights')
    } finally {
      setLoading(false)
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'POSITIVE':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case 'INFO':
        return <Eye className="w-4 h-4 text-blue-600" />
      default:
        return <Activity className="w-4 h-4 text-gray-600" />
    }
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'POSITIVE':
        return 'border-l-green-500 bg-green-50'
      case 'WARNING':
        return 'border-l-yellow-500 bg-yellow-50'
      case 'INFO':
        return 'border-l-blue-500 bg-blue-50'
      default:
        return 'border-l-gray-500 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">AI Insights</h3>
        </div>
        <button
          onClick={loadAIInsights}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="space-y-3">
        {insights.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No insights available</p>
        ) : (
          insights.slice(0, 3).map((insight, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-3 rounded-lg border-l-4 ${getInsightColor(insight.type)}`}
            >
              <div className="flex items-start gap-3">
                {getInsightIcon(insight.type)}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {insight.category}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {insight.message}
                  </p>
                  {insight.recommendation && (
                    <p className="text-xs text-gray-500 mt-2">
                      💡 {insight.recommendation}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <button className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium">
          View All Insights
        </button>
      </div>
    </motion.div>
  )
}

interface InventoryWidgetProps {
  showLowStock?: boolean
}

export function InventoryWidget({ showLowStock = true }: InventoryWidgetProps) {
  const [inventory, setInventory] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadInventoryData()
  }, [showLowStock])

  const loadInventoryData = async () => {
    try {
      setLoading(true)
      const response = await ApiService.getInventoryReport(showLowStock ? 'low-stock' : 'summary')
      setInventory(response.report)
    } catch (error) {
      console.error('Failed to load inventory data:', error)
      toast.error('Failed to load inventory data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </motion.div>
    )
  }

  if (!inventory) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PieChart className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">
            {showLowStock ? 'Low Stock Items' : 'Inventory Summary'}
          </h3>
        </div>
        <button
          onClick={loadInventoryData}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {showLowStock ? (
        <div className="space-y-3">
          {Array.isArray(inventory) && inventory.length === 0 ? (
            <p className="text-green-600 text-center py-4">
              <CheckCircle className="w-5 h-5 mx-auto mb-2" />
              All items are well stocked
            </p>
          ) : (
            Array.isArray(inventory) && inventory.slice(0, 3).map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-600">
                    {item.quantityOnHand} in stock
                  </p>
                  <p className="text-xs text-gray-500">
                    Reorder: {item.reorderLevel}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{inventory.totalItems}</p>
              <p className="text-sm text-gray-600">Total Items</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{inventory.lowStockItems}</p>
              <p className="text-sm text-gray-600">Low Stock</p>
            </div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-lg font-bold text-green-600">
              ${inventory.totalValue?.toLocaleString() || '0'}
            </p>
            <p className="text-sm text-gray-600">Total Value</p>
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <button className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium">
          View Inventory
        </button>
      </div>
    </motion.div>
  )
}

interface TaxWidgetProps {
  jurisdiction?: string
}

export function TaxWidget({ jurisdiction = 'All' }: TaxWidgetProps) {
  const [taxData, setTaxData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTaxData()
  }, [jurisdiction])

  const loadTaxData = async () => {
    try {
      setLoading(true)
      const response = await ApiService.getTaxReport('summary', jurisdiction)
      setTaxData(response.report)
    } catch (error) {
      console.error('Failed to load tax data:', error)
      toast.error('Failed to load tax data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </motion.div>
    )
  }

  if (!taxData) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Tax Summary</h3>
        </div>
        <button
          onClick={loadTaxData}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <p className="text-2xl font-bold text-blue-600">
            ${taxData.totalTaxCollected?.toLocaleString() || '0'}
          </p>
          <p className="text-sm text-gray-600">Total Tax Collected</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-lg font-semibold text-gray-700">
              {taxData.calculationCount || 0}
            </p>
            <p className="text-xs text-gray-500">Calculations</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-lg font-semibold text-gray-700">
              {taxData.activeTaxRates || 0}
            </p>
            <p className="text-xs text-gray-500">Active Rates</p>
          </div>
        </div>

        {taxData.byJurisdiction && Object.keys(taxData.byJurisdiction).length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">By Jurisdiction</p>
            {Object.entries(taxData.byJurisdiction).slice(0, 3).map(([jurisdiction, data]: [string, any]) => (
              <div key={jurisdiction} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{jurisdiction}</span>
                <span className="font-medium">${data.totalTax.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <button className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium">
          View Tax Reports
        </button>
      </div>
    </motion.div>
  )
} 