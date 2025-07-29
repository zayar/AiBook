'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Lightbulb,
  Target,
  DollarSign,
  PieChart,
  BarChart3,
  Calendar,
  ArrowRight,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts'
import toast from 'react-hot-toast'

// Mock data for charts
const cashFlowData = [
  { month: 'Jan', income: 45000, expenses: 32000, net: 13000 },
  { month: 'Feb', income: 52000, expenses: 38000, net: 14000 },
  { month: 'Mar', income: 48000, expenses: 35000, net: 13000 },
  { month: 'Apr', income: 55000, expenses: 42000, net: 13000 },
  { month: 'May', income: 58000, expenses: 45000, net: 13000 },
  { month: 'Jun', income: 62000, expenses: 48000, net: 14000 },
]

const expenseBreakdown = [
  { name: 'Office Expenses', value: 25, color: '#3B82F6' },
  { name: 'Travel', value: 20, color: '#10B981' },
  { name: 'Marketing', value: 18, color: '#F59E0B' },
  { name: 'Software', value: 15, color: '#8B5CF6' },
  { name: 'Professional Services', value: 12, color: '#EF4444' },
  { name: 'Other', value: 10, color: '#6B7280' },
]

const mockInsights = [
  {
    id: 1,
    title: 'Expense Optimization Opportunity',
    description: 'Reduce office expenses by 15% through vendor negotiation and bulk purchasing',
    impact: 'high',
    type: 'cost_savings',
    potentialSavings: 13500,
    confidence: 0.92,
    timeframe: '3 months',
    status: 'pending'
  },
  {
    id: 2,
    title: 'Cash Flow Forecast',
    description: 'Positive cash flow expected for next 6 months with 12% growth',
    impact: 'medium',
    type: 'forecast',
    potentialSavings: 0,
    confidence: 0.88,
    timeframe: '6 months',
    status: 'active'
  },
  {
    id: 3,
    title: 'Anomaly Detection',
    description: 'Unusual spike in travel expenses detected - recommend review',
    impact: 'high',
    type: 'anomaly',
    potentialSavings: 5000,
    confidence: 0.95,
    timeframe: '1 month',
    status: 'urgent'
  },
  {
    id: 4,
    title: 'Revenue Growth Opportunity',
    description: 'Client retention rate at 95% - opportunity to increase pricing by 8%',
    impact: 'medium',
    type: 'revenue',
    potentialSavings: 24000,
    confidence: 0.85,
    timeframe: '6 months',
    status: 'pending'
  }
]

const mockRecommendations = [
  {
    id: 1,
    title: 'Implement Automated Expense Tracking',
    description: 'Use AI-powered receipt scanning to reduce manual data entry by 80%',
    impact: 'high',
    effort: 'medium',
    roi: '300%',
    timeframe: '2 months'
  },
  {
    id: 2,
    title: 'Optimize Vendor Relationships',
    description: 'Negotiate better terms with top 5 vendors to reduce costs by 12%',
    impact: 'high',
    effort: 'low',
    roi: '150%',
    timeframe: '1 month'
  },
  {
    id: 3,
    title: 'Enhance Cash Flow Management',
    description: 'Implement automated invoicing and payment reminders',
    impact: 'medium',
    effort: 'medium',
    roi: '200%',
    timeframe: '3 months'
  }
]

export default function AIInsightsPage() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState('insights')

  const handleGenerateInsights = async () => {
    setIsGenerating(true)
    await new Promise(resolve => setTimeout(resolve, 3000))
    toast.success('New AI insights generated!')
    setIsGenerating(false)
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'urgent': return 'text-red-600 bg-red-100'
      case 'active': return 'text-green-600 bg-green-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Insights</h1>
              <p className="text-gray-600">Intelligent financial analysis and recommendations powered by AI</p>
            </div>
            <button
              onClick={handleGenerateInsights}
              disabled={isGenerating}
              className="btn-primary flex items-center space-x-2"
            >
              {isGenerating ? (
                <div className="w-4 h-4 ai-spinner border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Brain className="w-4 h-4" />
              )}
              <span>{isGenerating ? 'Generating...' : 'Generate Insights'}</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-white p-1 rounded-lg shadow-sm mb-6">
          <button
            onClick={() => setActiveTab('insights')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'insights' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Insights
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'analytics' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'recommendations' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Recommendations
          </button>
        </div>

        {activeTab === 'insights' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Potential Savings</p>
                    <p className="text-2xl font-bold text-green-600">$42,500</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">AI Confidence</p>
                    <p className="text-2xl font-bold text-blue-600">92%</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Brain className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Insights</p>
                    <p className="text-2xl font-bold text-purple-600">4</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Lightbulb className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Insights List */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">AI-Generated Insights</h2>
              <div className="space-y-4">
                {mockInsights.map((insight) => (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getImpactColor(insight.impact)}`}>
                            {insight.impact} impact
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(insight.status)}`}>
                            {insight.status}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-3">{insight.description}</p>
                        <div className="flex items-center space-x-6 text-sm text-gray-500">
                          <span>Confidence: {Math.round(insight.confidence * 100)}%</span>
                          <span>Timeframe: {insight.timeframe}</span>
                          {insight.potentialSavings > 0 && (
                            <span className="text-green-600 font-medium">
                              Potential Savings: ${insight.potentialSavings.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <button className="text-blue-600 hover:text-blue-700">
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Cash Flow Chart */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Cash Flow Analysis</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cashFlowData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} name="Income" />
                    <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} name="Expenses" />
                    <Line type="monotone" dataKey="net" stroke="#3B82F6" strokeWidth={2} name="Net" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expense Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Expense Breakdown</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={expenseBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {expenseBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Key Performance Indicators</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Revenue Growth</p>
                      <p className="text-lg font-semibold text-green-600">+15.2%</p>
                    </div>
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Expense Ratio</p>
                      <p className="text-lg font-semibold text-blue-600">68.5%</p>
                    </div>
                    <PieChart className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Profit Margin</p>
                      <p className="text-lg font-semibold text-purple-600">31.5%</p>
                    </div>
                    <Target className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'recommendations' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">AI Recommendations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockRecommendations.map((rec) => (
                  <div key={rec.id} className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getImpactColor(rec.impact)}`}>
                        {rec.impact} impact
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4">{rec.description}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Effort:</span>
                        <span className="font-medium capitalize">{rec.effort}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">ROI:</span>
                        <span className="font-medium text-green-600">{rec.roi}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Timeframe:</span>
                        <span className="font-medium">{rec.timeframe}</span>
                      </div>
                    </div>
                    <button className="w-full mt-4 btn-primary">
                      Implement
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
} 