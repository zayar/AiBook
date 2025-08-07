'use client';

import React from 'react';
import { Brain, Sparkles, TrendingUp, Target, Activity } from 'lucide-react';

export default function SimpleAIWidget() {
  const mockInsights = [
    {
      title: 'Revenue Optimization',
      description: 'AI detected a 23% revenue increase opportunity in premium services',
      value: '+$45,200',
      change: 23,
      type: 'opportunity'
    },
    {
      title: 'Cash Flow Alert',
      description: 'Predicted cash flow shortage in 6 weeks based on current patterns',
      value: '-$12,400',
      change: -15,
      type: 'risk'
    },
    {
      title: 'Growth Forecast',
      description: 'AI predicts 34% revenue growth next quarter based on current trends',
      value: '+34%',
      change: 34,
      type: 'prediction'
    }
  ];

  return (
    <div className="space-y-8">
      {/* AI Insights Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 p-8 text-white">
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
                <Sparkles className="w-6 h-6 text-yellow-300" />
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
      </div>

      {/* Smart Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {mockInsights.map((insight, index) => (
          <div key={index} className="group relative">
            <div className="h-full bg-white/60 backdrop-blur-xl rounded-2xl border border-white/20 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl ${
                  insight.type === 'opportunity' ? 'bg-gradient-to-br from-green-400 to-blue-500' :
                  insight.type === 'risk' ? 'bg-gradient-to-br from-red-400 to-pink-500' :
                  'bg-gradient-to-br from-purple-400 to-indigo-500'
                }`}>
                  {insight.type === 'opportunity' ? <TrendingUp className="w-6 h-6 text-white" /> :
                   insight.type === 'risk' ? <TrendingUp className="w-6 h-6 text-white" /> :
                   <Brain className="w-6 h-6 text-white" />}
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    insight.type === 'opportunity' ? 'bg-green-400' :
                    insight.type === 'risk' ? 'bg-red-400' : 'bg-purple-400'
                  }`} />
                  <span className="text-xs text-gray-500 capitalize">High Impact</span>
                </div>
              </div>

              {/* Content */}
              <h3 className="font-semibold text-gray-900 mb-2">{insight.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{insight.description}</p>

              {/* Value & Change */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold text-gray-900">{insight.value}</span>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  insight.change > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  <TrendingUp className="w-3 h-3" />
                  {Math.abs(insight.change)}%
                </div>
              </div>

              {/* AI Badge */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI Generated
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}