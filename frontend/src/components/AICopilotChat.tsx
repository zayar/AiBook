'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, TrendingUp, AlertCircle } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  confidence?: number;
  intent?: string;
  visualizations?: any[];
  actionableSteps?: any[];
}

interface AICopilotChatProps {
  tenantId: string;
  className?: string;
}

export default function AICopilotChat({ tenantId, className = '' }: AICopilotChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: "👋 Hi! I'm your Financial AI Copilot. I can help you understand your financial data, analyze trends, and provide insights. Try asking me something like 'What's my cash flow looking like?' or 'Show me my top expenses this month'.",
      timestamp: new Date(),
      confidence: 1.0
    }
  ]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/ai/copilot/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
        },
        body: JSON.stringify({
          query: input,
          sessionId,
          context: {
            currentPage: window.location.pathname,
            timeframe: {
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              end: new Date().toISOString()
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        type: 'assistant',
        content: data.data.answer,
        timestamp: new Date(),
        confidence: data.data.confidence,
        intent: data.data.intent,
        visualizations: data.data.visualizations,
        actionableSteps: data.data.actionableSteps
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Copilot error:', error);
      
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        type: 'assistant',
        content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment or rephrase your question.",
        timestamp: new Date(),
        confidence: 0.1
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence?: number): string => {
    if (!confidence) return 'text-gray-500';
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceText = (confidence?: number): string => {
    if (!confidence) return 'Unknown';
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const handleActionClick = async (step: any) => {
    // Handle different types of actions
    if (typeof step === 'string') {
      // Handle execute commands like "Execute: analyze_expense_trends"
      if (step.startsWith('Execute: ')) {
        const command = step.replace('Execute: ', '');
        await executeAIFunction(command);
      } else {
        // Treat as a query
        setInput(step);
      }
    } else if (step.url) {
      // Handle URL navigation
      window.location.href = step.url;
    } else if (step.action) {
      // Handle action objects
      await executeAIFunction(step.action);
    } else if (step.title) {
      // Use title as query
      setInput(step.title);
    }
  };

  const executeAIFunction = async (functionName: string) => {
    setIsLoading(true);
    
    try {
      // Map function names to user-friendly queries
      const functionMap: Record<string, string> = {
        'analyze_expense_trends': 'Show me detailed expense trends and analysis',
        'generate_cash_flow_forecast': 'Generate a detailed cash flow forecast',
        'analyze_revenue_patterns': 'Analyze my revenue patterns and trends',
        'detect_anomalies': 'Detect any financial anomalies in my data',
        'optimize_expenses': 'Suggest ways to optimize my expenses',
        'review_budget_performance': 'Review my budget performance'
      };

      const query = functionMap[functionName] || `Execute ${functionName}`;
      
      const userMessage: Message = {
        id: `user_${Date.now()}`,
        type: 'user',
        content: `🤖 Executing: ${functionName}`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage]);

      const response = await fetch('/api/v1/ai/copilot/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
        },
        body: JSON.stringify({
          query,
          sessionId,
          context: {
            currentPage: window.location.pathname,
            executeFunction: functionName,
            timeframe: {
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              end: new Date().toISOString()
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to execute AI function');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        type: 'assistant',
        content: data.data.answer,
        timestamp: new Date(),
        confidence: data.data.confidence,
        intent: data.data.intent,
        visualizations: data.data.visualizations,
        actionableSteps: data.data.actionableSteps
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Execute function error:', error);
      
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        type: 'assistant',
        content: `I encountered an error while executing ${functionName}. Please try again or rephrase your request.`,
        timestamp: new Date(),
        confidence: 0.1
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col h-96 bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Financial AI Copilot</h3>
          <p className="text-xs text-gray-600">Your intelligent financial assistant</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
              <div className={`flex items-start gap-2 ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
                  message.type === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {message.type === 'user' ? (
                    <User className="w-3 h-3" />
                  ) : (
                    <Bot className="w-3 h-3" />
                  )}
                </div>
                
                <div className={`px-4 py-2 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* AI Response Metadata */}
                  {message.type === 'assistant' && message.confidence && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className={`flex items-center gap-1 ${getConfidenceColor(message.confidence)}`}>
                          <TrendingUp className="w-3 h-3" />
                          Confidence: {getConfidenceText(message.confidence)}
                        </span>
                        {message.intent && (
                          <span className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Intent: {message.intent.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actionable Steps */}
                  {message.actionableSteps && message.actionableSteps.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-700 mb-2">Suggested Actions:</p>
                      <div className="space-y-1">
                        {message.actionableSteps.slice(0, 3).map((step: any, index: number) => {
                          const isExecuteAction = (typeof step === 'string' && step.startsWith('Execute: ')) || step.action;
                          return (
                            <button
                              key={index}
                              onClick={() => handleActionClick(step)}
                              className={`block w-full text-left text-xs px-3 py-2 rounded transition-all duration-200 ${
                                isExecuteAction 
                                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium shadow-sm'
                                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                              }`}
                            >
                              {isExecuteAction && '⚡ '}
                              {step.title || step}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className={`text-xs text-gray-500 mt-1 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start gap-2">
              <div className="flex items-center justify-center w-6 h-6 bg-gray-200 rounded-full">
                <Bot className="w-3 h-3 text-gray-600" />
              </div>
              <div className="bg-gray-100 px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me about your finances..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
        
        {/* Quick suggestions */}
        <div className="mt-2 flex flex-wrap gap-1">
          {[
            "What's my cash flow?",
            "Top expenses this month",
            "Revenue trends",
            "Financial health"
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => !isLoading && setInput(suggestion)}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
              disabled={isLoading}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}