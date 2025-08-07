'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, BarChart3, FileText, Lightbulb, MessageSquare, X } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: string;
  confidence?: number;
  followUpQuestions?: string[];
  visualizations?: any[];
  actionRequired?: string;
}

interface ConversationSession {
  sessionId: string;
  isActive: boolean;
  startedAt: Date;
  totalMessages: number;
}

export default function EnhancedConversationalChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<ConversationSession | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Voice recognition setup
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);

  // Quick suggestion prompts
  const suggestionPrompts = [
    "Show me this month's profit and loss",
    "What are my biggest expenses?",
    "Generate a cash flow report",
    "Give me business insights",
    "How much revenue did I make this quarter?",
    "Show me recent transactions"
  ];

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      setSpeechRecognition(recognition);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start new session on component mount
  useEffect(() => {
    startNewSession();
  }, []);

  const startNewSession = async () => {
    try {
      const response = await fetch('/api/v1/ai/conversation/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      if (data.success) {
        setCurrentSession({
          sessionId: data.sessionId,
          isActive: true,
          startedAt: new Date(data.timestamp),
          totalMessages: 0
        });

        // Add welcome message
        const welcomeMessage: Message = {
          id: 'welcome',
          role: 'assistant',
          content: `Welcome! I'm your AI financial assistant. I can help you with:

📊 **Financial Reports** - "Show me profit & loss for this quarter"
💰 **Data Analysis** - "What are my top expenses this month?"
📈 **Business Insights** - "Give me insights about my business"
💳 **Transaction Queries** - "Show recent transactions over $1000"
🔍 **Custom Analysis** - Ask me anything about your financial data!

What would you like to explore today?`,
          timestamp: new Date(),
          followUpQuestions: suggestionPrompts.slice(0, 3)
        };

        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || inputMessage.trim();
    if (!text || !currentSession) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      const response = await fetch('/api/v1/ai/conversation/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: currentSession.sessionId
        })
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          intent: data.intent,
          confidence: data.confidence,
          followUpQuestions: data.followUpQuestions,
          visualizations: data.visualizations,
          actionRequired: data.actionRequired
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (!speechRecognition) {
      alert('Voice recognition is not supported in your browser');
      return;
    }

    if (isListening) {
      speechRecognition.stop();
    } else {
      speechRecognition.start();
      setIsListening(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderVisualization = (viz: any) => {
    if (!viz) return null;

    switch (viz.type) {
      case 'table':
        return (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">{viz.title}</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {Object.keys(viz.data[0] || {}).map(key => (
                      <th key={key} className="text-left py-2 px-3 font-medium text-gray-700">
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(viz.data || []).slice(0, 10).map((row: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-100">
                      {Object.values(row).map((value: any, cellIdx: number) => (
                        <td key={cellIdx} className="py-2 px-3 text-gray-600">
                          {typeof value === 'number' ? value.toLocaleString() : String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'chart':
      case 'line':
      case 'bar':
        return (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <h4 className="font-medium text-blue-900">{viz.title}</h4>
            </div>
            <p className="text-sm text-blue-700">Chart visualization would be rendered here</p>
          </div>
        );

      default:
        return (
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-green-600" />
              <h4 className="font-medium text-green-900">Report Generated</h4>
            </div>
            <p className="text-sm text-green-700">Report data processed successfully</p>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh] bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">AI Financial Assistant</h2>
            <p className="text-xs text-gray-500">
              {currentSession?.isActive ? 'Active Session' : 'Connecting...'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <Lightbulb className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Suggestions */}
      {showSuggestions && messages.length <= 1 && (
        <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Actions:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suggestionPrompts.slice(0, 4).map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(prompt)}
                className="text-left p-3 rounded-lg bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white rounded-lg rounded-br-sm'
                  : 'bg-gray-100 text-gray-900 rounded-lg rounded-bl-sm'
              } p-4`}
            >
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>

              {/* Visualizations */}
              {message.visualizations?.map((viz, idx) => (
                <div key={idx}>
                  {renderVisualization(viz)}
                </div>
              ))}

              {/* Intent and Confidence */}
              {message.role === 'assistant' && message.intent && (
                <div className="mt-2 flex items-center gap-2 text-xs opacity-70">
                  <span>Intent: {message.intent}</span>
                  {message.confidence && (
                    <span>• Confidence: {Math.round(message.confidence * 100)}%</span>
                  )}
                </div>
              )}

              {/* Follow-up Questions */}
              {message.followUpQuestions && message.followUpQuestions.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium opacity-80">Suggestions:</p>
                  {message.followUpQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(question)}
                      className="block w-full text-left p-2 rounded border border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-sm transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-2 text-xs opacity-60">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg rounded-bl-sm p-4 max-w-[85%]">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-600">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about your finances..."
              className="w-full p-3 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {speechRecognition && (
                <button
                  onClick={handleVoiceInput}
                  className={`p-2 rounded-lg transition-colors ${
                    isListening
                      ? 'bg-red-100 text-red-600'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Voice input"
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {isListening && (
          <div className="mt-2 text-sm text-red-600 flex items-center gap-2">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
            Listening... Speak now
          </div>
        )}
      </div>
    </div>
  );
}