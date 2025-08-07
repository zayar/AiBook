'use client';

import React, { memo, useState, useEffect } from 'react';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  BarChart3,
  PieChart,
  DollarSign,
  Users,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface OptimizedAIWidgetProps {
  className?: string;
}

const OptimizedAIWidget = memo(function OptimizedAIWidget({ className }: OptimizedAIWidgetProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading - shorter for better UX
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Enhanced mock data with more realistic content
  const widgetData = {
    insights: [
      {
        id: 1,
        title: 'Smart Recommendations',
        value: '24',
        unit: 'insights',
        description: 'AI-powered actionable insights ready for implementation',
        icon: Brain,
        color: 'from-blue-500 to-purple-600',
        trend: '+25%',
        trendDirection: 'up',
        priority: 'High Impact'
      },
      {
        id: 2,
        title: 'Process Optimization',
        value: '15',
        unit: 'workflows',
        description: 'automated workflows saving 40+ hours weekly',
        icon: Target,
        color: 'from-purple-500 to-pink-600',
        trend: '+35%',
        trendDirection: 'up',
        priority: 'High Impact'
      },
      {
        id: 3,
        title: 'Financial Health',
        value: '96%',
        unit: 'score',
        description: 'excellent system performance with real-time monitoring',
        icon: Activity,
        color: 'from-green-500 to-emerald-600',
        trend: '+12%',
        trendDirection: 'up',
        priority: 'Excellent'
      }
    ],
    alerts: [
      {
        id: 1,
        title: 'Revenue Growth Surge',
        description: 'Outstanding! Revenue increased by 35% this month. AI suggests expanding marketing budget by 15% to capitalize on growth momentum.',
        status: 'positive',
        priority: 'High Impact',
        icon: TrendingUp,
        color: 'green'
      },
      {
        id: 2,
        title: 'Smart Cost Optimization',
        description: 'AI identified $24,500 in potential savings across vendor contracts and subscription services. 3 recommendations ready for review.',
        status: 'active',
        priority: 'High Savings',
        icon: Target,
        color: 'purple'
      },
      {
        id: 3,
        title: 'Predictive Cash Flow',
        description: 'AI forecasts strong cash position through Q3. Opportunity to invest $50K in growth initiatives detected.',
        status: 'positive',
        priority: 'Investment Opportunity',
        icon: CheckCircle,
        color: 'green'
      },
      {
        id: 4,
        title: 'Tax Optimization',
        description: 'AI found 5 tax-saving opportunities worth $8,200. End-of-quarter deadline approaching in 15 days.',
        status: 'active',
        priority: 'Time Sensitive',
        icon: AlertTriangle,
        color: 'orange'
      },
      {
        id: 5,
        title: 'Customer Payment Trends',
        description: 'Payment velocity improved by 22%. AI suggests implementing early payment discounts for additional 8% improvement.',
        status: 'positive',
        priority: 'Growth',
        icon: TrendingUp,
        color: 'blue'
      },
      {
        id: 6,
        title: 'Automated Reconciliation',
        description: 'All bank accounts reconciled automatically. 99.8% accuracy achieved with AI-powered matching algorithms.',
        status: 'active',
        priority: 'System Health',
        icon: CheckCircle,
        color: 'green'
      }
    ]
  };

  // Enhanced chart simulation
  const generateChartData = () => {
    return Array.from({ length: 12 }, (_, i) => ({
      month: i,
      value: Math.random() * 100 + 20,
      target: 80 + Math.random() * 20
    }));
  };

  const chartData = generateChartData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-purple-400"></div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Loading AI Insights</h3>
            <p className="text-gray-500 text-sm">Analyzing your financial data with advanced AI...</p>
          </div>
          <div className="flex items-end justify-between h-12 gap-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-gradient-to-t from-blue-400 to-purple-500 rounded-sm opacity-60"
                style={{ 
                  width: '8px', 
                  height: `${Math.random() * 48 + 12}px`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300 animate-pulse"
              style={{ width: '60%' }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Beautiful empty state component
  const EmptyState = () => (
    <div className={`space-y-8 ${className}`}>
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 rounded-3xl p-12 text-center shadow-xl">
        <div className="animate-bounce mb-6">
          <Brain className="w-16 h-16 text-white mx-auto" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-4">AI Intelligence Initializing</h3>
        <p className="text-blue-100 mb-6">Our AI systems are analyzing your financial data to generate intelligent insights...</p>
        <div className="flex justify-center gap-2">
          <div className="w-3 h-3 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
          <div className="w-3 h-3 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
          <div className="w-3 h-3 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 px-4 sm:px-6 lg:px-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gray-300 rounded-xl" />
              <div className="w-16 h-6 bg-gray-300 rounded-full" />
            </div>
            <div className="w-3/4 h-6 bg-gray-300 rounded mb-2" />
            <div className="w-full h-4 bg-gray-200 rounded mb-2" />
            <div className="w-2/3 h-4 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );

  if (!widgetData.insights || !widgetData.alerts) {
    return <EmptyState />;
  }

  return (
    <div className={`space-y-4 w-full ${className}`}>
      {/* Main AI Financial Intelligence Widget - Full Width */}
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 mx-4 sm:mx-6 lg:mx-8 rounded-3xl p-8 shadow-2xl border border-white/20 relative overflow-hidden"
           style={{ marginLeft: '0px', marginRight: '0px', borderRadius: '0px' }}>
        {/* Subtle connection to hero section */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/30">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">AI Financial Intelligence</h2>
              <p className="text-blue-100 text-sm">Real-time insights powered by advanced analytics</p>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-2xl">
            <Clock className="w-5 h-5" />
            <span className="text-sm font-medium">Live Updates</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {widgetData.insights.map((insight, index) => (
            <div
              key={insight.id}
              className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 bg-gradient-to-br ${insight.color} rounded-xl shadow-lg`}>
                  <insight.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-white/20 text-white text-xs font-medium rounded-full">
                    {insight.priority}
                  </span>
                  <div className={`flex items-center gap-1 text-xs font-medium ${
                    insight.trendDirection === 'up' 
                      ? 'text-green-300' 
                      : insight.trendDirection === 'down' 
                        ? 'text-red-300' 
                        : 'text-blue-300'
                  }`}>
                    {insight.trendDirection === 'up' ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : insight.trendDirection === 'down' ? (
                      <ArrowDownRight className="w-3 h-3" />
                    ) : null}
                    {insight.trend}
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold text-white">{insight.value}</span>
                  <span className="text-blue-200 text-sm font-medium">{insight.unit}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{insight.title}</h3>
                <p className="text-blue-100 text-sm leading-relaxed">{insight.description}</p>
              </div>

              <div className="mt-4">
                {/* Enhanced mini charts */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-blue-200">
                    <span>Performance</span>
                    <span>{Math.round(85 + Math.random() * 10)}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div 
                      className="h-2 bg-gradient-to-r from-green-400 to-blue-300 rounded-full transition-all duration-1000"
                      style={{ width: `${85 + Math.random() * 10}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-blue-200">
                    <span>Accuracy</span>
                    <span>{Math.round(92 + Math.random() * 6)}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div 
                      className="h-2 bg-gradient-to-r from-purple-400 to-pink-300 rounded-full transition-all duration-1000"
                      style={{ width: `${92 + Math.random() * 6}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-blue-200">
                    <span>Impact</span>
                    <span>{Math.round(78 + Math.random() * 15)}%</span>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-6 w-2 rounded-sm transition-all duration-300 ${
                          i < 8 ? 'bg-gradient-to-t from-yellow-400 to-orange-300' : 'bg-white/20'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced Smart Widgets Grid - Better responsive layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-4 px-4 sm:px-6 lg:px-8">
        {widgetData.alerts.map((alert, index) => (
          <div 
            key={alert.id}
            className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group"
            style={{ animationDelay: `${index * 150}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${
                alert.color === 'green' ? 'from-green-500 to-emerald-600' :
                alert.color === 'blue' ? 'from-blue-500 to-cyan-600' :
                alert.color === 'orange' ? 'from-orange-500 to-amber-600' :
                alert.color === 'red' ? 'from-red-500 to-pink-600' :
                'from-purple-500 to-indigo-600'
              } shadow-lg`}>
                <alert.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  alert.status === 'positive' ? 'bg-green-100 text-green-700' :
                  alert.status === 'active' ? 'bg-blue-100 text-blue-700' :
                  alert.status === 'warning' ? 'bg-red-100 text-red-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {alert.priority}
                </span>
                <div className={`w-2 h-2 rounded-full ${
                  alert.status === 'positive' ? 'bg-green-400 animate-pulse' :
                  alert.status === 'active' ? 'bg-blue-400 animate-pulse' :
                  alert.status === 'warning' ? 'bg-red-400 animate-pulse' :
                  'bg-purple-400 animate-pulse'
                }`} />
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors">
              {alert.title}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              {alert.description}
            </p>

            {/* Enhanced status indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {alert.status === 'positive' && <CheckCircle className="w-4 h-4 text-green-500" />}
                {alert.status === 'active' && <Activity className="w-4 h-4 text-blue-500" />}
                {alert.status === 'warning' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                <span className={`text-xs font-medium ${
                  alert.status === 'positive' ? 'text-green-600' :
                  alert.status === 'active' ? 'text-blue-600' :
                  alert.status === 'warning' ? 'text-red-600' :
                  'text-purple-600'
                }`}>
                  {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                </span>
              </div>
              <button className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-xs font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-md">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Additional AI Insights Section */}
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-xl mx-4 sm:mx-6 lg:mx-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI-Powered Insights</h2>
              <p className="text-gray-600 text-sm">Real-time financial intelligence and recommendations</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-2xl">
            <Brain className="w-5 h-5" />
            <span className="text-sm font-medium">Live AI</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: DollarSign, label: 'Revenue Growth', value: '+35.2%', color: 'text-green-600', bg: 'bg-green-100', trend: 'up' },
            { icon: Users, label: 'Customer Retention', value: '96.8%', color: 'text-blue-600', bg: 'bg-blue-100', trend: 'up' },
            { icon: PieChart, label: 'Cost Optimization', value: '-18.4%', color: 'text-purple-600', bg: 'bg-purple-100', trend: 'down' },
            { icon: Target, label: 'Goal Achievement', value: '92.7%', color: 'text-orange-600', bg: 'bg-orange-100', trend: 'up' },
            { icon: Brain, label: 'AI Accuracy', value: '98.9%', color: 'text-indigo-600', bg: 'bg-indigo-100', trend: 'up' },
            { icon: Zap, label: 'Process Automation', value: '87.3%', color: 'text-cyan-600', bg: 'bg-cyan-100', trend: 'up' }
          ].map((metric, index) => (
            <div 
              key={metric.label}
              className="text-center p-6 rounded-2xl hover:bg-white/50 transition-all duration-300 group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`w-12 h-12 ${metric.bg} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform relative overflow-hidden`}>
                <metric.icon className={`w-6 h-6 ${metric.color} relative z-10`} />
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className={`text-2xl font-bold ${metric.color} mb-2 flex items-center justify-center gap-1`}>
                {metric.value}
                {metric.trend === 'up' && <ArrowUpRight className="w-4 h-4 text-green-500" />}
                {metric.trend === 'down' && <ArrowDownRight className="w-4 h-4 text-green-500" />}
              </div>
              <div className="text-gray-600 text-sm font-medium">{metric.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

OptimizedAIWidget.displayName = 'OptimizedAIWidget';

export default OptimizedAIWidget;