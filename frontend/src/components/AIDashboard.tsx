'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Brain, 
  TrendingUp, 
  DollarSign, 
  BarChart3, 
  Activity,
  Zap,
  Shield,
  Users,
  Settings,
  Menu,
  X,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  Sparkles,
  Lightbulb,
  TrendingDown,
  AlertTriangle,
  Calendar,
  DollarSign as DollarSignIcon,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Bot,
  Cpu,
  Database,
  Cloud,
  MessageSquare,
  Camera
} from 'lucide-react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ApiService, AIInsight, CashFlowForecast, AIAgent } from '@/lib/api'
import toast from 'react-hot-toast'
import TransactionForm from './TransactionForm'
import AIChat from './AIChat'
import UltraEnhancedLoading from './UltraEnhancedLoading'

interface DashboardStats {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  cashFlow: number
  aiProcessedTransactions: number
  aiConfidence: number
  activeAgents: number
  anomaliesDetected: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function AIDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 125000,
    totalExpenses: 89000,
    netProfit: 36000,
    cashFlow: 45000,
    aiProcessedTransactions: 1247,
    aiConfidence: 94.2,
    activeAgents: 5,
    anomaliesDetected: 1
  })
  
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [forecast, setForecast] = useState<CashFlowForecast[]>([])
  const [agents, setAgents] = useState<AIAgent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('3m')
  const [aiQuery, setAiQuery] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [showAIChat, setShowAIChat] = useState(false)

  // Mock data for charts
  const cashFlowData = [
    { month: 'Jan', inflow: 45000, outflow: 38000, net: 7000 },
    { month: 'Feb', inflow: 52000, outflow: 41000, net: 11000 },
    { month: 'Mar', inflow: 48000, outflow: 39000, net: 9000 },
    { month: 'Apr', inflow: 55000, outflow: 42000, net: 13000 },
    { month: 'May', inflow: 51000, outflow: 40000, net: 11000 },
    { month: 'Jun', inflow: 58000, outflow: 43000, net: 15000 },
  ]

  const expenseCategories = [
    { name: 'Office Expenses', value: 35, color: '#0088FE' },
    { name: 'Travel', value: 25, color: '#00C49F' },
    { name: 'Marketing', value: 20, color: '#FFBB28' },
    { name: 'Software', value: 15, color: '#FF8042' },
    { name: 'Other', value: 5, color: '#8884D8' },
  ]

  const aiPerformanceData = [
    { day: 'Mon', accuracy: 92, transactions: 45 },
    { day: 'Tue', accuracy: 95, transactions: 52 },
    { day: 'Wed', accuracy: 89, transactions: 38 },
    { day: 'Thu', accuracy: 96, transactions: 61 },
    { day: 'Fri', accuracy: 94, transactions: 48 },
    { day: 'Sat', accuracy: 91, transactions: 23 },
    { day: 'Sun', accuracy: 93, transactions: 19 },
  ]

  useEffect(() => {
    loadDashboardData()
  }, [selectedPeriod])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Load AI insights
      const insightsData = await ApiService.getAIInsights(selectedPeriod)
      setInsights(Array.isArray(insightsData) ? insightsData : [])
      
      // Load cash flow forecast
      const forecastData = await ApiService.getCashFlowForecast(6)
      setForecast(Array.isArray(forecastData) ? forecastData : [])
      
      // Load AI agents
      const agentsData = await ApiService.getAIAgents()
      setAgents(Array.isArray(agentsData) ? agentsData : [])
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('Failed to load dashboard data')
      // Set empty arrays as fallback
      setInsights([])
      setForecast([])
      setAgents([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAIQuery = async () => {
    if (!aiQuery.trim()) return
    
    try {
      const response = await ApiService.processNaturalLanguageQuery(aiQuery)
      setAiResponse(response.answer)
      toast.success('AI processed your query successfully!')
    } catch (error) {
      console.error('AI query error:', error)
      toast.error('Failed to process AI query')
    }
  }

  const handleTransactionSubmit = (transaction: any) => {
    setShowTransactionForm(false)
    loadDashboardData() // Refresh data
    toast.success('Transaction added successfully!')
  }

  const StatCard = ({ title, value, change, icon: Icon, color = 'blue' }: {
    title: string
    value: string | number
    change?: { value: number; isPositive: boolean }
    icon: any
    color?: string
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <div className="flex items-center mt-2">
              {change.isPositive ? (
                <ArrowUpRight className="w-4 h-4 text-green-500" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-sm font-medium ml-1 ${
                change.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {change.isPositive ? '+' : ''}{change.value}%
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-50`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
    </motion.div>
  )

  const InsightCard = ({ insight }: { insight: AIInsight }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${
              insight.impact === 'high' ? 'bg-red-500' : 
              insight.impact === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
            }`} />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {insight.type.replace('_', ' ')}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">{insight.title}</h3>
          <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500">
                Confidence: {Math.round(insight.confidence * 100)}%
              </span>
              <span className="text-xs text-gray-500">
                {insight.timeframe}
              </span>
            </div>
            {insight.actionable && (
              <button className="text-xs font-medium text-blue-600 hover:text-blue-700">
                Take Action →
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )

  const AgentCard = ({ agent }: { agent: AIAgent }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
    >
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${
          agent.status === 'active' ? 'bg-green-500' : 
          agent.status === 'idle' ? 'bg-yellow-500' : 'bg-red-500'
        }`} />
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{agent.name}</h4>
          <p className="text-sm text-gray-500">{agent.role}</p>
        </div>
        <Bot className="w-5 h-5 text-gray-400" />
      </div>
      <div className="mt-3">
        <div className="flex flex-wrap gap-1">
          {agent.capabilities.slice(0, 2).map((capability, index) => (
            <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              {capability}
            </span>
          ))}
          {agent.capabilities.length > 2 && (
            <span className="text-xs text-gray-500">+{agent.capabilities.length - 2} more</span>
          )}
        </div>
      </div>
    </motion.div>
  )

  if (isLoading) {
    return <UltraEnhancedLoading />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Brain className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AI Dashboard</h1>
                <p className="text-sm text-gray-500">Intelligent financial insights powered by AI</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1m">Last Month</option>
                <option value="3m">Last 3 Months</option>
                <option value="6m">Last 6 Months</option>
                <option value="1y">Last Year</option>
              </select>
              <button
                onClick={loadDashboardData}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            change={{ value: 12.5, isPositive: true }}
            icon={DollarSignIcon}
            color="green"
          />
          <StatCard
            title="Total Expenses"
            value={`$${stats.totalExpenses.toLocaleString()}`}
            change={{ value: 8.2, isPositive: false }}
            icon={TrendingDown}
            color="red"
          />
          <StatCard
            title="Net Profit"
            value={`$${stats.netProfit.toLocaleString()}`}
            change={{ value: 15.3, isPositive: true }}
            icon={TrendingUp}
            color="blue"
          />
          <StatCard
            title="AI Confidence"
            value={`${stats.aiConfidence}%`}
            change={{ value: 2.1, isPositive: true }}
            icon={Brain}
            color="purple"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Cash Flow Chart */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Cash Flow Analysis</h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span className="text-sm text-gray-600">Inflow</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span className="text-sm text-gray-600">Outflow</span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="inflow" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="outflow" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* AI Insights */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">AI Insights</h2>
                <Sparkles className="w-5 h-5 text-blue-600" />
              </div>
              <div className="space-y-4">
                {Array.isArray(insights) && insights.slice(0, 3).map((insight, index) => (
                  <InsightCard key={`${insight.type}-${index}`} insight={insight} />
                ))}
              </div>
            </div>

                    {/* AI Actions */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">AI Actions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setShowTransactionForm(true)}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Plus className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">New Transaction</h3>
                <p className="text-sm text-gray-600">AI-powered entry with receipt OCR</p>
              </div>
            </button>

            <button
              onClick={() => setShowAIChat(true)}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all duration-200"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">AI Chat</h3>
                <p className="text-sm text-gray-600">Natural language financial assistant</p>
              </div>
            </button>

            <button
              onClick={handleAIQuery}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all duration-200"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">Quick Query</h3>
                <p className="text-sm text-gray-600">Ask about finances instantly</p>
              </div>
            </button>
          </div>

          {/* Quick Query Input */}
          <div className="mt-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="Ask about your finances, expenses, or business insights..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleAIQuery()}
              />
              <button
                onClick={handleAIQuery}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ask
              </button>
            </div>
            {aiResponse && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200"
              >
                <p className="text-sm text-gray-700">{aiResponse}</p>
              </motion.div>
            )}
          </div>
        </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* AI Agents */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">AI Agents</h2>
              </div>
              <div className="space-y-3">
                {Array.isArray(agents) && agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            </div>

            {/* Expense Categories */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Expense Categories</h2>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={expenseCategories}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* AI Performance */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Performance</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={aiPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="accuracy" stroke="#3B82F6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showTransactionForm && (
          <TransactionForm
            onSubmit={handleTransactionSubmit}
            onCancel={() => setShowTransactionForm(false)}
          />
        )}
        
        {showAIChat && (
          <AIChat
            isOpen={showAIChat}
            onClose={() => setShowAIChat(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
} 