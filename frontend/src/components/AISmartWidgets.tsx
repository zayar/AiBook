'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Eye,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Clock,
  Users
} from 'lucide-react';

interface SmartInsight {
  id: string;
  type: 'revenue' | 'expense' | 'opportunity' | 'risk' | 'prediction';
  title: string;
  description: string;
  value?: string;
  change?: number;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  suggestedActions?: string[];
}

interface SmartWidget {
  id: string;
  title: string;
  type: 'insight' | 'metric' | 'chart' | 'action';
  priority: number;
  aiGenerated: boolean;
  data: any;
}

export default function AISmartWidgets() {
  const [insights, setInsights] = useState<SmartInsight[]>([]);
  const [widgets, setWidgets] = useState<SmartWidget[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock AI-generated insights
  useEffect(() => {
    const mockInsights: SmartInsight[] = [
      {
        id: '1',
        type: 'opportunity',
        title: 'Revenue Optimization Opportunity',
        description: 'Your Q3 revenue could increase by 23% by focusing on high-margin services',
        value: '+$45,200',
        change: 23,
        confidence: 0.87,
        impact: 'high',
        actionable: true,
        suggestedActions: [
          'Increase marketing for premium services',
          'Offer bundle packages to existing clients',
          'Review pricing strategy for top performers'
        ]
      },
      {
        id: '2',
        type: 'risk',
        title: 'Cash Flow Alert',
        description: 'Predicted cash flow shortage in 6 weeks based on current patterns',
        value: '-$12,400',
        change: -15,
        confidence: 0.92,
        impact: 'high',
        actionable: true,
        suggestedActions: [
          'Accelerate invoice collection',
          'Delay non-critical expenses',
          'Consider short-term financing options'
        ]
      },
      {
        id: '3',
        type: 'prediction',
        title: 'Growth Forecast',
        description: 'AI predicts 34% revenue growth next quarter based on current trends',
        value: '+34%',
        change: 34,
        confidence: 0.79,
        impact: 'medium',
        actionable: false
      }
    ];

    setInsights(mockInsights);
    setIsLoading(false);
  }, []);

  const getInsightIcon = (type: string, impact: string) => {
    const iconClass = `w-6 h-6 ${
      impact === 'high' ? 'text-red-500' : 
      impact === 'medium' ? 'text-yellow-500' : 'text-green-500'
    }`;

    switch (type) {
      case 'opportunity': return <TrendingUp className={iconClass} />;
      case 'risk': return <AlertTriangle className={iconClass} />;
      case 'prediction': return <Brain className={iconClass} />;
      case 'revenue': return <DollarSign className={iconClass} />;
      default: return <Lightbulb className={iconClass} />;
    }
  };

  const getGradientClass = (type: string) => {
    switch (type) {
      case 'opportunity': return 'from-green-400 to-blue-500';
      case 'risk': return 'from-red-400 to-pink-500';
      case 'prediction': return 'from-purple-400 to-indigo-500';
      case 'revenue': return 'from-blue-400 to-cyan-500';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  return (
    <div className="space-y-8">
      {/* AI Insights Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 p-8 text-white"
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Brain className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">AI Financial Intelligence</h2>
              <p className="text-blue-100">Real-time insights powered by advanced analytics</p>
            </div>
            <div className="ml-auto">
              <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 backdrop-blur-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Live Analysis</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <Zap className="w-6 h-6 text-yellow-300" />
                <span className="text-sm bg-yellow-300/20 text-yellow-300 px-2 py-1 rounded-full">
                  High Impact
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Smart Recommendations</h3>
              <p className="text-blue-100 text-sm">12 actionable insights ready for review</p>
            </div>

            <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <Target className="w-6 h-6 text-green-300" />
                <span className="text-sm bg-green-300/20 text-green-300 px-2 py-1 rounded-full">
                  Achieved
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Accuracy Score</h3>
              <p className="text-blue-100 text-sm">94.2% prediction accuracy this month</p>
            </div>

            <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <Activity className="w-6 h-6 text-purple-300" />
                <span className="text-sm bg-purple-300/20 text-purple-300 px-2 py-1 rounded-full">
                  Processing
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Active Monitoring</h3>
              <p className="text-blue-100 text-sm">847 transactions analyzed today</p>
            </div>
          </div>
        </div>

        {/* Floating particles animation */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white/30 rounded-full"
              animate={{
                x: [0, 100, 0],
                y: [0, -100, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
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
      </motion.div>

      {/* Smart Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {insights.map((insight, index) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.1 }}
              className="group relative"
            >
              <div className="h-full bg-white/60 backdrop-blur-xl rounded-2xl border border-white/20 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-2xl bg-gradient-to-br ${getGradientClass(insight.type)}`}>
                    {getInsightIcon(insight.type, insight.impact)}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      insight.impact === 'high' ? 'bg-red-400' :
                      insight.impact === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                    }`} />
                    <span className="text-xs text-gray-500 capitalize">{insight.impact} Impact</span>
                  </div>
                </div>

                {/* Content */}
                <h3 className="font-semibold text-gray-900 mb-2">{insight.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{insight.description}</p>

                {/* Value & Change */}
                {insight.value && (
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl font-bold text-gray-900">{insight.value}</span>
                    {insight.change && (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        insight.change > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {insight.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(insight.change)}%
                      </div>
                    )}
                  </div>
                )}

                {/* Confidence Score */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>AI Confidence</span>
                    <span>{Math.round(insight.confidence * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${insight.confidence * 100}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                {insight.actionable && insight.suggestedActions && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Suggested Actions:</h4>
                    {insight.suggestedActions.slice(0, 2).map((action, idx) => (
                      <button
                        key={idx}
                        className="w-full text-left p-3 bg-gray-50 hover:bg-blue-50 rounded-lg text-sm text-gray-600 hover:text-blue-700 transition-colors border border-transparent hover:border-blue-200"
                      >
                        {action}
                      </button>
                    ))}
                    {insight.suggestedActions.length > 2 && (
                      <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        +{insight.suggestedActions.length - 2} more actions
                      </button>
                    )}
                  </div>
                )}

                {/* AI Badge */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI Generated
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Quick Actions Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/20 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">AI-Powered Quick Actions</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            Last updated 2 min ago
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: PieChart, label: 'Generate Report', color: 'blue', description: 'AI-powered financial reports' },
            { icon: TrendingUp, label: 'Forecast Revenue', color: 'green', description: 'Predict next quarter' },
            { icon: AlertTriangle, label: 'Risk Analysis', color: 'red', description: 'Identify potential issues' },
            { icon: Users, label: 'Customer Insights', color: 'purple', description: 'Behavioral analysis' }
          ].map((action, idx) => (
            <motion.button
              key={idx}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-4 bg-white/50 hover:bg-white/80 rounded-xl border border-white/20 hover:border-white/40 transition-all group"
            >
              <div className={`w-10 h-10 bg-gradient-to-br from-${action.color}-400 to-${action.color}-600 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <h4 className="font-medium text-gray-900 text-sm mb-1">{action.label}</h4>
              <p className="text-xs text-gray-600">{action.description}</p>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}