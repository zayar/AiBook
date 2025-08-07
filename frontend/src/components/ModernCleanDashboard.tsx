'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Users, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Zap,
  Brain,
  Activity,
  Target,
  PieChart,
  Settings,
  Send,
  MessageCircle,
  Sparkles,
  Bot,
  User,
  Minimize2,
  Maximize2
} from 'lucide-react';

// Types
interface DashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  cashFlow: number;
  processingAccuracy: number;
  automationLevel: number;
}

interface Insight {
  id: string;
  title: string;
  description: string;
  type: 'success' | 'warning' | 'info';
  value?: string;
  trend?: number;
}

interface MetricCard {
  title: string;
  value: string;
  change: number;
  icon: React.ComponentType<any>;
  description: string;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'text' | 'suggestion' | 'insight';
}

// Clean Metric Card Component
const MetricCard = ({ title, value, change, icon: Icon, description }: MetricCard) => {
  const hasData = value !== '$0' && value !== '0%' && parseFloat(value.replace(/[$,%]/g, '')) !== 0;
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition-colors duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-gray-50 rounded-lg">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        {hasData ? (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'
          }`}>
            {change > 0 ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : change < 0 ? (
              <ArrowDownRight className="w-4 h-4" />
            ) : null}
            {Math.abs(change)}%
          </div>
        ) : (
          <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            No Data
          </div>
        )}
      </div>
      <div>
        {hasData ? (
          <>
            <h3 className="text-2xl font-semibold text-gray-900 mb-1">{value}</h3>
            <p className="text-sm font-medium text-gray-900 mb-1">{title}</p>
            <p className="text-xs text-gray-500">{description}</p>
          </>
        ) : (
          <>
            <h3 className="text-2xl font-semibold text-gray-400 mb-1">--</h3>
            <p className="text-sm font-medium text-gray-900 mb-1">{title}</p>
            <p className="text-xs text-gray-500">Connect your accounts to see data</p>
          </>
        )}
      </div>
    </div>
  );
};

// Clean Insight Card Component
const InsightCard = ({ insight }: { insight: Insight }) => {
  const getIcon = () => {
    switch (insight.type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-amber-600" />;
      default: return <Brain className="w-5 h-5 text-blue-600" />;
    }
  };

  const getBorderColor = () => {
    switch (insight.type) {
      case 'success': return 'border-l-green-600';
      case 'warning': return 'border-l-amber-600';
      default: return 'border-l-blue-600';
    }
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${getBorderColor()} p-6 hover:border-gray-300 transition-colors duration-200`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {getIcon()}
          <h3 className="font-semibold text-gray-900">{insight.title}</h3>
        </div>
        {insight.value && (
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900">{insight.value}</div>
            {insight.trend && (
              <div className={`flex items-center gap-1 text-sm ${
                insight.trend > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {insight.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(insight.trend)}%
              </div>
            )}
          </div>
        )}
      </div>
      <p className="text-gray-600 text-sm leading-relaxed">{insight.description}</p>
    </div>
  );
};

// AI Status Component
const AIStatus = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-6">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-50 rounded-lg">
          <Brain className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">AI Systems</h2>
          <p className="text-sm text-gray-500">Ready to process your data</p>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
        Ready
      </div>
    </div>

    <div className="space-y-4">
      {[
        { name: 'Transaction Categorizer', status: 'Ready' },
        { name: 'Account Reconciler', status: 'Ready' },
        { name: 'Financial Analyzer', status: 'Ready' },
        { name: 'Fraud Detection', status: 'Ready' }
      ].map((agent, index) => (
        <div key={agent.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <div className="font-medium text-gray-900 text-sm">{agent.name}</div>
            <div className="text-xs text-gray-500">{agent.status}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-400">Standby</div>
            <div className="text-xs text-gray-500 mt-1">Waiting for data</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// AI Chat Component
const AIChat = ({ onClose, baseCurrency = 'USD' }: { onClose?: () => void; baseCurrency?: string }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: "👋 Hello! I'm your AI Financial Assistant. I'm ready to help with financial analysis and insights, but I notice you haven't connected any financial accounts yet. Once you connect your accounts, I'll be able to provide real-time analysis, generate reports, and give personalized recommendations. How can I assist you today?",
      sender: 'ai',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Simulate AI response for now
      setTimeout(() => {
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: getAIResponse(inputMessage),
          sender: 'ai',
          timestamp: new Date(),
          type: 'text'
        };
        setMessages(prev => [...prev, aiResponse]);
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      setIsLoading(false);
    }
  };

  const getAIResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('revenue') || lowerMessage.includes('income')) {
      return `📊 I'd love to analyze your revenue data, but I don't see any connected financial accounts yet. Once you connect your bank accounts or accounting software, I'll be able to provide detailed revenue analysis, trends, and growth insights in ${baseCurrency}. Would you like help setting up your first connection?`;
    } else if (lowerMessage.includes('expense') || lowerMessage.includes('cost')) {
      return `💰 I can help identify expense patterns and cost-saving opportunities, but I need access to your financial data first. Connect your accounts and I'll analyze your spending, categorize expenses, and suggest optimizations in ${baseCurrency}. Shall I guide you through the setup process?`;
    } else if (lowerMessage.includes('profit') || lowerMessage.includes('p&l')) {
      return `📈 I'm ready to generate comprehensive P&L reports and profit analysis, but I need your financial data first. Once connected, I can track profit margins, compare periods, and identify growth opportunities in ${baseCurrency}. Would you like to start by connecting your accounting software?`;
    } else if (lowerMessage.includes('cash flow')) {
      return `💧 Cash flow forecasting is one of my specialties! However, I need access to your transaction history and account balances first. Connect your accounts and I'll provide real-time cash flow analysis with predictive insights in ${baseCurrency}. Ready to get started?`;
    } else if (lowerMessage.includes('tax')) {
      return `🏛️ I can help with tax planning and compliance, but I'll need access to your financial records first. Once connected, I can track deductible expenses, estimate tax liability, and ensure you're ready for filing deadlines. All amounts will be calculated in ${baseCurrency}. Would you like help connecting your accounts?`;
    } else if (lowerMessage.includes('connect') || lowerMessage.includes('setup')) {
      return `🔗 Great! To get started, you can connect your bank accounts, credit cards, or accounting software like QuickBooks. This allows me to provide real-time insights and analysis. I recommend starting with your primary business bank account. All financial data will be displayed in ${baseCurrency}. Would you like me to guide you through the connection process?`;
    } else if (lowerMessage.includes('currency')) {
      return `💱 Your organization is currently set to use ${baseCurrency} as the base currency. All financial data, reports, and insights will be displayed in ${baseCurrency}. You can change the base currency in Organization Settings if needed. Would you like help with currency settings?`;
    } else {
      return `I'm ready to help with financial analysis, reporting, transaction categorization, and accounting questions! However, I need access to your financial data first. Once you connect your accounts, I can provide personalized insights about revenue, expenses, profit, cash flow, and more in ${baseCurrency}. Would you like help connecting your first account?`;
    }
  };

  const quickSuggestions = [
    "How do I connect my bank account?",
    "What data do you need to get started?",
    "Help me set up my accounts",
    `What currency is this in? (${baseCurrency})`
  ];

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-xl transition-all duration-200"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Sparkles className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Financial Assistant</h3>
            <p className="text-sm text-gray-500">Ask me anything about your finances</p>
          </div>
        </div>
        <button
          onClick={() => onClose ? onClose() : setIsMinimized(true)}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <Minimize2 className="w-4 h-4" />
        </button>
      </div>

      <div className="h-80 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.sender === 'ai' && (
              <div className="p-2 bg-blue-50 rounded-full">
                <Bot className="w-4 h-4 text-blue-600" />
              </div>
            )}
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl ${
                message.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-50 text-gray-900'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {message.sender === 'user' && (
              <div className="p-2 bg-gray-100 rounded-full">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="p-2 bg-blue-50 rounded-full">
              <Bot className="w-4 h-4 text-blue-600" />
            </div>
            <div className="bg-gray-50 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-xl">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.6s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Suggestions */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex flex-wrap gap-2 mb-3">
          {quickSuggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => setInputMessage(suggestion)}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
            placeholder="Ask me about your finances..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Performance Chart Component
const PerformanceChart = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-6">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="font-semibold text-gray-900">Performance Overview</h2>
        <p className="text-sm text-gray-500">AI processing performance</p>
      </div>
      <button className="text-gray-400 hover:text-gray-600">
        <MoreHorizontal className="w-5 h-5" />
      </button>
    </div>

    <div className="flex items-center justify-center h-40 mb-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Performance Data</h3>
        <p className="text-gray-500 text-sm">Performance metrics will appear once you start processing transactions</p>
      </div>
    </div>

    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
      <div className="text-center">
        <div className="text-lg font-semibold text-gray-400">--</div>
        <div className="text-xs text-gray-500">Avg Accuracy</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-semibold text-gray-400">--</div>
        <div className="text-xs text-gray-500">Improvement</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-semibold text-gray-900">24/7</div>
        <div className="text-xs text-gray-500">System Uptime</div>
      </div>
    </div>
  </div>
);

export default function ModernCleanDashboard() {
  const { formatCurrency, baseCurrency, isLoading: currencyLoading } = useCurrency();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    cashFlow: 0,
    processingAccuracy: 0,
    automationLevel: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [showFloatingChat, setShowFloatingChat] = useState(false);

  // Load dashboard data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Simulate API call - but don't set fake data
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // TODO: Replace with real API call
        // const response = await fetch('/api/v1/dashboard/stats');
        // const data = await response.json();
        // setStats(data);
        
        // For now, leave stats at 0 to show empty state
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Metric cards data
  const metricCards = useMemo((): MetricCard[] => [
    {
      title: 'Total Revenue',
      value: stats.totalRevenue > 0 ? formatCurrency(stats.totalRevenue) : formatCurrency(0),
      change: stats.totalRevenue > 0 ? 12.5 : 0,
      icon: DollarSign,
      description: 'Monthly revenue growth'
    },
    {
      title: 'Net Profit',
      value: stats.netProfit > 0 ? formatCurrency(stats.netProfit) : formatCurrency(0),
      change: stats.netProfit > 0 ? 8.3 : 0,
      icon: TrendingUp,
      description: 'Profit after expenses'
    },
    {
      title: 'Cash Flow',
      value: stats.cashFlow > 0 ? formatCurrency(stats.cashFlow) : formatCurrency(0),
      change: stats.cashFlow > 0 ? 15.7 : 0,
      icon: BarChart3,
      description: 'Current cash position'
    },
    {
      title: 'Processing Accuracy',
      value: stats.processingAccuracy > 0 ? `${stats.processingAccuracy}%` : '0%',
      change: stats.processingAccuracy > 0 ? 2.1 : 0,
      icon: Target,
      description: 'AI system accuracy'
    }
  ], [stats, formatCurrency]);

  // AI insights data - empty until we have real data
  const insights: Insight[] = useMemo(() => [], []);

  if (isLoading || currencyLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="h-32 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clean Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-semibold text-gray-900">AI Financial Dashboard</h1>
                  <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    AI-First
                  </div>
                </div>
                <p className="text-gray-600">Intelligent financial insights powered by advanced AI</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Live</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metricCards.map((card, index) => (
            <MetricCard key={index} {...card} />
          ))}
        </div>

        {/* AI Chat - Featured Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">AI Financial Assistant</h2>
              <p className="text-gray-600">Your intelligent financial advisor - ask anything!</p>
            </div>
            <div className="ml-auto">
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                AI Active
              </div>
            </div>
          </div>
          <AIChat baseCurrency={baseCurrency} />
        </div>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <PerformanceChart />
          </div>
          <div>
            <AIStatus />
          </div>
        </div>

        {/* AI Insights */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Insights</h2>
              <p className="text-sm text-gray-500">Smart recommendations and alerts</p>
            </div>
            <button className="text-sm text-gray-600 hover:text-gray-900 font-medium">
              View All
            </button>
          </div>
          
          {insights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {insights.map(insight => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Insights Available</h3>
              <p className="text-gray-500 mb-4">Connect your financial accounts and transactions to generate AI-powered insights and recommendations.</p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Connect Accounts
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: FileText, label: 'Create Invoice', color: 'blue' },
              { icon: Users, label: 'Add Customer', color: 'green' },
              { icon: BarChart3, label: 'View Reports', color: 'purple' },
              { icon: PieChart, label: 'Expense Analysis', color: 'orange' }
            ].map((action, index) => (
              <button
                key={index}
                className="flex flex-col items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="p-2 bg-gray-100 rounded-lg">
                  <action.icon className="w-5 h-5 text-gray-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Floating AI Chat Button */}
      {showFloatingChat && (
        <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]">
          <AIChat onClose={() => setShowFloatingChat(false)} baseCurrency={baseCurrency} />
        </div>
      )}
      
      {!showFloatingChat && (
        <button
          onClick={() => setShowFloatingChat(true)}
          className="fixed bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-xl transition-all duration-200 group"
        >
          <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
        </button>
      )}
    </div>
  );
}