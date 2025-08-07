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
  Camera,
  Mic,
  Send,
  Star,
  Hexagon,
  Rocket
} from 'lucide-react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ApiService, AIInsight, CashFlowForecast, AIAgent } from '@/lib/api'
import toast from 'react-hot-toast'
import TransactionForm from './TransactionForm'
import AIChat from './AIChat'
import AICopilotChat from './AICopilotChat'
import EnhancedConversationalChat from './EnhancedConversationalChat'
import AICommandBar from './AICommandBar'
import SimpleAIWidget from './SimpleAIWidget'
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
  const [showAICopilot, setShowAICopilot] = useState(false)
  const [showEnhancedChat, setShowEnhancedChat] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

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
      setIsProcessing(true)
      const response = await ApiService.processNaturalLanguageQuery(aiQuery)
      setAiResponse(response.answer)
      toast.success('AI processed your query successfully!')
    } catch (error) {
      console.error('AI query error:', error)
      toast.error('Failed to process AI query')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTransactionSubmit = (transaction: any) => {
    setShowTransactionForm(false)
    loadDashboardData() // Refresh data
    toast.success('Transaction added successfully!')
  }

  const AIMetricCard = ({ title, value, change, icon: Icon, gradient = 'from-blue-500 to-purple-600' }: {
    title: string
    value: string | number
    change?: { value: number; isPositive: boolean }
    icon: any
    gradient?: string
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5`} />
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-xl bg-gradient-to-br ${gradient} bg-opacity-10`}>
                <Icon className={`w-5 h-5 bg-gradient-to-br ${gradient} bg-clip-text text-transparent`} />
              </div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
            {change && (
              <div className="flex items-center">
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
        </div>
      </div>
    </motion.div>
  )

  const InsightCard = ({ insight }: { insight: AIInsight }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:border-blue-200"
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

  if (isLoading) {
    return <UltraEnhancedLoading />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* AI Command Bar */}
      <AICommandBar />
      
      {/* AI Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 via-purple-600/90 to-blue-800/90" />
          <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-3 mb-4"
            >
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-white">AI Financial Copilot</h1>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-blue-100 mb-8"
            >
              Your intelligent financial assistant powered by advanced AI
            </motion.p>
            
            {/* Main AI Query Interface */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="flex gap-4 mb-4">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      placeholder="Ask anything about your finances... e.g., 'What's my cash flow trend?' or 'Show me expense patterns'"
                      className="w-full bg-white rounded-xl px-4 py-3 pr-12 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
                      onKeyPress={(e) => e.key === 'Enter' && handleAIQuery()}
                    />
                    <Mic className="absolute right-4 top-3.5 w-5 h-5 text-gray-400" />
                  </div>
                  <button
                    onClick={handleAIQuery}
                    disabled={isProcessing}
                    className="px-8 py-3 bg-white text-blue-600 rounded-xl hover:bg-gray-50 transition-colors font-medium shadow-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    Ask AI
                  </button>
                </div>
                
                {/* Quick Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowAICopilot(true)}
                    className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors text-sm flex items-center gap-2"
                  >
                    <Bot className="w-4 h-4" />
                    Open AI Copilot
                  </button>
                  <button
                    onClick={() => setAiQuery("What's my financial health?")}
                    className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors text-sm"
                  >
                    Financial Health
                  </button>
                  <button
                    onClick={() => setAiQuery("Show me expense trends")}
                    className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors text-sm"
                  >
                    Expense Analysis
                  </button>
                  <button
                    onClick={() => setAiQuery("Forecast my cash flow")}
                    className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors text-sm"
                  >
                    Cash Flow Forecast
                  </button>
                </div>
              </div>
              
              {/* AI Response */}
              {aiResponse && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-white mb-2">AI Analysis</h4>
                      <p className="text-blue-100 leading-relaxed">{aiResponse}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* AI-Powered Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <AIMetricCard
            title="AI Confidence Score"
            value={`${stats.aiConfidence}%`}
            change={{ value: 2.1, isPositive: true }}
            icon={Brain}
            gradient="from-purple-500 to-pink-600"
          />
          <AIMetricCard
            title="AI Processed Transactions"
            value={stats.aiProcessedTransactions.toLocaleString()}
            change={{ value: 15.3, isPositive: true }}
            icon={Zap}
            gradient="from-blue-500 to-cyan-600"
          />
          <AIMetricCard
            title="Active AI Agents"
            value={stats.activeAgents}
            change={{ value: 0, isPositive: true }}
            icon={Bot}
            gradient="from-green-500 to-emerald-600"
          />
          <AIMetricCard
            title="Anomalies Detected"
            value={stats.anomaliesDetected}
            change={{ value: -50, isPositive: true }}
            icon={Shield}
            gradient="from-orange-500 to-red-600"
          />
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* AI Features Section - 2/3 width */}
          <div className="lg:col-span-2 space-y-8">
            {/* AI Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                  <Rocket className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">AI-Powered Actions</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setShowTransactionForm(true)}
                  className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 opacity-0 group-hover:opacity-5 transition-opacity" />
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                      <Plus className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Smart Transaction Entry</h3>
                    <p className="text-sm text-gray-600">AI-powered entry with OCR receipt scanning and auto-categorization</p>
                  </div>
                </button>

                <button
                  onClick={() => setShowEnhancedChat(true)}
                  className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 opacity-0 group-hover:opacity-5 transition-opacity" />
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Enhanced AI Assistant</h3>
                    <p className="text-sm text-gray-600">Advanced conversational AI with context memory and smart reporting</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="text-xs text-green-600 font-medium">Phase 3 • New</span>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setShowAICopilot(true)}
                  className="group relative overflow-hidden bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-blue-600 opacity-0 group-hover:opacity-5 transition-opacity" />
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                      <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">AI Copilot Chat</h3>
                    <p className="text-sm text-gray-600">Conversational AI assistant for complex financial queries and insights</p>
                  </div>
                </button>

                <button
                  onClick={() => setAiQuery("Analyze my spending patterns")}
                  className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-600 opacity-0 group-hover:opacity-5 transition-opacity" />
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-4">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Pattern Analysis</h3>
                    <p className="text-sm text-gray-600">AI-driven insights into spending patterns and financial trends</p>
                  </div>
                </button>

                <button
                  onClick={() => setAiQuery("Generate financial forecast")}
                  className="group relative overflow-hidden bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-600 opacity-0 group-hover:opacity-5 transition-opacity" />
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-4">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">AI Forecasting</h3>
                    <p className="text-sm text-gray-600">Predictive analytics for cash flow and revenue forecasting</p>
                  </div>
                </button>
              </div>
            </motion.div>

            {/* AI Insights */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">AI-Generated Insights</h2>
                </div>
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
              </div>
              
              <div className="space-y-4">
                {Array.isArray(insights) && insights.slice(0, 3).map((insight, index) => (
                  <InsightCard key={`${insight.type}-${index}`} insight={insight} />
                ))}
                
                {(!insights || insights.length === 0) && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Brain className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">AI is analyzing your data</h3>
                    <p className="text-sm text-gray-500">Insights will appear as your AI processes more transactions</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Cash Flow Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">AI Cash Flow Analysis</h2>
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
            </motion.div>
          </div>

          {/* AI Sidebar - 1/3 width */}
          <div className="space-y-6">
            {/* AI Agents Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl">
                  <Cpu className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">AI Agents</h2>
              </div>
              
              <div className="space-y-3">
                {[
                  { name: 'Transaction Categorizer', status: 'active', accuracy: 95 },
                  { name: 'Account Reconciler', status: 'active', accuracy: 98 },
                  { name: 'Financial Analyst', status: 'active', accuracy: 92 },
                  { name: 'Financial Advisor', status: 'active', accuracy: 89 },
                  { name: 'Compliance Auditor', status: 'active', accuracy: 96 },
                ].map((agent, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-gray-700">{agent.name}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-900">{agent.accuracy}%</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* AI Performance Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4">AI Performance</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={aiPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="accuracy" stroke="#3B82F6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Expense Categories */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4">Expense Categories</h2>
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
            </motion.div>
          </div>
        </div>
        
        {/* AI Smart Widgets Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SimpleAIWidget />
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
        
        {showEnhancedChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowEnhancedChat(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={() => setShowEnhancedChat(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 bg-white rounded-lg shadow-sm hover:bg-gray-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="h-full">
                <EnhancedConversationalChat />
              </div>
            </motion.div>
          </motion.div>
        )}

        {showAICopilot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAICopilot(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Financial AI Copilot</h2>
                </div>
                <button
                  onClick={() => setShowAICopilot(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="h-[500px]">
                <AICopilotChat tenantId="default" className="h-full border-0 shadow-none" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}