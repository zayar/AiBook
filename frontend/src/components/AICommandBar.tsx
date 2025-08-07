'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Brain, 
  Sparkles, 
  Command,
  ArrowRight,
  Clock,
  TrendingUp,
  FileText,
  Calculator,
  BarChart3,
  Users,
  DollarSign,
  Mic,
  MicOff,
  Loader2
} from 'lucide-react';

interface CommandSuggestion {
  id: string;
  text: string;
  category: 'report' | 'analysis' | 'transaction' | 'insight';
  icon: any;
  confidence?: number;
  description?: string;
}

interface RecentQuery {
  id: string;
  text: string;
  timestamp: Date;
  result?: string;
}

export default function AICommandBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState<CommandSuggestion[]>([]);
  const [recentQueries, setRecentQueries] = useState<RecentQuery[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Smart suggestions based on user context
  const smartSuggestions: CommandSuggestion[] = [
    {
      id: '1',
      text: 'Show me this month\'s profit and loss',
      category: 'report',
      icon: BarChart3,
      confidence: 0.95,
      description: 'Generate comprehensive P&L report'
    },
    {
      id: '2',
      text: 'What are my biggest expenses this quarter?',
      category: 'analysis',
      icon: TrendingUp,
      confidence: 0.88,
      description: 'Analyze expense patterns and trends'
    },
    {
      id: '3',
      text: 'Create invoice for Acme Corp',
      category: 'transaction',
      icon: FileText,
      confidence: 0.92,
      description: 'Quick invoice generation'
    },
    {
      id: '4',
      text: 'Predict cash flow for next 3 months',
      category: 'insight',
      icon: Calculator,
      confidence: 0.87,
      description: 'AI-powered cash flow forecasting'
    },
    {
      id: '5',
      text: 'Show customer payment trends',
      category: 'analysis',
      icon: Users,
      confidence: 0.83,
      description: 'Customer behavior analytics'
    }
  ];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      
      // Escape to close
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
        setSelectedIndex(-1);
      }

      // Arrow keys for navigation
      if (isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        }
        if (e.key === 'Enter' && selectedIndex >= 0) {
          e.preventDefault();
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, suggestions]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Update suggestions based on query
  useEffect(() => {
    if (query.length > 0) {
      const filtered = smartSuggestions.filter(suggestion =>
        suggestion.text.toLowerCase().includes(query.toLowerCase()) ||
        suggestion.description?.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions(smartSuggestions);
    }
    setSelectedIndex(-1);
  }, [query]);

  const handleSuggestionSelect = async (suggestion: CommandSuggestion) => {
    setQuery(suggestion.text);
    setIsProcessing(true);
    
    // Add to recent queries
    const newQuery: RecentQuery = {
      id: Date.now().toString(),
      text: suggestion.text,
      timestamp: new Date()
    };
    setRecentQueries(prev => [newQuery, ...prev.slice(0, 4)]);

    // Simulate AI processing
    setTimeout(() => {
      setIsProcessing(false);
      setIsOpen(false);
      setQuery('');
      // Here you would integrate with your actual AI conversation system
    }, 2000);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'report': return 'text-blue-600 bg-blue-100';
      case 'analysis': return 'text-green-600 bg-green-100';
      case 'transaction': return 'text-purple-600 bg-purple-100';
      case 'insight': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'report': return BarChart3;
      case 'analysis': return TrendingUp;
      case 'transaction': return FileText;
      case 'insight': return Brain;
      default: return Search;
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40 bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 px-6 py-3 hover:shadow-xl transition-all duration-300 group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="text-gray-700 font-medium">Ask your AI Financial Assistant</p>
            <p className="text-xs text-gray-500">Press ⌘K to open</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
            <Command className="w-3 h-3" />
            <span>K</span>
          </div>
        </div>
      </button>

      {/* Command Palette Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setIsOpen(false)}
          />

          {/* Command Palette */}
          <div
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl mx-4"
          >
              <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl">
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">AI Command Center</h2>
                      <p className="text-gray-600 text-sm">What would you like to do?</p>
                    </div>
                    {isProcessing && (
                      <div className="ml-auto flex items-center gap-2 text-blue-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Processing...</span>
                      </div>
                    )}
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                      <Search className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Type your question or command..."
                      className="w-full pl-12 pr-16 py-4 bg-white/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    />
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                      <button
                        onClick={() => setIsListening(!isListening)}
                        className={`p-2 rounded-lg transition-colors ${
                          isListening ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Suggestions */}
                <div className="max-h-96 overflow-y-auto">
                  {query === '' && recentQueries.length > 0 && (
                    <div className="p-4 border-b border-gray-100/50">
                      <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Recent Queries
                      </h3>
                      <div className="space-y-2">
                        {recentQueries.map((recent) => (
                          <button
                            key={recent.id}
                            onClick={() => setQuery(recent.text)}
                            className="w-full text-left p-3 hover:bg-gray-50 rounded-xl transition-colors flex items-center gap-3"
                          >
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700">{recent.text}</span>
                            <span className="text-xs text-gray-400 ml-auto">
                              {recent.timestamp.toLocaleTimeString()}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      {query ? 'Matching Suggestions' : 'Popular Commands'}
                    </h3>
                    <div className="space-y-2">
                      {suggestions.map((suggestion, index) => {
                        const IconComponent = suggestion.icon;
                        const isSelected = index === selectedIndex;
                        
                        return (
                          <button
                            key={suggestion.id}
                            onClick={() => handleSuggestionSelect(suggestion)}
                            className={`w-full text-left p-4 rounded-xl transition-all flex items-center gap-4 group ${
                              isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className={`p-2 rounded-lg ${getCategoryColor(suggestion.category)}`}>
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{suggestion.text}</p>
                              {suggestion.description && (
                                <p className="text-sm text-gray-600">{suggestion.description}</p>
                              )}
                            </div>
                            {suggestion.confidence && (
                              <div className="text-xs text-gray-500">
                                {Math.round(suggestion.confidence * 100)}% match
                              </div>
                            )}
                            <ArrowRight className={`w-4 h-4 text-gray-400 transition-colors ${
                              isSelected ? 'text-blue-600' : 'group-hover:text-gray-600'
                            }`}                             />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100/50 bg-gray-50/50">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                      <span>↑↓ Navigate</span>
                      <span>⏎ Select</span>
                      <span>Esc Cancel</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>Powered by</span>
                      <Sparkles className="w-3 h-3" />
                      <span>AI</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
    </>
  );
}