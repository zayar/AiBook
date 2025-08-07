'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Sparkles, 
  TrendingUp, 
  DollarSign, 
  BarChart3, 
  Activity,
  Bell,
  Settings,
  User,
  Search,
  Command,
  Zap,
  Eye,
  MessageSquare,
  ChevronRight,
  Plus,
  Filter,
  Calendar,
  Download,
  RefreshCw,
  Target,
  Clock,
  Shield,
  Database,
  Cpu,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import AICommandBar from './AICommandBar';
import AISmartWidgets from './AISmartWidgets';
import EnhancedConversationalChat from './EnhancedConversationalChat';

interface DashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  cashFlow: number;
  aiProcessedTransactions: number;
  aiConfidence: number;
  activeAgents: number;
  anomaliesDetected: number;
}

interface SmartNotification {
  id: string;
  type: 'insight' | 'alert' | 'success' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  actionable: boolean;
  action?: string;
}

export default function ModernAIDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 125000,
    totalExpenses: 89000,
    netProfit: 36000,
    cashFlow: 45000,
    aiProcessedTransactions: 1247,
    aiConfidence: 94.2,
    activeAgents: 5,
    anomaliesDetected: 1
  });

  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setIsLoading(false), 2000);

    // Mock smart notifications
    setNotifications([
      {
        id: '1',
        type: 'insight',
        title: 'Revenue Optimization',
        message: 'AI detected a 23% revenue increase opportunity in premium services',
        timestamp: new Date(),
        actionable: true,
        action: 'View Details'
      },
      {
        id: '2',
        type: 'alert',
        title: 'Cash Flow Alert',
        message: 'Predicted cash shortage in 6 weeks. Review recommended actions.',
        timestamp: new Date(Date.now() - 300000),
        actionable: true,
        action: 'Take Action'
      }
    ]);
  }, []);

  const getStatIcon = (statType: string) => {
    switch (statType) {
      case 'revenue': return DollarSign;
      case 'expenses': return TrendingUp;
      case 'profit': return Target;
      case 'cashflow': return Activity;
      default: return BarChart3;
    }
  };

  const getStatColor = (statType: string) => {
    switch (statType) {
      case 'revenue': return 'from-green-400 to-blue-500';
      case 'expenses': return 'from-red-400 to-pink-500';
      case 'profit': return 'from-purple-400 to-indigo-500';
      case 'cashflow': return 'from-blue-400 to-cyan-500';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mb-6 mx-auto">
            <Brain className="w-10 h-10 text-white animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Financial Intelligence</h2>
          <p className="text-gray-600 mb-6">Initializing your personalized dashboard...</p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* AI Command Bar */}
      <AICommandBar />

      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AiBook</h1>
                <p className="text-sm text-gray-600">AI-Powered Financial Intelligence</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Smart Notifications */}
              <div className="relative">
                <button className="p-2 bg-white/60 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/80 transition-all">
                  <Bell className="w-5 h-5 text-gray-600" />
                  {notifications.length > 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-medium">{notifications.length}</span>
                    </div>
                  )}
                </button>
              </div>

              {/* Settings */}
              <button className="p-2 bg-white/60 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/80 transition-all">
                <Settings className="w-5 h-5 text-gray-600" />
              </button>

              {/* User Avatar */}
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Good morning! 👋
                </h2>
                <p className="text-gray-600">
                  Your AI assistant has analyzed 247 transactions and found 3 optimization opportunities.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={selectedTimeframe}
                  onChange={(e) => setSelectedTimeframe(e.target.value)}
                  className="bg-white/60 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="1y">Last year</option>
                </select>
                <button className="p-2 bg-white/60 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/80 transition-all">
                  <RefreshCw className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* AI Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            {[
              { 
                label: 'Total Revenue', 
                value: formatCurrency(stats.totalRevenue), 
                change: '+12%', 
                positive: true, 
                type: 'revenue' 
              },
              { 
                label: 'Total Expenses', 
                value: formatCurrency(stats.totalExpenses), 
                change: '-3%', 
                positive: true, 
                type: 'expenses' 
              },
              { 
                label: 'Net Profit', 
                value: formatCurrency(stats.netProfit), 
                change: '+28%', 
                positive: true, 
                type: 'profit' 
              },
              { 
                label: 'Cash Flow', 
                value: formatCurrency(stats.cashFlow), 
                change: '+15%', 
                positive: true, 
                type: 'cashflow' 
              }
            ].map((stat, index) => {
              const IconComponent = getStatIcon(stat.type);
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="group"
                >
                  <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/20 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-2xl bg-gradient-to-br ${getStatColor(stat.type)}`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        stat.positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {stat.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {stat.change}
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                    <p className="text-gray-600 text-sm">{stat.label}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* AI Intelligence Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
          >
            {/* AI Status */}
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl">
                  <Cpu className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">AI Status</h3>
                  <p className="text-sm text-gray-600">All systems operational</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Confidence Score</span>
                  <span className="font-medium text-gray-900">{stats.aiConfidence}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${stats.aiConfidence}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Processing Stats */}
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-2xl">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Processing</h3>
                  <p className="text-sm text-gray-600">Real-time analysis</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Transactions Processed</span>
                  <span className="font-medium text-gray-900">{stats.aiProcessedTransactions.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Agents</span>
                  <span className="font-medium text-gray-900">{stats.activeAgents}</span>
                </div>
              </div>
            </div>

            {/* Security & Compliance */}
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Security</h3>
                  <p className="text-sm text-gray-600">Fully compliant</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Anomalies Detected</span>
                  <span className="font-medium text-gray-900">{stats.anomaliesDetected}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600">All systems secure</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Smart Widgets */}
          <AISmartWidgets />

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: MessageSquare, label: 'AI Chat', action: () => setShowChat(true), color: 'blue' },
                { icon: Plus, label: 'New Transaction', action: () => {}, color: 'green' },
                { icon: BarChart3, label: 'Generate Report', action: () => {}, color: 'purple' },
                { icon: Eye, label: 'View Insights', action: () => {}, color: 'orange' }
              ].map((action, idx) => (
                <motion.button
                  key={idx}
                  onClick={action.action}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-6 bg-white/60 backdrop-blur-xl rounded-2xl border border-white/20 hover:shadow-xl transition-all group"
                >
                  <div className={`w-12 h-12 bg-gradient-to-br from-${action.color}-400 to-${action.color}-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-medium text-gray-900">{action.label}</h4>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </main>

      {/* Enhanced Chat Modal */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowChat(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[90vh] relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowChat(false)}
                className="absolute top-6 right-6 z-10 p-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 rotate-45" />
              </button>
              <div className="h-full">
                <EnhancedConversationalChat />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating particles animation */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-blue-400/20 rounded-full"
            animate={{
              x: [0, 100, 0],
              y: [0, -100, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}