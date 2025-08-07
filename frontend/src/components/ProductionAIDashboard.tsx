'use client';

import React, { useState, useEffect, lazy, Suspense, memo, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { 
  Brain, 
  X, 
  MessageSquare,
  Zap,
  Target,
  Cpu,
  BarChart3,
  PieChart,
  Sparkles,
  TrendingUp,
  Activity,
  DollarSign,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';

// Lazy load heavy components for better performance
const LazyAICommandBar = dynamic(() => import('./optimized/LazyAICommandBar'), {
  loading: () => <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40 bg-white/80 backdrop-blur-xl rounded-2xl px-6 py-3 animate-pulse shadow-lg">Loading AI Command...</div>
});

const OptimizedAIWidget = dynamic(() => import('./optimized/OptimizedAIWidget'), {
  loading: () => (
    <div className="space-y-8">
      <div className="h-48 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 rounded-3xl animate-pulse shadow-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 bg-white/60 backdrop-blur-xl rounded-2xl animate-pulse shadow-lg border border-white/20" />
        ))}
      </div>
    </div>
  )
});

const TransactionForm = lazy(() => import('./TransactionForm'));
const AICopilotChat = lazy(() => import('./AICopilotChat'));
const EnhancedConversationalChat = lazy(() => import('./EnhancedConversationalChat'));
const UltraEnhancedLoading = lazy(() => import('./UltraEnhancedLoading'));

// API imports
import { ApiService, AIInsight, CashFlowForecast, AIAgent } from '@/lib/api';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  cashFlow: number;
  processingAccuracy: number;
  automationLevel: number;
}

// Enhanced StatCard with mini visualizations
const StatCard = memo(({ title, value, change, icon: Icon, color, trend, subtitle }: any) => (
  <div className="group opacity-0 animate-in slide-in-from-bottom-4 duration-500 fill-mode-forwards">
    <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/30 p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-white/80">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl bg-gradient-to-br ${color} shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
          change > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {change > 0 ? '↗' : '↘'} {Math.abs(change)}%
        </div>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-gray-600 text-sm font-medium">{title}</p>
      {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
      
      {/* Mini trend visualization */}
      {trend && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Trend</span>
            <span className={`font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          </div>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                trend > 0 ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gradient-to-r from-red-400 to-red-600'
              }`}
              style={{ width: `${Math.min(Math.abs(trend) * 10, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  </div>
));

StatCard.displayName = 'StatCard';

// Enhanced AgentCard with better visual feedback
const AgentCard = memo(({ agent, index }: { agent: any; index: number }) => (
  <div 
    className="flex items-center justify-between p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/70 transition-all duration-300 group"
    style={{ animationDelay: `${index * 100}ms` }}
  >
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full animate-pulse ${
        agent.accuracy > 90 ? 'bg-green-400 shadow-lg shadow-green-400/50' : 
        agent.accuracy > 80 ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50' : 
        'bg-red-400 shadow-lg shadow-red-400/50'
      }`} />
      <div>
        <span className="font-medium text-gray-900 group-hover:text-gray-700 transition-colors">{agent.name}</span>
        <div className="text-xs text-gray-500 mt-1">{agent.status}</div>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <span className="text-sm font-semibold text-gray-700">{agent.accuracy}%</span>
      <div className="w-20 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${
            agent.accuracy > 90 ? 'bg-gradient-to-r from-green-500 to-green-600' :
            agent.accuracy > 80 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
            'bg-gradient-to-r from-red-500 to-red-600'
          }`}
          style={{ width: `${agent.accuracy}%` }}
        />
      </div>
    </div>
  </div>
));

AgentCard.displayName = 'AgentCard';

export default function ProductionAIDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    cashFlow: 0,
    processingAccuracy: 0,
    automationLevel: 0
  });

  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showAICopilot, setShowAICopilot] = useState(false);
  const [showEnhancedChat, setShowEnhancedChat] = useState(false);

  // Enhanced dashboard data with trends
  const dashboardData = useMemo(() => ({
    agents: [
      { name: 'Transaction Categorizer', status: 'Active', accuracy: 95 },
      { name: 'Account Reconciler', status: 'Active', accuracy: 98 },
      { name: 'Financial Analyst', status: 'Active', accuracy: 92 },
      { name: 'Financial Advisor', status: 'Active', accuracy: 89 },
      { name: 'Compliance Auditor', status: 'Active', accuracy: 96 },
    ],
    cashFlowData: [
      { month: 'Jan', inflow: 45000, outflow: 32000 },
      { month: 'Feb', inflow: 52000, outflow: 38000 },
      { month: 'Mar', inflow: 48000, outflow: 35000 },
      { month: 'Apr', inflow: 61000, outflow: 42000 },
      { month: 'May', inflow: 59000, outflow: 41000 },
      { month: 'Jun', inflow: 67000, outflow: 45000 }
    ],
    expenseCategories: [
      { name: 'Operations', value: 35000, color: '#3B82F6' },
      { name: 'Marketing', value: 15000, color: '#8B5CF6' },
      { name: 'Technology', value: 25000, color: '#10B981' },
      { name: 'Administration', value: 12000, color: '#F59E0B' }
    ]
  }), []);

  // Optimized data loading with error handling
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load data in parallel for better performance
      const [insightsResponse] = await Promise.all([
        ApiService.getAIInsights('3m').catch(() => [])
      ]);

      setInsights(insightsResponse || []);
      
      // Enhanced mock stats with trends
      setStats({
        totalRevenue: 287500,
        totalExpenses: 156300,
        netProfit: 131200,
        cashFlow: 78900,
        processingAccuracy: 96.8,
        automationLevel: 92.3
      });
      
    } catch (error) {
      console.error('Dashboard loading error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleTransactionSubmit = useCallback(async (data: any) => {
    try {
      toast.success('Transaction submitted successfully!');
      setShowTransactionForm(false);
      loadDashboardData(); // Refresh data
    } catch (error) {
      toast.error('Failed to submit transaction');
    }
  }, [loadDashboardData]);

  const handleAICommand = useCallback((command: string) => {
    toast.success(`AI Command: ${command}`);
    // Handle AI commands here
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <UltraEnhancedLoading />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 relative overflow-hidden">
      {/* Enhanced Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.05),transparent_50%)]" />
      {/* Additional background to ensure seamless transition */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-50/50" />
      
      {/* AI Command Bar - Lazy loaded */}
      <LazyAICommandBar onCommand={handleAICommand} />
      
      {/* Enhanced Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-800 pt-20">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/95 via-purple-600/95 to-indigo-800/95" />
          <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10" />
          {/* Animated background elements */}
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-20 left-10 w-2 h-2 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
            <div className="absolute top-40 right-20 w-1 h-1 bg-white/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute bottom-20 left-1/4 w-1.5 h-1.5 bg-white/25 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
          </div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-4 mb-6 opacity-0 animate-in slide-in-from-bottom-4 duration-700 fill-mode-forwards">
              <div className="p-4 bg-white/20 rounded-3xl backdrop-blur-xl border border-white/30 shadow-xl">
                <Brain className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-5xl font-bold text-white tracking-tight">
                AI-Powered Financial Intelligence
              </h1>
            </div>
            <p className="text-xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed">
              Advanced analytics and automation for modern accounting. 
              Transform your financial data into actionable insights with AI.
            </p>
          </div>

          {/* Enhanced Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-4">
            {[
              { icon: MessageSquare, label: 'AI Chat', action: () => setShowEnhancedChat(true), color: 'blue', description: 'Intelligent conversations' },
              { icon: BarChart3, label: 'Generate Report', action: () => {}, color: 'green', description: 'Smart analytics' },
              { icon: Zap, label: 'Quick Entry', action: () => setShowTransactionForm(true), color: 'purple', description: 'Fast data input' },
              { icon: Target, label: 'AI Insights', action: () => setShowAICopilot(true), color: 'orange', description: 'Predictive analysis' }
            ].map((action, idx) => (
              <button
                key={idx}
                onClick={action.action}
                className="group p-8 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl text-left"
                style={{ animationDelay: `${idx * 150}ms` }}
              >
                <div className={`w-14 h-14 bg-gradient-to-br from-${action.color}-400 to-${action.color}-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                  <action.icon className="w-7 h-7 text-white" />
                </div>
                <h4 className="font-semibold text-white text-lg mb-2">{action.label}</h4>
                <p className="text-blue-100 text-sm opacity-80">{action.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Main Dashboard Content - Minimal gap */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8">
        {/* Contextual AI Insights Banner */}
        <div className="mb-4 opacity-0 animate-in slide-in-from-bottom-4 duration-500 fill-mode-forwards">
          <div className="bg-gradient-to-r from-blue-500 via-purple-600 to-indigo-700 rounded-3xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/30">
                  <Lightbulb className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">AI Insight</h3>
                  <p className="text-blue-100 text-sm">Your cash flow is trending positively. Consider optimizing expense categories for better tax efficiency.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-xl transition-all duration-200 backdrop-blur-sm border border-white/30">
                  View Details
                </button>
                <button className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-4">
          <StatCard 
            title="Total Revenue" 
            value={`$${(stats.totalRevenue / 1000).toFixed(0)}K`} 
            change={12} 
            trend={8.5}
            icon={DollarSign} 
            color="from-green-400 to-emerald-600" 
            subtitle="This month"
          />
          <StatCard 
            title="Total Expenses" 
            value={`$${(stats.totalExpenses / 1000).toFixed(0)}K`} 
            change={-3} 
            trend={-2.1}
            icon={PieChart} 
            color="from-red-400 to-pink-600" 
            subtitle="Controlled spending"
          />
          <StatCard 
            title="Net Profit" 
            value={`$${(stats.netProfit / 1000).toFixed(0)}K`} 
            change={28} 
            trend={15.2}
            icon={TrendingUp} 
            color="from-purple-400 to-indigo-600" 
            subtitle="Strong growth"
          />
          <StatCard 
            title="AI Accuracy" 
            value={`${stats.processingAccuracy}%`} 
            change={5} 
            trend={3.8}
            icon={Target} 
            color="from-blue-400 to-cyan-600" 
            subtitle="Learning continuously"
          />
        </div>

        {/* Enhanced AI Agents Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-4">
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/30 p-8 shadow-xl opacity-0 animate-in slide-in-from-bottom-4 duration-700 fill-mode-forwards">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                <Cpu className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">AI Agents</h2>
                <p className="text-gray-600 text-sm">Real-time performance monitoring</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {dashboardData.agents.map((agent, index) => (
                <AgentCard key={agent.name} agent={agent} index={index} />
              ))}
            </div>
          </div>

          {/* Enhanced Performance Chart Placeholder */}
          <div className="lg:col-span-2">
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/30 p-8 h-full shadow-xl opacity-0 animate-in slide-in-from-bottom-4 duration-800 fill-mode-forwards">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Performance Overview</h2>
                  <p className="text-gray-600 text-sm">AI-powered analytics dashboard</p>
                </div>
                <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-2xl">
                  <Sparkles className="w-5 h-5" />
                  <span className="text-sm font-medium">AI Powered</span>
                </div>
              </div>
              
              {/* Enhanced Interactive Chart Area */}
              <div className="h-64 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-100 p-6 relative overflow-hidden">
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-4 left-4 w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
                  <div className="absolute top-8 right-8 w-1 h-1 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                  <div className="absolute bottom-6 left-1/3 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
                </div>
                
                <div className="relative z-10 h-full flex flex-col justify-center">
                  <div className="text-center mb-6">
                    <Activity className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium text-lg">Performance charts loading...</p>
                    <p className="text-gray-500 text-sm mt-2">Real-time data visualization</p>
                  </div>
                  
                  {/* Interactive Chart Placeholder with Hover Effects */}
                  <div className="flex items-end justify-between h-24 gap-2 mb-4">
                    {[
                      { value: 65, label: 'Mon', color: 'from-blue-400 to-blue-600' },
                      { value: 78, label: 'Tue', color: 'from-blue-500 to-purple-500' },
                      { value: 90, label: 'Wed', color: 'from-purple-500 to-indigo-500' },
                      { value: 85, label: 'Thu', color: 'from-indigo-500 to-blue-500' },
                      { value: 92, label: 'Fri', color: 'from-blue-400 to-purple-600' },
                      { value: 88, label: 'Sat', color: 'from-purple-400 to-indigo-600' },
                      { value: 95, label: 'Sun', color: 'from-indigo-400 to-blue-600' }
                    ].map((day, index) => (
                      <div key={day.label} className="flex-1 group">
                        <div 
                          className={`bg-gradient-to-t ${day.color} rounded-t-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg cursor-pointer`}
                          style={{ height: `${(day.value / 100) * 100}%` }}
                        />
                        <div className="text-center mt-2">
                          <p className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">{day.label}</p>
                          <p className="text-xs font-medium text-gray-700 group-hover:text-gray-900 transition-colors">{day.value}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Performance Metrics */}
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="text-center p-3 bg-white/50 rounded-xl border border-white/30">
                      <p className="text-2xl font-bold text-green-600">+12.5%</p>
                      <p className="text-xs text-gray-600">Growth</p>
                    </div>
                    <div className="text-center p-3 bg-white/50 rounded-xl border border-white/30">
                      <p className="text-2xl font-bold text-blue-600">94.2%</p>
                      <p className="text-xs text-gray-600">Accuracy</p>
                    </div>
                    <div className="text-center p-3 bg-white/50 rounded-xl border border-white/30">
                      <p className="text-2xl font-bold text-purple-600">847</p>
                      <p className="text-xs text-gray-600">Transactions</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* AI Smart Widgets - Full Width Section */}
      <div className="mt-2">
        <OptimizedAIWidget />
      </div>

      {/* Enhanced Modals - Lazy loaded */}
      {showTransactionForm && (
        <Suspense fallback={<div>Loading form...</div>}>
          <TransactionForm
            onSubmit={handleTransactionSubmit}
            onCancel={() => setShowTransactionForm(false)}
          />
        </Suspense>
      )}
      
      {showEnhancedChat && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setShowEnhancedChat(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[92vh] relative overflow-hidden animate-in fade-in scale-in-95 duration-300 border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Enhanced Header */}
            <div className="flex items-center justify-between p-8 border-b border-gray-100 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/30">
                  <Brain className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">AI Financial Assistant</h2>
                  <p className="text-blue-100 text-sm">Your intelligent financial conversation partner</p>
                </div>
              </div>
              <button
                onClick={() => setShowEnhancedChat(false)}
                className="p-3 bg-white/20 hover:bg-white/30 rounded-2xl transition-all duration-200 hover:scale-105 backdrop-blur-sm border border-white/30"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            
            <div className="h-full">
              <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading AI Assistant...</p>
                    <p className="text-gray-500 text-sm mt-2">Preparing intelligent conversation</p>
                  </div>
                </div>
              }>
                <EnhancedConversationalChat />
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {showAICopilot && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setShowAICopilot(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden animate-in fade-in scale-in-95 slide-in-from-bottom-4 duration-300 border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Enhanced Header */}
            <div className="flex items-center justify-between p-8 border-b border-gray-100 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/30">
                  <Brain className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Financial AI Copilot</h2>
                  <p className="text-blue-100 text-sm">Your intelligent financial assistant</p>
                </div>
              </div>
              <button
                onClick={() => setShowAICopilot(false)}
                className="p-3 bg-white/20 hover:bg-white/30 rounded-2xl transition-all duration-200 hover:scale-105 backdrop-blur-sm border border-white/30"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            
            <div className="h-[700px]">
              <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading AI Copilot...</p>
                    <p className="text-gray-500 text-sm mt-2">Initializing intelligent assistant</p>
                  </div>
                </div>
              }>
                <AICopilotChat tenantId="default" className="h-full border-0 shadow-none" />
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}